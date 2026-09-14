import React from 'react';
import {
  Users,
  X,
  CheckCircle,
  ChevronsUpDown,
  ChevronDown,
  ChevronUp,
  Clock,
  CheckCheck,
  User,
  MessageSquare
} from 'lucide-react';

export interface AbsenceCancellationGroup {
  dateStr: string;
  formattedDate: string;
  dayOfWeek: string;
  dayNum: string;
  unreadCount: number;
  items: Array<{
    id?: string;
    student_id?: string;
    slot_start_datetime: string;
    status: string;
    studentName: string;
    instrument?: string;
    student?: any;
    [key: string]: any;
  }>;
}

interface TeacherAbsenceOverviewModalProps {
  showAbsenceOverviewModal: boolean;
  setShowAbsenceOverviewModal: (show: boolean) => void;
  totalAbsenceCancellationsCount: number;
  readCancellationsCount: number;
  unreadCancellationsCount: number;
  groupedAbsenceCancellations: AbsenceCancellationGroup[];
  collapsedAbsenceDates: Record<string, boolean>;
  toggleAbsenceDateCollapse: (dateStr: string) => void;
  toggleAllAbsenceDates: () => void;
  areAllAbsenceDatesCollapsed: boolean;
  handleEmergencyShoutbox: (target: {
    id?: string;
    student_id?: string;
    date: string;
    startTime: string;
    student?: any;
    studentName: string;
  }) => void;
}

