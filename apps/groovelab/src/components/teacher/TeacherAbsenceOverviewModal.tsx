import React, { useState, useEffect } from 'react';
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
  MessageSquare,
  PhoneCall,
  Info
} from 'lucide-react';

export interface AbsenceCancellationGroup {
  dateStr: string;
  formattedDate: string;
  dayOfWeek: string;
  dayNum: string;
  unreadCount: number;
  readCount?: number;
  items: Array<{
    id?: string;
    student_id?: string;
    slot_start_datetime: string;
    status: string;
    read_at?: string | null;
    acknowledged_at?: string | null;
    teacher_contact_status?: string | null;
    teacher_contacted_at?: string | null;
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
  handleMarkStudentContacted?: (notificationId: string, contactType?: 'reached' | 'voicemail') => Promise<void> | void;
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
  handleEmergencyShoutbox,
  handleMarkStudentContacted
}) => {
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // WAI-ARIA Dialog Escape-Key Listener
  useEffect(() => {
    if (!showAbsenceOverviewModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowAbsenceOverviewModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAbsenceOverviewModal, setShowAbsenceOverviewModal]);

  if (!showAbsenceOverviewModal) return null;

  const isMobile = windowWidth <= 768;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: isMobile ? 'flex-end' : 'center',
        justifyContent: 'center',
        padding: isMobile ? '0px' : '20px',
        animation: 'fadeIn 0.2s ease-out'
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
          borderRadius: isMobile ? '24px 24px 0 0' : '24px',
          maxWidth: '680px',
          width: '100%',
          maxHeight: isMobile ? '92vh' : '88vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.25)',
          border: '1px solid #e2e8f0',
          overflow: 'hidden'
        }}
      >
        {/* Modal Header */}
        <div style={{
          padding: isMobile ? '18px 20px' : '22px 28px',
          borderBottom: '1px solid #f1f5f9',
          background: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '13px',
              background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 4px 12px rgba(15, 23, 42, 0.15)'
            }}>
              <Users size={22} />
            </div>
            <div>
              <h2 style={{
                margin: 0,
                fontSize: isMobile ? '1.05rem' : '1.18rem',
                fontWeight: 900,
                color: '#0f172a',
                letterSpacing: '-0.02em',
                fontFamily: "'Plus Jakarta Sans', sans-serif"
              }}>
                Ausfall-Status & Kenntnisnahmen
              </h2>
              <p style={{
                margin: '2px 0 0 0',
                fontSize: '0.76rem',
                color: '#64748b',
                fontWeight: 600
              }}>
                Revisionssichere Lesebestätigungen • Abwesenheitszeitraum aktiv
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
              transition: 'all 0.15s',
              touchAction: 'manipulation'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* KPI Summary Banner */}
        <div style={{
          padding: isMobile ? '14px 20px' : '16px 28px',
          background: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          display: 'grid',
          gridTemplateColumns: isMobile ? 'repeat(3, 1fr)' : 'repeat(3, 1fr)',
          gap: isMobile ? '8px' : '12px',
          flexShrink: 0
        }}>
          {/* Card 1: Total */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            padding: isMobile ? '10px 10px' : '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)'
          }}>
            <span style={{ fontSize: isMobile ? '0.62rem' : '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Ausfälle Gesamt
            </span>
            <span style={{ fontSize: isMobile ? '1.25rem' : '1.4rem', fontWeight: 950, color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {totalAbsenceCancellationsCount}
            </span>
          </div>

          {/* Card 2: Read / Acknowledged */}
          <div style={{
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '14px',
            padding: isMobile ? '10px 10px' : '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            boxShadow: '0 1px 3px rgba(16, 185, 129, 0.05)'
          }}>
            <span style={{ fontSize: isMobile ? '0.62rem' : '0.68rem', fontWeight: 800, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Bestätigt / Erreicht
            </span>
            <span style={{ fontSize: isMobile ? '1.25rem' : '1.4rem', fontWeight: 950, color: '#166534', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {readCancellationsCount}
            </span>
          </div>

          {/* Card 3: Unread */}
          <div style={{
            background: unreadCancellationsCount > 0 ? '#fffbeb' : '#ffffff',
            border: unreadCancellationsCount > 0 ? '1px solid #fde047' : '1px solid #e2e8f0',
            borderRadius: '14px',
            padding: isMobile ? '10px 10px' : '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)'
          }}>
            <span style={{ fontSize: isMobile ? '0.62rem' : '0.68rem', fontWeight: 800, color: unreadCancellationsCount > 0 ? '#854d0e' : '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Offen (Ungelesen)
            </span>
            <span style={{ fontSize: isMobile ? '1.25rem' : '1.4rem', fontWeight: 950, color: unreadCancellationsCount > 0 ? '#854d0e' : '#64748b', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {unreadCancellationsCount}
            </span>
          </div>
        </div>

        {/* List of Affected Lessons - Tageweise gegliedert */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: isMobile ? '16px' : '20px 28px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          WebkitOverflowScrolling: 'touch'
        }}>
          {groupedAbsenceCancellations.length === 0 ? (
            <div style={{
              padding: '44px 20px',
              textAlign: 'center',
              background: '#f8fafc',
              borderRadius: '18px',
              border: '1px dashed #cbd5e1'
            }}>
              <CheckCircle size={36} color="#34a853" style={{ margin: '0 auto 10px auto' }} />
              <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 850, color: '#0f172a' }}>
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
                padding: '2px 4px',
                flexShrink: 0
              }}>
                <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
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
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    color: '#334155',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.15s',
                    touchAction: 'manipulation'
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
                      flexShrink: 0,
                      width: '100%',
                      minHeight: 'min-content',
                      borderRadius: '18px',
                      border: '1.5px solid #e2e8f0',
                      background: '#ffffff',
                      overflow: 'hidden',
                      boxShadow: '0 2px 6px rgba(0, 0, 0, 0.02)',
                      transition: 'border-color 0.15s'
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
                        padding: isMobile ? '12px 14px' : '14px 18px',
                        background: isCollapsed ? '#ffffff' : '#f8fafc',
                        borderBottom: isCollapsed ? 'none' : '1px solid #e2e8f0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                        cursor: 'pointer',
                        userSelect: 'none',
                        transition: 'background-color 0.15s'
                      }}
                    >
                      {/* Left: Day Badge & Label */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '11px',
                          background: '#ffffff',
                          border: '1.5px solid #cbd5e1',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)'
                        }}>
                          <span style={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', color: '#64748b' }}>
                            {group.dayOfWeek}
                          </span>
                          <span style={{ fontSize: '14px', fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>
                            {group.dayNum}
                          </span>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                          <span style={{ fontSize: isMobile ? '0.88rem' : '0.94rem', fontWeight: 850, color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                            {group.formattedDate}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
                            {group.items.length} {group.items.length === 1 ? 'Unterrichtseinheit' : 'Unterrichtseinheiten'}
                          </span>
                        </div>
                      </div>

                      {/* Right: KPI Pill + Chevron Toggle */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '6px' : '10px', flexShrink: 0 }}>
                        <div style={{
                          padding: isMobile ? '4px 8px' : '5px 11px',
                          borderRadius: '100px',
                          fontSize: isMobile ? '0.68rem' : '0.72rem',
                          fontWeight: 800,
                          background: group.unreadCount > 0 ? '#fffbeb' : '#f0fdf4',
                          color: group.unreadCount > 0 ? '#854d0e' : '#166534',
                          border: group.unreadCount > 0 ? '1px solid #fef08a' : '1px solid #bbf7d0',
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
                          width: '28px',
                          height: '28px',
                          borderRadius: '8px',
                          background: '#ffffff',
                          border: '1px solid #e2e8f0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#64748b'
                        }}>
                          {isCollapsed ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
                        </div>
                      </div>
                    </div>

                    {/* Collapsible Student Cards (Safari-safe, flexShrink: 0) */}
                    {!isCollapsed && (
                      <div style={{
                        padding: isMobile ? '10px' : '12px 14px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        background: '#f8fafc',
                        minHeight: 'min-content'
                      }}>
                        {group.items.map((item: any, idx: number) => {
                          const dt = new Date(item.slot_start_datetime);
                          const timeStr = !isNaN(dt.getTime())
                            ? dt.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
                            : '14:00';
                          const isRead = item.status === 'READ';
                          const isTeacherReached = item.teacher_contact_status === 'reached';

                          // Formatiere Lesebestätigungs-Zeitstempel falls vorhanden
                          let readTimeStr: string | null = null;
                          if (isRead && (item.read_at || item.acknowledged_at)) {
                            const readDt = new Date(item.read_at || item.acknowledged_at);
                            if (!isNaN(readDt.getTime())) {
                              readTimeStr = readDt.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
                            }
                          }

                          // Formatiere Lehrer-Kontaktiert-Zeitstempel falls vorhanden
                          let contactTimeStr: string | null = null;
                          if (isTeacherReached && item.teacher_contacted_at) {
                            const contactDt = new Date(item.teacher_contacted_at);
                            if (!isNaN(contactDt.getTime())) {
                              contactTimeStr = contactDt.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
                            }
                          }

                          return (
                            <div
                              key={item.id || idx}
                              style={{
                                padding: isMobile ? '10px 12px' : '12px 16px',
                                borderRadius: '14px',
                                background: '#ffffff',
                                border: isRead ? '1px solid #e2e8f0' : isTeacherReached ? '1px solid #bfdbfe' : '1px solid #fde68a',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '12px',
                                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
                                transition: 'all 0.15s'
                              }}
                            >
                              {/* Left: Student Info */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                                <div style={{
                                  width: '36px',
                                  height: '36px',
                                  borderRadius: '10px',
                                  background: isRead ? '#f1f5f9' : isTeacherReached ? '#eff6ff' : '#fffbeb',
                                  border: isRead ? '1px solid #e2e8f0' : isTeacherReached ? '1px solid #bfdbfe' : '1px solid #fef08a',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: isRead ? '#64748b' : isTeacherReached ? '#2563eb' : '#b45309',
                                  flexShrink: 0
                                }}>
                                  <User size={17} />
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                  <span style={{ fontSize: isMobile ? '0.86rem' : '0.90rem', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {item.studentName}
                                  </span>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px', fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
                                    <span>{item.instrument}</span>
                                    <span>•</span>
                                    <span style={{ fontWeight: 750, color: '#0f172a' }}>{timeStr} Uhr</span>
                                    {readTimeStr && (
                                      <>
                                        <span>•</span>
                                        <span style={{ color: '#166534', fontWeight: 700 }}>gelesen {readTimeStr} Uhr</span>
                                      </>
                                    )}
                                    {!readTimeStr && contactTimeStr && (
                                      <>
                                        <span>•</span>
                                        <span style={{ color: '#1d4ed8', fontWeight: 700 }}>erreicht {contactTimeStr} Uhr</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Right: Status Pill & Action */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '6px' : '8px', flexShrink: 0 }}>
                                {isRead ? (
                                  <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    background: '#f0fdf4',
                                    border: '1px solid #bbf7d0',
                                    padding: '5px 9px',
                                    borderRadius: '8px',
                                    color: '#166534',
                                    fontSize: '0.68rem',
                                    fontWeight: 800
                                  }}>
                                    <CheckCheck size={13} color="#16a34a" />
                                    <span style={{ display: isMobile ? 'none' : 'inline' }}>Bestätigt</span>
                                  </div>
                                ) : isTeacherReached ? (
                                  <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    background: '#eff6ff',
                                    border: '1px solid #bfdbfe',
                                    padding: '5px 9px',
                                    borderRadius: '8px',
                                    color: '#1d4ed8',
                                    fontSize: '0.68rem',
                                    fontWeight: 800
                                  }} title={contactTimeStr ? `Vom Lehrer als kontaktiert dokumentiert (${contactTimeStr} Uhr)` : 'Vom Lehrer als kontaktiert dokumentiert'}>
                                    <PhoneCall size={12} color="#2563eb" />
                                    <span style={{ display: isMobile ? 'none' : 'inline' }}>Erreicht</span>
                                  </div>
                                ) : (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <div style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      background: '#fffbeb',
                                      border: '1px solid #fef08a',
                                      padding: '5px 9px',
                                      borderRadius: '8px',
                                      color: '#854d0e',
                                      fontSize: '0.68rem',
                                      fontWeight: 800
                                    }} title="Nachricht von Schüler noch nicht geöffnet">
                                      <Clock size={12} color="#ca8a04" />
                                      <span>Ungelesen</span>
                                    </div>

                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleMarkStudentContacted?.(item.id, 'reached');
                                      }}
                                      style={{
                                        background: '#eff6ff',
                                        border: '1px solid #bfdbfe',
                                        color: '#1d4ed8',
                                        padding: '5px 9px',
                                        borderRadius: '8px',
                                        fontSize: '0.68rem',
                                        fontWeight: 800,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        transition: 'all 0.15s',
                                        touchAction: 'manipulation'
                                      }}
                                      title="Als telefonisch / persönlich erreicht markieren (automatische Uhrzeit)"
                                      aria-label={`${item.studentName} als erreicht markieren`}
                                    >
                                      <PhoneCall size={11} color="#2563eb" />
                                      <span>Erreicht</span>
                                    </button>
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
                                    background: '#0f172a',
                                    border: 'none',
                                    color: '#ffffff',
                                    padding: '6px 11px',
                                    borderRadius: '8px',
                                    fontSize: '0.72rem',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    transition: 'opacity 0.15s',
                                    touchAction: 'manipulation'
                                  }}
                                  title="Shoutbox mit Schüler öffnen"
                                >
                                  <MessageSquare size={12} />
                                  <span style={{ display: isMobile ? 'none' : 'inline' }}>Nachricht</span>
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
          padding: isMobile ? '14px 20px calc(14px + env(safe-area-inset-bottom)) 20px' : '16px 28px',
          borderTop: '1px solid #f1f5f9',
          background: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>
            <Info size={15} color="#64748b" style={{ flexShrink: 0 }} />
            <span style={{ lineHeight: 1.3 }}>
              Schüler ohne Kenntnisnahme bei Bedarf telefonisch oder per Sofort-Nachricht erinnern.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowAbsenceOverviewModal(false)}
            style={{
              background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '12px',
              padding: '10px 22px',
              fontSize: '0.82rem',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(15, 23, 42, 0.2)',
              flexShrink: 0,
              touchAction: 'manipulation'
            }}
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
};
