import React, { useState } from 'react';
import { 
  Check, 
  X, 
  RotateCcw, 
  Calendar, 
  ArrowRight, 
  Clock, 
  Loader2,
  ExternalLink
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

  const handleNavigate = (e: React.MouseEvent) => {
    e.stopPropagation();
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

  // 1. Reaktivierung (Kompakte WhatsApp-System-Pill, ~42px)
  if (isReactivation) {
    const teacherName = formatStudentDisplayName(selectedRecipient);
    const shortLabel = `Planmäßig: ${teacherName ? `${teacherName} am ` : ''}${formattedDateShort || 'Termin'} findet statt`;

    return (
      <div style={{ display: 'flex', justifyContent: 'center', width: '100%', margin: '4px 0' }}>
        <div 
          role="status"
          aria-label={shortLabel}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '6px',
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '100px',
            padding: '4px 10px 4px 8px',
            boxShadow: '0 1px 3px rgba(22, 163, 74, 0.08)',
            maxWidth: '100%',
            boxSizing: 'border-box'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, overflow: 'hidden' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              background: '#22c55e',
              color: '#ffffff',
              flexShrink: 0
            }}>
              <Check size={12} strokeWidth={3} />
            </span>
            <span style={{
              fontSize: '0.76rem',
              fontWeight: 750,
              color: '#15803d',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {formattedDateShort ? `${formattedDateShort} • ` : ''}Planmäßig
            </span>
          </div>

          {parsedDate && (
            <button
              type="button"
              onClick={handleNavigate}
              aria-label={`Im Stundenplan ansehen für ${formattedDateShort}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                background: '#ffffff',
                border: '1px solid #86efac',
                color: '#15803d',
                borderRadius: '100px',
                padding: '2px 7px',
                fontSize: '0.68rem',
                fontWeight: 800,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                touchAction: 'manipulation',
                transition: 'all 0.15s ease'
              }}
              className="hover-scale"
            >
              <Calendar size={11} color="#15803d" />
              <span>Kalender</span>
              <ExternalLink size={9} color="#15803d" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // 2. Absage / Ausfall (Kompakte WhatsApp-System-Pill, ~42px)
  if (isCancellation) {
    const teacherName = formatStudentDisplayName(selectedRecipient);
    const shortLabel = `Terminausfall: ${teacherName ? `${teacherName} am ` : ''}${formattedDateShort || 'Termin'} entfällt`;

    return (
      <div style={{ display: 'flex', justifyContent: 'center', width: '100%', margin: '4px 0' }}>
        <div 
          role="status"
          aria-label={shortLabel}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '6px',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '100px',
            padding: '4px 10px 4px 8px',
            boxShadow: '0 1px 3px rgba(220, 38, 38, 0.08)',
            maxWidth: '100%',
            boxSizing: 'border-box'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, overflow: 'hidden' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              background: '#ef4444',
              color: '#ffffff',
              flexShrink: 0
            }}>
              <X size={12} strokeWidth={3} />
            </span>
            <span style={{
              fontSize: '0.76rem',
              fontWeight: 750,
              color: '#b91c1c',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {formattedDateShort ? `${formattedDateShort} • ` : ''}Unterricht entfällt
            </span>
          </div>

          {parsedDate && (
            <button
              type="button"
              onClick={handleNavigate}
              aria-label={`Im Stundenplan ansehen für ${formattedDateShort}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                background: '#ffffff',
                border: '1px solid #fca5a5',
                color: '#b91c1c',
                borderRadius: '100px',
                padding: '2px 7px',
                fontSize: '0.68rem',
                fontWeight: 800,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                touchAction: 'manipulation',
                transition: 'all 0.15s ease'
              }}
              className="hover-scale"
            >
              <Calendar size={11} color="#b91c1c" />
              <span>Kalender</span>
              <ExternalLink size={9} color="#b91c1c" />
            </button>
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

  const arrowIndex = content.indexOf('->');
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
          .update({ status: 'confirmed', student_acknowledged: true })
          .eq('id', msg.occurrence_id);
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
    <div style={{ display: 'flex', justifyContent: 'center', width: '100%', margin: '4px 0' }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '14px',
        padding: '8px 12px',
        maxWidth: '460px',
        width: '100%',
        boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
        border: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        boxSizing: 'border-box'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a' }}>
            {title}
          </span>
          <span style={{
            fontSize: '0.66rem',
            fontWeight: 800,
            padding: '2px 8px',
            borderRadius: '100px',
            background: isPending ? '#fef3c7' : (badgeText === 'Bestätigt' ? '#dcfce7' : '#f1f5f9'),
            color: isPending ? '#92400e' : (badgeText === 'Bestätigt' ? '#15803d' : '#475569')
          }}>
            {badgeText}
          </span>
        </div>

        {oldTime && newTime && (
          <div style={{ fontSize: '0.76rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ textDecoration: 'line-through', opacity: 0.75 }}>{oldTime}</span>
            <ArrowRight size={12} color="#94a3b8" />
            <span style={{ fontWeight: 800, color: '#15803d' }}>{newTime}</span>
          </div>
        )}

        {isPending && !isCurrentUserSender && (
          <div style={{ display: 'flex', gap: '8px', marginTop: '2px' }}>
            <button
              type="button"
              disabled={actionLoading}
              onClick={handleConfirm}
              style={{
                flex: 1,
                padding: '5px 10px',
                borderRadius: '8px',
                background: '#15803d',
                color: '#ffffff',
                border: 'none',
                fontSize: '0.74rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px'
              }}
            >
              {actionLoading ? <Loader2 size={12} className="spin" /> : <Check size={12} />}
              <span>Bestätigen</span>
            </button>
            <button
              type="button"
              disabled={actionLoading}
              onClick={handleReject}
              style={{
                flex: 1,
                padding: '5px 10px',
                borderRadius: '8px',
                background: '#fee2e2',
                color: '#991b1b',
                border: 'none',
                fontSize: '0.74rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px'
              }}
            >
              {actionLoading ? <Loader2 size={12} className="spin" /> : <X size={12} />}
              <span>Ablehnen</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