export const TeacherAbsenceOverviewModal: React.FC<TeacherAbsenceOverviewModalProps> = ({
  showAbsenceOverviewModal,
  setShowAbsenceOverviewModal,
  totalAbsenceCancellationsCount,
  readCancellationsCount,
  unreadCancellationsCount,
  groupedAbsenceCancellations,
  collapsedAbsenceDates,
  toggleAbsenceDateCollapse,
  toggleAllAbsenceDates,
  areAllAbsenceDatesCollapsed,
  handleEmergencyShoutbox
}) => {
  if (!showAbsenceOverviewModal) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
      onClick={() => setShowAbsenceOverviewModal(false)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Ausfall-Status & Kenntnisnahmen"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#ffffff',
          borderRadius: '28px',
          maxWidth: '680px',
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.3)',
          border: '1px solid #fca5a5',
          overflow: 'hidden'
        }}
      >
        {/* Modal Header */}
        <div style={{
          padding: '24px 28px',
          borderBottom: '1px solid #f1f5f9',
          background: 'linear-gradient(135deg, #fff5f5 0%, #ffffff 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 4px 14px rgba(239, 68, 68, 0.3)'
            }}>
              <Users size={24} />
            </div>
            <div>
              <h2 style={{
                margin: 0,
                fontSize: '1.2rem',
                fontWeight: 900,
                color: '#0f172a',
                letterSpacing: '-0.02em',
                fontFamily: "'Plus Jakarta Sans', sans-serif"
              }}>
                Ausfall-Status & Kenntnisnahmen
              </h2>
              <p style={{
                margin: '3px 0 0 0',
                fontSize: '0.78rem',
                color: '#64748b',
                fontWeight: 600
              }}>
                Volljuristischer Nachweis nach § 130 BGB • Abwesenheitszeitraum aktiv
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowAbsenceOverviewModal(false)}
            aria-label="Modal schließen"
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              background: '#f8fafc',
              color: '#64748b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* KPI Summary Banner */}
        <div style={{
          padding: '16px 28px',
          background: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '12px'
        }}>
          <div style={{
            background: '#ffffff',
            border: '1px solid #fca5a5',
            borderRadius: '16px',
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px'
          }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#991b1b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Ausfälle Gesamt
            </span>
            <span style={{ fontSize: '1.4rem', fontWeight: 950, color: '#991b1b', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {totalAbsenceCancellationsCount}
            </span>
          </div>
          <div style={{
            background: '#ffffff',
            border: '1px solid #86efac',
            borderRadius: '16px',
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px'
          }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Gelesen (Zugang ✓)
            </span>
            <span style={{ fontSize: '1.4rem', fontWeight: 950, color: '#166534', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {readCancellationsCount}
            </span>
          </div>
          <div style={{
            background: '#ffffff',
            border: unreadCancellationsCount > 0 ? '1px solid #fde047' : '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px'
          }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 800, color: unreadCancellationsCount > 0 ? '#854d0e' : '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Noch Ungelesen
            </span>
            <span style={{ fontSize: '1.4rem', fontWeight: 950, color: unreadCancellationsCount > 0 ? '#854d0e' : '#64748b', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {unreadCancellationsCount}
            </span>
          </div>
        </div>

        {/* List of Affected Lessons - Tageweise gegliedert */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px 28px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px'
        }}>
          {groupedAbsenceCancellations.length === 0 ? (
            <div style={{
              padding: '40px 20px',
              textAlign: 'center',
              background: '#f8fafc',
              borderRadius: '20px',
              border: '1px dashed #cbd5e1'
            }}>
              <CheckCircle size={36} color="#34a853" style={{ margin: '0 auto 10px auto' }} />
              <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
                Keine betroffenen Unterrichtseinheiten
              </h4>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                Im ausgewählten Abwesenheitszeitraum liegen keine stornierten Schüler-Termine vor.
              </p>
            </div>
          ) : (
            <>
              {/* Global Accordion Control Bar */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '2px 4px'
              }}>
                <span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Ausfälle nach Unterrichtstagen ({groupedAbsenceCancellations.length} {groupedAbsenceCancellations.length === 1 ? 'Tag' : 'Tage'})
                </span>
                <button
                  type="button"
                  onClick={toggleAllAbsenceDates}
                  style={{
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    borderRadius: '10px',
                    padding: '5px 12px',
                    fontSize: '0.74rem',
                    fontWeight: 800,
                    color: '#334155',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.15s'
                  }}
                >
                  <ChevronsUpDown size={13} />
                  <span>{areAllAbsenceDatesCollapsed ? 'Alle ausklappen' : 'Alle einklappen'}</span>
                </button>
              </div>

              {/* Day Accordions */}
              {groupedAbsenceCancellations.map((group) => {
                const isCollapsed = !!collapsedAbsenceDates[group.dateStr];
                return (
                  <div
                    key={group.dateStr}
                    style={{
                      borderRadius: '20px',
                      border: '1.5px solid #e2e8f0',
                      background: '#ffffff',
                      overflow: 'hidden',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
                      transition: 'border-color 0.2s'
                    }}
                  >
                    {/* Accordion Day Header */}
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => toggleAbsenceDateCollapse(group.dateStr)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          toggleAbsenceDateCollapse(group.dateStr);
                        }
                      }}
                      aria-expanded={!isCollapsed}
                      aria-label={`Tag ${group.formattedDate} ${isCollapsed ? 'ausklappen' : 'einklappen'}`}
                      style={{
                        padding: '14px 18px',
                        background: isCollapsed ? '#ffffff' : 'linear-gradient(135deg, #fff5f5 0%, #ffffff 100%)',
                        borderBottom: isCollapsed ? 'none' : '1px solid #f1f5f9',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                        cursor: 'pointer',
                        userSelect: 'none',
                        transition: 'all 0.15s'
                      }}
                    >
                      {/* Left: Day Badge & Label */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                        <div style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '12px',
                          background: '#fee2e2',
                          border: '1.5px solid #fca5a5',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          <span style={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', color: '#dc2626' }}>
                            {group.dayOfWeek}
                          </span>
                          <span style={{ fontSize: '14px', fontWeight: 900, color: '#991b1b', lineHeight: 1 }}>
                            {group.dayNum}
                          </span>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                          <span style={{ fontSize: '0.94rem', fontWeight: 850, color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                            {group.formattedDate}
                          </span>
                          <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>
                            {group.items.length} {group.items.length === 1 ? 'Unterrichtseinheit' : 'Unterrichtseinheiten'}
                          </span>
                        </div>
                      </div>

                      {/* Right: KPI Pill + Chevron Toggle */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                        <div style={{
                          padding: '5px 11px',
                          borderRadius: '100px',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          background: group.unreadCount > 0 ? '#fef3c7' : '#dcfce7',
                          color: group.unreadCount > 0 ? '#92400e' : '#166534',
                          border: group.unreadCount > 0 ? '1px solid #fde047' : '1px solid #86efac',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px'
                        }}>
                          {group.unreadCount > 0 ? (
                            <>
                              <Clock size={12} color="#ca8a04" />
                              <span>{group.unreadCount} unbestätigt</span>
                            </>
                          ) : (
                            <>
                              <CheckCheck size={13} color="#16a34a" />
                              <span>Alle bestätigt ✓</span>
                            </>
                          )}
                        </div>

                        <div style={{
                          width: '30px',
                          height: '30px',
                          borderRadius: '8px',
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#64748b'
                        }}>
                          {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                        </div>
                      </div>
                    </div>

                    {/* Collapsible Student Cards */}
                    {!isCollapsed && (
                      <div style={{
                        padding: '12px 14px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                        background: '#f8fafc'
                      }}>
                        {group.items.map((item: any, idx: number) => {
                          const dt = new Date(item.slot_start_datetime);
                          const timeStr = !isNaN(dt.getTime())
                            ? dt.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
                            : '14:00';
                          const isRead = item.status === 'READ';

                          return (
                            <div
                              key={item.id || idx}
                              style={{
                                padding: '12px 16px',
                                borderRadius: '16px',
                                background: isRead ? '#ffffff' : 'repeating-linear-gradient(-45deg, #fef2f2 0px, #fef2f2 8px, #ffffff 8px, #ffffff 16px)',
                                border: isRead ? '1.5px solid #e2e8f0' : '1.5px solid #fca5a5',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '12px',
                                boxShadow: '0 1px 4px rgba(0, 0, 0, 0.02)'
                              }}
                            >
                              {/* Left: Student Info */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                                <div style={{
                                  width: '38px',
                                  height: '38px',
                                  borderRadius: '11px',
                                  background: isRead ? '#f1f5f9' : '#fee2e2',
                                  border: isRead ? '1px solid #e2e8f0' : '1.5px solid #fca5a5',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: isRead ? '#64748b' : '#dc2626',
                                  flexShrink: 0
                                }}>
                                  <User size={18} />
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                  <span style={{ fontSize: '0.90rem', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {item.studentName}
                                  </span>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px', fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>
                                    <span>{item.instrument}</span>
                                    <span>•</span>
                                    <span style={{ fontWeight: 750, color: '#0f172a' }}>{timeStr} Uhr</span>
                                  </div>
                                </div>
                              </div>

                              {/* Right: Status Pill & Action */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                                {isRead ? (
                                  <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    background: '#f0fdf4',
                                    border: '1px solid #86efac',
                                    padding: '5px 10px',
                                    borderRadius: '9px',
                                    color: '#166534',
                                    fontSize: '0.70rem',
                                    fontWeight: 800
                                  }}>
                                    <CheckCheck size={13} color="#16a34a" />
                                    <span>Bestätigt</span>
                                  </div>
                                ) : (
                                  <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    background: '#fffbeb',
                                    border: '1px solid #fde047',
                                    padding: '5px 10px',
                                    borderRadius: '9px',
                                    color: '#854d0e',
                                    fontSize: '0.70rem',
                                    fontWeight: 800
                                  }} title="Zugang nach § 130 BGB noch nicht bestätigt">
                                    <Clock size={12} color="#ca8a04" />
                                    <span>Ungelesen</span>
                                  </div>
                                )}

                                <button
                                  type="button"
                                  onClick={() => {
                                    setShowAbsenceOverviewModal(false);
                                    handleEmergencyShoutbox({
                                      id: item.id,
                                      student_id: item.student_id,
                                      date: item.slot_start_datetime.substring(0, 10),
                                      startTime: timeStr,
                                      student: item.student,
                                      studentName: item.studentName
                                    });
                                  }}
                                  style={{
                                    background: '#ffffff',
                                    border: '1px solid #cbd5e1',
                                    color: '#334155',
                                    padding: '6px 10px',
                                    borderRadius: '9px',
                                    fontSize: '0.72rem',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    transition: 'all 0.15s'
                                  }}
                                  title="Shoutbox mit Schüler öffnen"
                                >
                                  <MessageSquare size={12} />
                                  <span>Nachricht</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '16px 28px',
          borderTop: '1px solid #f1f5f9',
          background: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px'
        }}>
          <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
            💡 Schüler ohne Kenntnisnahme bei Bedarf bitte telefonisch oder per Notfall-Nachricht erinnern.
          </div>
          <button
            type="button"
            onClick={() => setShowAbsenceOverviewModal(false)}
            style={{
              background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '14px',
              padding: '10px 22px',
              fontSize: '0.82rem',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(15, 23, 42, 0.2)'
            }}
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
};
