import React from 'react';
import { Calendar, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';

export interface AppointmentChangesWidgetProps {
  title?: string;
  myChangedAppointments: any[];
  visibleChangedAppointments?: any[];
  timeWindow?: '7days' | 'all';
  onTimeWindowChange?: (window: '7days' | 'all') => void;
  showAll?: boolean;
  onToggleShowAll?: () => void;
  onNavigateToSchedule?: (dateStr?: string) => void;
  onAcknowledge?: (occId: string) => void;
  onAcceptReschedule?: (occId: string) => void;
  onDeclineReschedule?: (occId: string) => void;
  isTeacher?: boolean;
}

export const AppointmentChangesWidget: React.FC<AppointmentChangesWidgetProps> = ({
  title = 'Terminänderungen',
  myChangedAppointments = [],
  visibleChangedAppointments = myChangedAppointments,
  timeWindow = 'all',
  onTimeWindowChange,
  showAll = false,
  onToggleShowAll,
  onNavigateToSchedule,
  onAcknowledge,
  onAcceptReschedule,
  onDeclineReschedule,
  isTeacher = false,
}) => {
  const hasChanges = myChangedAppointments.length > 0;
  if (!hasChanges) return null;
  const listToRender = showAll ? visibleChangedAppointments : visibleChangedAppointments.slice(0, 3);

  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: '24px',
        padding: '16px 18px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
        border: hasChanges ? '1.5px dashed #f59e0b' : '1px solid #e2e8f0',
        marginBottom: '20px',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '14px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Calendar size={16} color={hasChanges ? '#f59e0b' : '#475569'} />
          <h3
            style={{
              fontSize: '0.92rem',
              fontWeight: 800,
              color: '#1e293b',
              margin: 0,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            {title}
          </h3>
          {hasChanges && (
            <span
              style={{
                background: '#fef3c7',
                color: '#b45309',
                fontSize: '0.7rem',
                fontWeight: 800,
                padding: '2px 7px',
                borderRadius: '10px',
              }}
            >
              {myChangedAppointments.length}
            </span>
          )}
        </div>

        {/* Time Window Selector (for Teachers) */}
        {isTeacher && onTimeWindowChange && hasChanges && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '2px',
              background: '#f1f5f9',
              padding: '2px',
              borderRadius: '8px',
            }}
          >
            <button
              onClick={() => onTimeWindowChange('7days')}
              style={{
                border: 'none',
                background: timeWindow === '7days' ? '#ffffff' : 'transparent',
                color: timeWindow === '7days' ? '#0f172a' : '#64748b',
                fontWeight: timeWindow === '7days' ? 800 : 600,
                fontSize: '0.68rem',
                padding: '3px 8px',
                borderRadius: '6px',
                cursor: 'pointer',
                boxShadow: timeWindow === '7days' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              7 Tage
            </button>
            <button
              onClick={() => onTimeWindowChange('all')}
              style={{
                border: 'none',
                background: timeWindow === 'all' ? '#ffffff' : 'transparent',
                color: timeWindow === 'all' ? '#0f172a' : '#64748b',
                fontWeight: timeWindow === 'all' ? 800 : 600,
                fontSize: '0.68rem',
                padding: '3px 8px',
                borderRadius: '6px',
                cursor: 'pointer',
                boxShadow: timeWindow === 'all' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              Alle
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      {!hasChanges ? (
        <div
          style={{
            fontSize: '0.78rem',
            color: '#64748b',
            fontStyle: 'italic',
            padding: '16px 14px',
            textAlign: 'center',
            background: '#f8fafc',
            borderRadius: '16px',
            border: '1px dashed #cbd5e1',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: '#e6f4ea',
              color: '#34a853',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CheckCircle size={18} strokeWidth={2.5} />
          </div>
          <div style={{ fontWeight: 800, color: '#1e293b', fontSize: '0.82rem', fontStyle: 'normal' }}>
            Keine bevorstehenden Terminänderungen
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748b', fontStyle: 'normal' }}>
            {isTeacher
              ? 'Alle Unterrichtstermine finden regulär nach Stundenplan statt.'
              : 'Alle deine Unterrichtstermine finden regulär statt.'}
          </div>
        </div>
      ) : visibleChangedAppointments.length === 0 ? (
        <div
          style={{
            fontSize: '0.75rem',
            color: '#64748b',
            fontStyle: 'italic',
            padding: '12px',
            textAlign: 'center',
            background: '#f8fafc',
            borderRadius: '12px',
            border: '1px dashed #cbd5e1',
          }}
        >
          Keine Terminänderungen in den nächsten 7 Tagen.
          {onTimeWindowChange && (
            <button
              onClick={() => onTimeWindowChange('all')}
              style={{
                display: 'block',
                margin: '6px auto 0 auto',
                border: 'none',
                background: 'none',
                color: '#3b82f6',
                textDecoration: 'underline',
                cursor: 'pointer',
                fontSize: '0.72rem',
                fontWeight: 700,
              }}
            >
              Alle {myChangedAppointments.length} Änderungen anzeigen
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {listToRender.map((occ) => {
            const d = new Date(occ.date);
            const isReschedule = occ.status === 'pending_reschedule';
            const isCancelled = ['cancelled', 'canceled_by_student', 'teacher_sick', 'canceled_by_teacher_sick'].includes(
              occ.status
            );

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
              <div
                key={occ.id}
                style={{
                  padding: '12px',
                  borderRadius: '12px',
                  background: cardBg,
                  border: `1px solid ${cardBorder}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  position: 'relative',
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: '0.65rem',
                      fontWeight: 800,
                      color: badgeColor,
                      textTransform: 'uppercase',
                      letterSpacing: '0.03em',
                      marginBottom: '2px',
                    }}
                  >
                    {badgeText}
                  </div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a' }}>
                    {occ.studentName || occ.title || 'Unterrichtstermin'}
                  </div>
                  <div style={{ fontSize: '0.76rem', color: '#475569', marginTop: '2px' }}>
                    📅 {formattedDateStr} {occ.startTime ? `• 🕒 ${occ.startTime.slice(0, 5)} Uhr` : ''}
                  </div>

                  {occ.original_date && occ.original_date !== occ.date && (
                    <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
                      📍 Stammtermin: {new Date(occ.original_date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
                  {onNavigateToSchedule && (
                    <button
                      onClick={() => onNavigateToSchedule(occ.date)}
                      style={{
                        background: '#ffffff',
                        color: '#1e293b',
                        border: '1px solid #cbd5e1',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Im Stundenplan anzeigen
                    </button>
                  )}

                  {isReschedule && onAcceptReschedule && (
                    <button
                      onClick={() => onAcceptReschedule(occ.id)}
                      style={{
                        background: '#16a34a',
                        color: '#ffffff',
                        border: 'none',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Zustimmen
                    </button>
                  )}

                  {isReschedule && onDeclineReschedule && (
                    <button
                      onClick={() => onDeclineReschedule(occ.id)}
                      style={{
                        background: '#ef4444',
                        color: '#ffffff',
                        border: 'none',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Ablehnen
                    </button>
                  )}

                  {onAcknowledge && !isReschedule && (
                    <button
                      onClick={() => onAcknowledge(occ.id)}
                      style={{
                        background: '#3b82f6',
                        color: '#ffffff',
                        border: 'none',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Verstanden
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {/* Toggle show all / show less */}
          {visibleChangedAppointments.length > 3 && onToggleShowAll && (
            <button
              onClick={onToggleShowAll}
              style={{
                width: '100%',
                padding: '6px',
                border: 'none',
                background: 'transparent',
                color: '#64748b',
                fontSize: '0.74rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
              }}
            >
              {showAll ? (
                <>
                  <span>Weniger anzeigen</span>
                  <ChevronUp size={14} />
                </>
              ) : (
                <>
                  <span>Alle {visibleChangedAppointments.length} Terminänderungen anzeigen</span>
                  <ChevronDown size={14} />
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
