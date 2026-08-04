import React from 'react';
import { AppointmentOccurrence } from '@groovelab/shared';

export interface AppointmentChangeItemProps {
  occ: AppointmentOccurrence;
  onNavigateToSchedule?: (dateStr?: string) => void;
  onAcknowledge?: (occId: string) => void;
  onAcceptReschedule?: (occId: string) => void;
  onDeclineReschedule?: (occId: string) => void;
}

export const AppointmentChangeItem: React.FC<AppointmentChangeItemProps> = ({
  occ,
  onNavigateToSchedule,
  onAcknowledge,
  onAcceptReschedule,
  onDeclineReschedule,
}) => {
  const d = new Date(occ.date);
  const isReschedule = occ.status === 'pending_reschedule';
  const isCancelled = ['cancelled', 'canceled_by_student', 'teacher_sick', 'canceled_by_teacher_sick'].includes(occ.status);

  let cardBg = '#fffbeb';
  let cardBorder = '#fef08a';
  let badgeText = '🔄 Verschiebung vorgeschlagen';
  let badgeColor = '#854d0e';

  if (isCancelled) {
    cardBg = '#fef2f2';
    cardBorder = '#fecaca';
    badgeText = '❌ Termin abgesagt';
    badgeColor = '#991b1b';
  } else if (occ.status === 'scheduled' && occ.original_date && occ.date === occ.original_date) {
    cardBg = '#e6f4ea';
    cardBorder = '#e6f4ea';
    badgeText = '❇️ Wieder regulär';
    badgeColor = '#34a853';
  }

  const formattedDateStr = d.toLocaleDateString('de-DE', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  return (
    <div style={{ padding: '12px', borderRadius: '12px', background: cardBg, border: `1px solid ${cardBorder}`, display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div>
        <div style={{ fontSize: '0.65rem', fontWeight: 800, color: badgeColor, textTransform: 'uppercase', marginBottom: '2px' }}>{badgeText}</div>
        <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a' }}>{occ.studentName || occ.title || 'Unterrichtstermin'}</div>
        <div style={{ fontSize: '0.76rem', color: '#475569', marginTop: '2px' }}>
          📅 {formattedDateStr} {occ.startTime ? `• 🕒 ${occ.startTime.slice(0, 5)} Uhr` : ''}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
        {onNavigateToSchedule && (
          <button onClick={() => onNavigateToSchedule(occ.date)} style={{ background: '#ffffff', color: '#1e293b', border: '1px solid #cbd5e1', padding: '4px 10px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}>
            Im Stundenplan anzeigen
          </button>
        )}
        {isReschedule && onAcceptReschedule && (
          <button onClick={() => onAcceptReschedule(occ.id)} style={{ background: '#16a34a', color: '#ffffff', border: 'none', padding: '4px 10px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}>
            Zustimmen
          </button>
        )}
        {isReschedule && onDeclineReschedule && (
          <button onClick={() => onDeclineReschedule(occ.id)} style={{ background: '#ef4444', color: '#ffffff', border: 'none', padding: '4px 10px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}>
            Ablehnen
          </button>
        )}
        {onAcknowledge && !isReschedule && (
          <button onClick={() => onAcknowledge(occ.id)} style={{ background: '#3b82f6', color: '#ffffff', border: 'none', padding: '4px 10px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}>
            Verstanden
          </button>
        )}
      </div>
    </div>
  );
};
