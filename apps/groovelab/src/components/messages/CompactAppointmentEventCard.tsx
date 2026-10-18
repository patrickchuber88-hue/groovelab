import React, { useState } from 'react';
import { 
  Check, 
  X, 
  RotateCcw, 
  Calendar, 
  ArrowRight, 
  Clock, 
  Loader2,
  ChevronRight
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatTeacherFullName, formatStudentDisplayName } from '../../utils/nameHelper';

export const parseLocalDate = (dateStr: string): Date => {
  if (!dateStr) return new Date();
  const cleanDate = dateStr.split('T')[0];
  const parts = cleanDate.split('-').map(Number);
  if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }
  return new Date(dateStr);
};

export const extractOccurrenceDateFromMessage = (msg: any): string | null => {
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

export interface CompactAppointmentEventCardProps {
  msg: any;
  selectedRecipient?: any;
  onSendMessage?: (recipientId: string, content: string) => Promise<any>;
  isSuperseded?: boolean;
  currentOcc?: any;
  onNavigateToSchedule?: (dateStr?: string) => void;
  currentUserId?: string;
  currentUserRole?: string;
  isSender?: boolean;
}

/**
 * 🎫 CompactAppointmentEventCard
 * WhatsApp 0.1% Goldstandard Discrete System Pill for Appointment Events.
 * Replaces bulky ~180px cards with a sleek, space-saving ~42px inline pill.
 */
export const CompactAppointmentEventCard: React.FC<CompactAppointmentEventCardProps> = ({
  msg,
  selectedRecipient,
  onSendMessage,
  isSuperseded = false,
  currentOcc,
  onNavigateToSchedule,
  currentUserId,
  currentUserRole,
  isSender
}) => {
  const [actionLoading, setActionLoading] = useState(false);
  const [actionDoneStatus, setActionDoneStatus] = useState<'confirmed' | 'rejected' | null>(null);

  const content: string = msg.content || '';
  const cleanContent = String(content || '').replace(/^\[Termin[^\]]+\]\s*/i, '').trim();
  const lowerContent = cleanContent.toLowerCase();
  const arrowIndex = content.indexOf('->');

  const isReactivation = msg.message_type === 'cancellation_reset' ||
    content.includes('🔄') || lowerContent.includes('reaktiviert') || lowerContent.includes('zurückgesetzt') || lowerContent.includes('wiederhergestellt') || lowerContent.includes('regulär statt') || lowerContent.includes('entwarnung') || lowerContent.includes('einsatzbereit');

  const isCancellation = (msg.message_type === 'reschedule_notification' && (content.includes('❌') || lowerContent.includes('abgesagt'))) ||
    content.includes('❌') || lowerContent.includes('termin abgesagt') || lowerContent.includes('fällt aus') || lowerContent.includes('abgesagt') || lowerContent.includes('storniert') || lowerContent.includes('wurde abgesagt');

  const dateMatch = extractOccurrenceDateFromMessage(msg);
  const occDateStr = currentOcc?.date || dateMatch;
  let parsedDate: Date | null = null;
  if (occDateStr) {
    try {
      const p = parseLocalDate(occDateStr);
      if (!isNaN(p.getTime())) parsedDate = p;
    } catch (e) {}
  }

  const handleNavigate = (e?: React.MouseEvent | React.KeyboardEvent) => {
    if (e) e.stopPropagation();
    if (typeof window === 'undefined') return;
    const targetDate = occDateStr;
    if (targetDate) {
      localStorage.setItem('campus_calendar_target_date', targetDate);
      localStorage.setItem('groovelab_selected_schedule_date', targetDate);
      sessionStorage.setItem('campus_calendar_target_date', targetDate);
      sessionStorage.setItem('groovelab_selected_schedule_date', targetDate);
      window.dispatchEvent(new CustomEvent('groovelab_navigate_schedule_date', { detail: { date: targetDate } }));
    }
    sessionStorage.setItem('campus_active_tab', 'schedule');
    sessionStorage.setItem('groovelab_active_tab', 'schedule');
    localStorage.setItem('campus_active_tab', 'schedule');
    localStorage.setItem('groovelab_active_tab', 'schedule');

    if (onNavigateToSchedule) {
      onNavigateToSchedule(targetDate || undefined);
    } else {
      window.dispatchEvent(new CustomEvent('groovelab_navigate_schedule_date', { detail: { date: targetDate } }));
      window.dispatchEvent(new CustomEvent('campus_navigate_tab', { detail: { tab: 'schedule', date: targetDate } }));
    }
  };

  const formattedDateShort = parsedDate
    ? parsedDate.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
    : '';

  const timeMatch = String(content || '').match(/\b(\d{1,2}:\d{2})\s*(?:uhr)?\b/i);
  const explicitTimeStr = timeMatch ? `${timeMatch[1]} Uhr` : (currentOcc?.start_time ? `${currentOcc.start_time.slice(0, 5)} Uhr` : null);

  // 1. Reaktivierung (0,1% Apple System-Pill: randlos, Soft-Tint, volle Tastaturbedienbarkeit)
  if (isReactivation) {
    const teacherName = formatStudentDisplayName(selectedRecipient);
    const shortLabel = `Planmäßig: ${teacherName ? `${teacherName} am ` : ''}${formattedDateShort || 'Termin'}${explicitTimeStr ? ` um ${explicitTimeStr}` : ''} findet statt`;

    return (
      <div style={{ display: 'flex', justifyContent: 'center', width: '100%', margin: '6px 0' }}>
        <div 
          role={parsedDate ? "button" : "status"}
          tabIndex={parsedDate ? 0 : undefined}
          onClick={parsedDate ? handleNavigate : undefined}
          onKeyDown={parsedDate ? (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleNavigate(e);
            }
          } : undefined}
          aria-label={parsedDate ? `${shortLabel} – Im Stundenplan ansehen` : shortLabel}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(16, 185, 129, 0.09)',
            border: 'none',
            borderRadius: '9999px',
            padding: '5px 12px 5px 8px',
            cursor: parsedDate ? 'pointer' : 'default',
            userSelect: 'none',
            transition: 'all 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
            maxWidth: '100%',
            boxSizing: 'border-box'
          }}
          className={parsedDate ? "hover-scale" : undefined}
        >
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            background: '#15803d',
            color: '#ffffff',
            flexShrink: 0
          }}>
            <Check size={12} strokeWidth={3} />
          </span>

          <span style={{
            fontSize: '0.78rem',
            fontWeight: 700,
            color: '#14532d',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            {formattedDateShort ? `${formattedDateShort} • ` : ''}{explicitTimeStr ? `${explicitTimeStr} • ` : ''}Planmäßig
          </span>

          {parsedDate && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '2px',
              fontSize: '0.70rem',
              fontWeight: 700,
              color: '#047857',
              marginLeft: '2px',
              flexShrink: 0
            }}>
              <span>Kalender</span>
              <ChevronRight size={13} strokeWidth={2.6} />
            </span>
          )}
        </div>
      </div>
    );
  }

  // 2. Absage / Ausfall (0,1% Apple System-Pill: randlos, Soft-Tint, volle Tastaturbedienbarkeit)
  if (isCancellation) {
    const teacherName = formatStudentDisplayName(selectedRecipient);
    const shortLabel = `Terminausfall: ${teacherName ? `${teacherName} am ` : ''}${formattedDateShort || 'Termin'}${explicitTimeStr ? ` um ${explicitTimeStr}` : ''} entfällt`;

    return (
      <div style={{ display: 'flex', justifyContent: 'center', width: '100%', margin: '6px 0' }}>
        <div 
          role={parsedDate ? "button" : "status"}
          tabIndex={parsedDate ? 0 : undefined}
          onClick={parsedDate ? handleNavigate : undefined}
          onKeyDown={parsedDate ? (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleNavigate(e);
            }
          } : undefined}
          aria-label={parsedDate ? `${shortLabel} – Im Stundenplan ansehen` : shortLabel}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(239, 68, 68, 0.09)',
            border: 'none',
            borderRadius: '9999px',
            padding: '5px 12px 5px 8px',
            cursor: parsedDate ? 'pointer' : 'default',
            userSelect: 'none',
            transition: 'all 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
            maxWidth: '100%',
            boxSizing: 'border-box'
          }}
          className={parsedDate ? "hover-scale" : undefined}
        >
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            background: '#dc2626',
            color: '#ffffff',
            flexShrink: 0
          }}>
            <X size={12} strokeWidth={3} />
          </span>

          <span style={{
            fontSize: '0.78rem',
            fontWeight: 700,
            color: '#7f1d1d',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            {formattedDateShort ? `${formattedDateShort} • ` : ''}{explicitTimeStr ? `${explicitTimeStr} • ` : ''}Unterricht entfällt
          </span>

          {parsedDate && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '2px',
              fontSize: '0.70rem',
              fontWeight: 700,
              color: '#991b1b',
              marginLeft: '2px',
              flexShrink: 0
            }}>
              <span>Kalender</span>
              <ChevronRight size={13} strokeWidth={2.6} />
            </span>
          )}
        </div>
      </div>
    );
  }

  // 2b. Reine Terminbestätigung (0,1% Apple System-Pill: randlos, Soft-Tint, volle Tastaturbedienbarkeit)
  const isPureConfirmation = arrowIndex === -1 && 
    (content.includes('bestätigt') || lowerContent.includes('termin bestätigt') || lowerContent.includes('unterrichtstermin bestätigt')) && 
    !content.includes('abgelehnt');

  if (isPureConfirmation) {
    const teacherName = formatStudentDisplayName(selectedRecipient);
    const shortLabel = `Termin bestätigt: ${teacherName ? `${teacherName} am ` : ''}${formattedDateShort || 'Termin'}${explicitTimeStr ? ` um ${explicitTimeStr}` : ''}`;

    return (
      <div style={{ display: 'flex', justifyContent: 'center', width: '100%', margin: '6px 0' }}>
        <div 
          role={parsedDate ? "button" : "status"}
          tabIndex={parsedDate ? 0 : undefined}
          onClick={parsedDate ? handleNavigate : undefined}
          onKeyDown={parsedDate ? (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleNavigate(e);
            }
          } : undefined}
          aria-label={parsedDate ? `${shortLabel} – Im Stundenplan ansehen` : shortLabel}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(16, 185, 129, 0.09)',
            border: 'none',
            borderRadius: '9999px',
            padding: '5px 12px 5px 8px',
            cursor: parsedDate ? 'pointer' : 'default',
            userSelect: 'none',
            transition: 'all 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
            maxWidth: '100%',
            boxSizing: 'border-box'
          }}
          className={parsedDate ? "hover-scale" : undefined}
        >
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            background: '#15803d',
            color: '#ffffff',
            flexShrink: 0
          }}>
            <Check size={12} strokeWidth={3} />
          </span>

          <span style={{
            fontSize: '0.78rem',
            fontWeight: 700,
            color: '#14532d',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            {formattedDateShort ? `${formattedDateShort} • ` : ''}{explicitTimeStr ? `${explicitTimeStr} • ` : ''}Termin bestätigt
          </span>

          {parsedDate && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '2px',
              fontSize: '0.70rem',
              fontWeight: 700,
              color: '#047857',
              marginLeft: '2px',
              flexShrink: 0
            }}>
              <span>Kalender</span>
              <ChevronRight size={13} strokeWidth={2.6} />
            </span>
          )}
        </div>
      </div>
    );
  }

  // 3. Verschiebungsvorschlag / Interaktive Bestätigung (Schlanke Aktions-Pill)
  const isCurrentUserSender = isSender !== undefined 
    ? isSender 
    : Boolean(currentUserId && msg.sender_id && msg.sender_id === currentUserId);

  let title = 'Stundenplan-Update';
  let badgeText = 'Systemnachricht';
  let isPending = false;
  let oldTime = '';
  let newTime = '';

  if (arrowIndex !== -1) {
    title = isCurrentUserSender ? 'Terminverschiebung übermittelt' : 'Neue Unterrichtszeit';
    if (isSuperseded) {
      badgeText = 'Nicht mehr aktuell';
      isPending = false;
    } else if (currentOcc && (currentOcc.status === 'confirmed' || currentOcc.status === 'rescheduled_confirmed' || currentOcc.student_acknowledged || (currentOcc.status === 'scheduled' && !currentOcc.is_rescheduled && !currentOcc.rescheduled_from))) {
      badgeText = 'Bestätigt';
      isPending = false;
    } else if (currentOcc && (currentOcc.status === 'cancelled' || currentOcc.status === 'canceled_by_student')) {
      badgeText = 'Abgesagt';
      isPending = false;
    } else {
      badgeText = isCurrentUserSender ? 'Wartet auf Bestätigung' : 'Bestätigung ausstehend';
      isPending = true;
    }

    const leftRaw = content.substring(0, arrowIndex)
      .replace(/Dein Termin wurde verschoben:/i, '')
      .replace(/verschoben von:/i, '')
      .trim();
    const rightRaw = content.substring(arrowIndex + 2).trim();
    const uhrIndex = rightRaw.toLowerCase().indexOf('uhr');
    newTime = uhrIndex !== -1 ? rightRaw.substring(0, uhrIndex + 3).trim() : rightRaw;
    oldTime = leftRaw;
  } else if (content.includes('abgelehnt')) {
    title = 'Verschiebung abgelehnt';
    badgeText = 'Abgelehnt';
  } else if (content.includes('bestätigt')) {
    title = 'Termin bestätigt';
    badgeText = 'Bestätigt';
  }

  if (actionDoneStatus === 'confirmed') {
    badgeText = 'Bestätigt';
    isPending = false;
  } else if (actionDoneStatus === 'rejected') {
    badgeText = 'Abgelehnt';
    isPending = false;
  }

  const handleConfirm = async () => {
    try {
      setActionLoading(true);
      if (msg.occurrence_id) {
        await supabase
          .from('schedule_occurrences')
          .update({ status: 'rescheduled_confirmed', student_acknowledged: true, updated_at: new Date().toISOString() })
          .eq('id', msg.occurrence_id);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('groovelab_schedule_changed'));
          window.dispatchEvent(new CustomEvent('campus_schedule_sync'));
          try { localStorage.setItem('campus_schedule_sync', Date.now().toString()); } catch (_) {}
        }
      }
      if (selectedRecipient && onSendMessage) {
        const text = newTime ? `Unterrichtstermin bestätigt: ${newTime}` : 'Unterrichtstermin bestätigt.';
        await onSendMessage(selectedRecipient.id, text);
      }
      setActionDoneStatus('confirmed');
    } catch (err) {
      console.error('Fehler beim Bestätigen:', err);
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
      console.error('Fehler beim Ablehnen:', err);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', width: '100%', margin: '8px 0' }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        padding: '14px 16px',
        maxWidth: '480px',
        width: '100%',
        boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
        border: isPending ? '1.5px solid #fde68a' : '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        boxSizing: 'border-box'
      }}>
        {/* Header mit Titel & Badge */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Calendar size={17} color={isPending ? '#b45309' : '#15803d'} strokeWidth={2.4} />
            <span style={{ fontSize: '0.92rem', fontWeight: 850, color: '#0f172a', letterSpacing: '-0.01em' }}>
              {title}
            </span>
          </div>
          <span style={{
            fontSize: '0.70rem',
            fontWeight: 800,
            padding: '4px 10px',
            borderRadius: '100px',
            background: isPending ? '#fef3c7' : (badgeText === 'Bestätigt' ? '#dcfce7' : '#f1f5f9'),
            color: isPending ? '#92400e' : (badgeText === 'Bestätigt' ? '#15803d' : '#475569'),
            border: isPending ? '1px solid #fde68a' : 'none',
            flexShrink: 0
          }}>
            {badgeText}
          </span>
        </div>

        {/* 2-Stufen Zeitvergleich Box */}
        {oldTime && newTime ? (
          <div style={{
            background: isPending ? 'rgba(245, 158, 11, 0.08)' : 'rgba(16, 185, 129, 0.08)',
            borderRadius: '12px',
            padding: '10px 12px',
            border: 'none',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px'
          }}>
            <div style={{ fontSize: '0.76rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontWeight: 600 }}>Regulär:</span>
              <span style={{ opacity: 0.9 }}>{oldTime}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 750, color: '#15803d' }}>Neu:</span>
              <span style={{ fontSize: '1.02rem', fontWeight: 900, color: '#15803d', letterSpacing: '-0.01em' }}>
                {newTime}
              </span>
            </div>
          </div>
        ) : null}

        {/* Aktionsbuttons mit min. 44px Touch Targets (WCAG 2.5.5) */}
        {isPending && !isCurrentUserSender && (
          <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
            <button
              type="button"
              disabled={actionLoading}
              onClick={handleConfirm}
              style={{
                flex: 1,
                minHeight: '44px',
                padding: '10px 14px',
                borderRadius: '12px',
                background: '#15803d',
                color: '#ffffff',
                border: 'none',
                fontSize: '0.86rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                boxShadow: 'none',
                transition: 'all 0.15s ease'
              }}
            >
              {actionLoading ? <Loader2 size={15} className="spin" /> : <Check size={16} strokeWidth={2.6} />}
              <span>Bestätigen</span>
            </button>
            <button
              type="button"
              disabled={actionLoading}
              onClick={handleReject}
              style={{
                flex: 1,
                minHeight: '44px',
                padding: '10px 14px',
                borderRadius: '12px',
                background: '#ffffff',
                color: '#dc2626',
                border: '1.5px solid #fca5a5',
                fontSize: '0.86rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.15s ease'
              }}
            >
              {actionLoading ? <Loader2 size={15} className="spin" /> : <X size={16} strokeWidth={2.6} />}
              <span>Ablehnen</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
