import React from 'react';
import { 
  Check, 
  X, 
  RotateCcw, 
  Clock, 
  ArrowRight, 
  Calendar 
} from 'lucide-react';
import { parseLocalDate } from './CompactAppointmentEventCard';

export interface ContextualAppointmentBannerProps {
  currentTab: any;
  displayedMessages?: any[];
  isMobile?: boolean;
  onNavigateToSchedule?: (dateStr?: string) => void;
}

/**
 * 📅 ContextualAppointmentBanner
 * 0,1% Apple Design System Contextual Header for Occurrence / Appointment Sub-Tabs.
 * Positioned cleanly outside the chat scroll container so it never gets clipped or scrolled away.
 */
export const ContextualAppointmentBanner: React.FC<ContextualAppointmentBannerProps> = ({
  currentTab,
  displayedMessages = [],
  isMobile = false,
  onNavigateToSchedule
}) => {
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

  const isCurrentlyCancelled = Boolean(
    currentTab.is_cancelled ||
    currentTab.status === 'cancelled' ||
    currentTab.status === 'canceled_by_student' ||
    currentTab.occurrence?.status === 'cancelled' ||
    currentTab.occurrence?.status === 'canceled_by_student' ||
    displayedMessages.some((m: any) => 
      m.message_type === 'cancellation_notification' || 
      m.content?.includes('❌ Termin abgesagt') ||
      m.content?.includes('Termin abgesagt')
    )
  );

  const isReactivated = Boolean(
    !isCurrentlyCancelled && (
      currentTab.is_reentry ||
      currentTab.status === 'scheduled' ||
      currentTab.occurrence?.status === 'scheduled' ||
      displayedMessages.some((m: any) => 
        m.message_type === 'cancellation_reset' || 
        m.content?.includes('🔄 Entwarnung') ||
        m.content?.includes('Termin reaktiviert')
      )
    )
  );

  const handleNavigate = () => {
    if (typeof window === 'undefined') return;
    const targetDate = currentTab?.date || currentTab?.occurrence?.date;
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

  return (
    <div 
      role="region"
      aria-label="Terminübersicht"
      style={{
        background: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        padding: isMobile ? '12px 14px' : '14px 24px',
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        alignItems: isMobile ? 'stretch' : 'center',
        justifyContent: 'space-between',
        gap: isMobile ? '12px' : '16px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
        boxSizing: 'border-box',
        flexShrink: 0
      }}
    >
      {/* Left: Apple Calendar Tear-Off Badge & Details */}
      <div style={{ display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', gap: isMobile ? '12px' : '16px', flex: 1, minWidth: 0 }}>
        {/* Apple Calendar Badge Block */}
        <div style={{
          width: '52px',
          height: '56px',
          borderRadius: '14px',
          background: '#ffffff',
          border: '1.5px solid #bbf7d0',
          boxShadow: 'none',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          flexShrink: 0,
          textAlign: 'center'
        }}>
          {/* Top Banner (Month) */}
          <div style={{
            background: '#15803d',
            color: '#ffffff',
            fontSize: '0.62rem',
            fontWeight: 900,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            padding: '2px 0'
          }}>
            {occDate.toLocaleDateString('de-DE', { month: 'short' })}
          </div>
          {/* Day Number */}
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.24rem',
            fontWeight: 900,
            color: '#0f172a',
            lineHeight: 1
          }}>
            {occDate.getDate()}
          </div>
        </div>

        {/* Text Details & Status Badges */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#334155' }}>
              Termin-Details
            </span>

            {isCurrentlyCancelled ? (
              <span style={{
                fontSize: '0.68rem',
                background: 'rgba(239, 68, 68, 0.09)',
                color: '#991b1b',
                padding: '3px 10px',
                borderRadius: '100px',
                fontWeight: 850,
                border: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <X size={11} strokeWidth={3} />
                <span>Termin abgesagt</span>
              </span>
            ) : isReactivated ? (
              <span style={{
                fontSize: '0.68rem',
                background: 'rgba(16, 185, 129, 0.09)',
                color: '#15803d',
                padding: '3px 10px',
                borderRadius: '100px',
                fontWeight: 850,
                border: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <RotateCcw size={11} strokeWidth={2.5} />
                <span>Termin reaktiviert (Planmäßig)</span>
              </span>
            ) : stammterminText ? (
              <span style={{
                fontSize: '0.68rem',
                background: 'rgba(245, 158, 11, 0.09)',
                color: '#b45309',
                padding: '3px 10px',
                borderRadius: '100px',
                fontWeight: 850,
                border: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <Clock size={11} strokeWidth={2.5} />
                <span>Termin verschoben</span>
              </span>
            ) : (
              <span style={{
                fontSize: '0.68rem',
                background: 'rgba(16, 185, 129, 0.09)',
                color: '#15803d',
                padding: '3px 10px',
                borderRadius: '100px',
                fontWeight: 850,
                border: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <Check size={11} strokeWidth={3} />
                <span>Planmäßiger Unterricht</span>
              </span>
            )}
          </div>

          {stammterminText ? (
            <div style={{
              background: 'rgba(16, 185, 129, 0.06)',
              borderRadius: '12px',
              padding: '6px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              flexWrap: 'wrap',
              marginTop: '4px',
              boxShadow: 'none',
              minWidth: 0
            }}>
              {/* Original Stammtermin Pill */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.78rem', color: '#64748b', fontWeight: 600, minWidth: 0 }}>
                <span style={{ fontSize: '0.64rem', fontWeight: 800, textTransform: 'uppercase', background: '#f1f5f9', color: '#475569', padding: '2px 6px', borderRadius: '4px', flexShrink: 0 }}>Stammtermin</span>
                <span style={{ overflowWrap: 'break-word' }}>{stammterminText}</span>
              </div>

              {/* Transition Arrow */}
              <div style={{ color: '#15803d', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                <ArrowRight size={13} color="#15803d" strokeWidth={2.6} />
              </div>

              {/* New Rescheduled Date Pill */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.78rem', color: '#15803d', fontWeight: 800, minWidth: 0 }}>
                <span style={{ fontSize: '0.64rem', fontWeight: 900, textTransform: 'uppercase', background: '#15803d', color: '#ffffff', padding: '2px 6px', borderRadius: '4px', flexShrink: 0 }}>Neu</span>
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
              <Clock size={12} color="#15803d" style={{ flexShrink: 0 }} />
              <span>{timeFormatted ? `Start um ${timeFormatted} Uhr` : 'Terminzeit vereinbart'}</span>
            </div>
          )}
        </div>
      </div>

      {/* Right: Apple Action Pill Button */}
      <button
        type="button"
        onClick={handleNavigate}
        style={{
          padding: '9px 18px',
          borderRadius: '100px',
          border: 'none',
          background: stammterminText ? '#d97706' : '#15803d',
          color: '#ffffff',
          fontSize: '0.78rem',
          fontWeight: 800,
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          boxShadow: 'none',
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
};
