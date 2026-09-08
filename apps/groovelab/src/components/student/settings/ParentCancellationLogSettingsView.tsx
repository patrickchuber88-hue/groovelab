import React from 'react';
import { AlertTriangle, ShieldCheck, CalendarX, RotateCcw, CheckCircle } from 'lucide-react';
import { formatTeacherFullName } from '../../../utils/nameHelper';

export interface ParentCancellationLogSettingsViewProps {
  cancelledSchoolYearOccurrences: any[];
  handleUndoCancelOccurrence: (occ: any, isParentAction?: boolean) => Promise<void>;
}

export const ParentCancellationLogSettingsView: React.FC<ParentCancellationLogSettingsViewProps> = ({
  cancelledSchoolYearOccurrences,
  handleUndoCancelOccurrence,
}) => {
  // Strikter Filter: Ausschließlich durch Schüler/Familie initiierte Absagen anzeigen (Art. 9 DSGVO & § 615 BGB Schutz)
  const studentCancellations = React.useMemo(() => {
    return (cancelledSchoolYearOccurrences || []).filter((occ: any) => {
      const s = String(occ.status || '').toLowerCase();
      const role = String(occ.canceled_by_role || '').toLowerCase();
      return s === 'canceled_by_student' || role === 'student' || s === 'absent';
    });
  }, [cancelledSchoolYearOccurrences]);

  const currentYear = new Date().getFullYear();
  const schoolYearLabel = new Date().getMonth() >= 8
    ? `${currentYear}/${currentYear + 1}`
    : `${currentYear - 1}/${currentYear}`;

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {studentCancellations.length === 0 ? (
        /* Ruhiger, sauberer Erfolgszustand: Keine Absagen */
        <div style={{
          padding: '48px 24px',
          borderRadius: '24px',
          background: '#f0fdf4',
          border: '1.5px dashed #86efac',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: '#dcfce7',
            color: '#16a34a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <CheckCircle size={30} />
          </div>
          <div style={{ fontSize: '1.08rem', fontWeight: 950, color: '#15803d' }}>
            Keine gemeldeten Abwesenheiten
          </div>
          <div style={{ fontSize: '0.84rem', color: '#166534', maxWidth: '400px', lineHeight: 1.45, fontWeight: 550 }}>
            In diesem Schuljahr ({schoolYearLabel}) wurden keine Unterrichtsstunden abgesagt. Alle Termine wurden regulär wahrgenommen.
          </div>
        </div>
      ) : (
        /* Übersichtliche Liste der tatsächlich abgesagten Stunden */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 14px',
            borderRadius: '12px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            fontSize: '0.80rem',
            color: '#475569',
            fontWeight: 700
          }}>
            <span>Schuljahr {schoolYearLabel}</span>
            <span style={{
              background: '#fee2e2',
              color: '#b91c1c',
              padding: '3px 10px',
              borderRadius: '8px',
              fontSize: '0.76rem',
              fontWeight: 850
            }}>
              {studentCancellations.length} {studentCancellations.length === 1 ? 'Absage' : 'Absagen'}
            </span>
          </div>

          {studentCancellations.map((occ: any) => {
            const occDate = new Date(occ.date + 'T00:00:00');
            const dateFormatted = occDate.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });
            const teacherName = occ.teacher ? formatTeacherFullName(occ.teacher) : (occ.teacher_name ? formatTeacherFullName(occ.teacher_name) : 'Lehrkraft');
            const isFuture = (occ.date || '') >= todayStr;

            return (
              <div
                key={occ.id || `${occ.date}_${occ.start_time}`}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  padding: '16px',
                  borderRadius: '16px',
                  background: '#ffffff',
                  border: '1.5px solid #fed7aa',
                  boxShadow: '0 2px 6px rgba(245, 158, 11, 0.04)',
                  textAlign: 'left'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '12px',
                      background: '#fef3c7',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <CalendarX size={18} color="#d97706" />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.92rem', fontWeight: 900, color: '#0f172a' }}>
                        {dateFormatted} {occ.start_time ? `• ${occ.start_time.substring(0, 5)} Uhr` : ''}
                      </div>
                      <div style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: 650 }}>
                        Lehrkraft: {teacherName} {occ.instrument ? `• ${occ.instrument}` : ''}
                      </div>
                    </div>
                  </div>

                  {/* Falls Termin zukünftig: Rücknahme für Eltern */}
                  {isFuture && (
                    <button
                      type="button"
                      onClick={() => handleUndoCancelOccurrence(occ, true)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '6px 12px',
                        borderRadius: '10px',
                        background: '#f0fdf4',
                        border: '1.5px solid #86efac',
                        color: '#15803d',
                        fontSize: '0.74rem',
                        fontWeight: 850,
                        cursor: 'pointer'
                      }}
                      className="hover-scale"
                      title="Absage widerrufen und Termin im Stundenplan reaktivieren"
                    >
                      <RotateCcw size={13} />
                      <span>Absage zurücknehmen</span>
                    </button>
                  )}
                </div>

                {/* Grund nur anzeigen wenn angegeben */}
                {occ.cancel_reason && (
                  <div style={{
                    fontSize: '0.76rem',
                    color: '#475569',
                    background: '#f8fafc',
                    padding: '8px 12px',
                    borderRadius: '10px',
                    border: '1px solid #f1f5f9'
                  }}>
                    <strong>Grund:</strong> {occ.cancel_reason}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Dezente juristische Fußnote */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 14px',
        borderRadius: '12px',
        background: '#f8fafc',
        border: '1px solid #f1f5f9',
        color: '#64748b',
        fontSize: '0.72rem',
        textAlign: 'left',
        lineHeight: 1.4
      }}>
        <ShieldCheck size={15} color="#64748b" style={{ flexShrink: 0 }} />
        <span>Dokumentierte Abwesenheiten. Etwaige Nachholansprüche richten sich nach dem Unterrichtsvertrag deiner Musikschule.</span>
      </div>
    </div>
  );
};
