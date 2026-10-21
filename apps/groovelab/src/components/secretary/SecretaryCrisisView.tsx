import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, UserX, UserCheck, Clock, CheckCircle, CheckCircle2, 
  Archive, Calendar, Sparkles, ChevronRight, BookOpen, Check, X, 
  ClipboardList, AlertCircle 
} from 'lucide-react';
import { formatTeacherFullName } from '../../utils/nameHelper';
import { supabase } from '../../lib/supabase';

interface SchoolMakeupToken {
  id: string;
  teacher_id: string;
  student_id: string;
  total_minutes: number;
  remaining_minutes: number;
  status: string;
  original_date?: string;
}

interface CrisisNotificationItem {
  id: string;
  slot_start_datetime: string;
  status: 'UNREAD' | 'READ' | 'ARCHIVED';
  notified_at?: string;
  teacher_id?: string;
  handling_owner?: 'secretariat' | 'teacher';
  student?: {
    id: string;
    first_name: string;
    last_name: string;
    instrument?: string;
  };
  teacher?: {
    id: string;
    first_name: string;
    last_name: string;
    ausfall_until?: string | null;
    ausfallUntil?: string | null;
  };
}

interface SecretaryCrisisViewProps {
  crisisNotifications: CrisisNotificationItem[];
  crisisTabMode: 'live' | 'history';
  setCrisisTabMode: (mode: 'live' | 'history') => void;
  selectedCrisisTeacherId: string | null;
  setSelectedCrisisTeacherId: (id: string | null) => void;
  handleMarkAsNotified: (id: string) => Promise<void> | void;
  handleClaimTicket?: (id: string) => Promise<void> | void;
  handleArchiveCrisisTicket: (id: string) => Promise<void> | void;
  handleArchiveAllResolvedTickets: (ids: string[]) => Promise<void> | void;
  handleEndAbsenceOnBehalf?: (teacherId: string, teacherName: string) => Promise<void> | void;
  expandedLiveDayStr: string | null;
  setExpandedLiveDayStr: (day: string | null) => void;
  selectedArchiveLog: any;
  setSelectedArchiveLog: (log: any) => void;
  windowWidth?: number;
}

export const SecretaryCrisisView: React.FC<SecretaryCrisisViewProps> = ({
  crisisNotifications,
  crisisTabMode,
  setCrisisTabMode,
  selectedCrisisTeacherId,
  setSelectedCrisisTeacherId,
  handleMarkAsNotified,
  handleClaimTicket,
  handleArchiveCrisisTicket,
  handleArchiveAllResolvedTickets,
  handleEndAbsenceOnBehalf,
  expandedLiveDayStr,
  setExpandedLiveDayStr,
  selectedArchiveLog,
  setSelectedArchiveLog,
  windowWidth = 1280,
}) => {
  const effectiveWidth = windowWidth || (typeof window !== 'undefined' ? window.innerWidth : 1280);
  const isMobileView = effectiveWidth <= 768;
  const isTabletOrMobile = effectiveWidth <= 1180;
  const effectiveEndAbsenceOnBehalf = handleEndAbsenceOnBehalf || (() => {});
  const now = new Date();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [schoolMakeupTokens, setSchoolMakeupTokens] = useState<SchoolMakeupToken[]>([]);

  useEffect(() => {
    const fetchSchoolTokens = async () => {
      try {
        const { data, error } = await supabase
          .from('lesson_makeup_tokens')
          .select('id, teacher_id, student_id, total_minutes, remaining_minutes, status, original_date');
        if (!error && data) {
          setSchoolMakeupTokens(data);
        }
      } catch (err) {
        console.warn('Error fetching makeup tokens for crisis view:', err);
      }
    };
    fetchSchoolTokens();
  }, []);

  // ── Derived data ──
  const absentTeachersMap = new Map<string, any>();
  crisisNotifications.forEach(n => {
    const untilVal = n.teacher?.ausfall_until ?? n.teacher?.ausfallUntil;
    if (n.teacher && untilVal) {
      const absenceUntilTime = new Date(untilVal).getTime();
      if (absenceUntilTime >= todayStart.getTime()) {
        absentTeachersMap.set(n.teacher.id, n.teacher);
      }
    }
  });
  const absentTeachers = Array.from(absentTeachersMap.values());

  const liveTickets = crisisNotifications.filter(n => {
    const isPast = new Date(n.slot_start_datetime).getTime() < todayStart.getTime();
    if (n.status === 'ARCHIVED' || isPast) return false;
    const untilVal = n.teacher?.ausfall_until ?? n.teacher?.ausfallUntil;
    if (!n.teacher || !untilVal) return false;
    const absenceUntilTime = new Date(untilVal).getTime();
    return absenceUntilTime >= todayStart.getTime();
  });
  const todayEnd = new Date(todayStart);
  todayEnd.setHours(23, 59, 59, 999);
  const todayTickets = liveTickets.filter(n => {
    const time = new Date(n.slot_start_datetime).getTime();
    return time >= todayStart.getTime() && time <= todayEnd.getTime();
  });
  const archiveTickets = crisisNotifications.filter(n => {
    const isPast = new Date(n.slot_start_datetime).getTime() < todayStart.getTime();
    const untilVal = n.teacher?.ausfall_until ?? n.teacher?.ausfallUntil;
    const isAvailable = !n.teacher || !untilVal || new Date(untilVal).getTime() < todayStart.getTime();
    return n.status === 'ARCHIVED' || isPast || isAvailable;
  });
  const poolTickets = crisisTabMode === 'live' ? liveTickets : archiveTickets;
  const visibleTickets = selectedCrisisTeacherId
    ? poolTickets.filter(t => t.teacher?.id === selectedCrisisTeacherId)
    : poolTickets;

  const unreadCount = liveTickets.filter(n => n.status === 'UNREAD').length;
  const readCount = liveTickets.filter(n => n.status === 'READ').length;
  const archivedCount = archiveTickets.length;

  // ── Helper: urgency classification ──
  const getUrgency = (n: any): 'RED' | 'YELLOW' | 'GREEN' => {
    if (n.status === 'READ') return 'GREEN';
    const minsUntil = (new Date(n.slot_start_datetime).getTime() - now.getTime()) / 60000;
    return minsUntil < 120 ? 'RED' : 'YELLOW';
  };

  // ── Helper: absence duration string ──
  const absenceDurStr = (v: string | null | undefined) => {
    if (!v) return 'Dauer offen';
    try { 
      return `bis ${new Date(v).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })}`; 
    } catch { 
      return 'Dauer unbekannt'; 
    }
  };

  // ── Grouped archive logbook data ──
  const archiveGroups = (() => {
    const groups: { [key: string]: { date: string, teacher: any, tickets: any[] } } = {};
    archiveTickets.forEach(t => {
      const dVal = new Date(t.slot_start_datetime);
      const dateStr = dVal.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const key = `${dateStr}_${t.teacher_id}`;
      if (!groups[key]) {
        groups[key] = {
          date: dateStr,
          teacher: t.teacher,
          tickets: []
        };
      }
      groups[key].tickets.push(t);
    });
    return Object.values(groups).sort((a, b) => {
      const [aDay, aMonth, aYear] = a.date.split('.').map(Number);
      const [bDay, bMonth, bYear] = b.date.split('.').map(Number);
      return new Date(bYear, bMonth - 1, bDay).getTime() - new Date(aYear, aMonth - 1, aDay).getTime();
    });
  })();

  // ── Ticket Card Component ──
  const TicketCard = ({ t }: { t: any }) => {
    const urgency = crisisTabMode === 'history' ? 'GREEN' : getUrgency(t);
    const studentName = t.student ? `${t.student.first_name} ${t.student.last_name}` : 'Unbekannter Schüler';
    const teacherName = t.teacher ? formatTeacherFullName(t.teacher) : 'Lehrkraft';
    const subject = t.student?.instrument || 'Musikunterricht';
    const timeStr = new Date(t.slot_start_datetime).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    const dateStr = new Date(t.slot_start_datetime).toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long' });

    const urgencyMeta = {
      RED:    { leftBar: '#ef4444', bg: '#fee2e2', border: 'none', badge: '#ef4444', badgeText: 'white', badgeLabel: 'Akuter Ausfall', icon: ShieldAlert, dot: '#ef4444' },
      YELLOW: { leftBar: '#facc15', bg: '#fef9c3', border: 'none', badge: '#facc15', badgeText: '#0f172a', badgeLabel: 'Ausstehend', icon: Clock, dot: '#facc15' },
      GREEN:  { leftBar: '#34a853', bg: '#e6f4ea', border: 'none', badge: '#34a853', badgeText: 'white', badgeLabel: 'Informiert', icon: CheckCircle2, dot: '#34a853' },
    };
    const m = urgencyMeta[urgency] || urgencyMeta['GREEN'];
    const UrgencyIcon = m.icon;

    return (
      <div key={t.id} style={{
        background: m.bg,
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: m.border,
        borderLeft: `5px solid ${m.leftBar}`,
        borderRadius: '20px',
        padding: isMobileView ? '16px' : '18px 22px',
        display: 'flex',
        flexDirection: isMobileView ? 'column' : 'row',
        alignItems: isMobileView ? 'stretch' : 'center',
        gap: isMobileView ? '12px' : '18px',
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: '0 8px 32px rgba(15, 23, 42, 0.03)',
      }} className="hover-scale">
        {!isMobileView && (
          <div style={{
            width: '10px', height: '10px', borderRadius: '50%',
            background: m.dot, flexShrink: 0,
            position: 'relative',
            boxShadow: 'none',
          }}>
            {urgency === 'RED' && (
              <div style={{
                position: 'absolute', inset: -4, borderRadius: '50%',
                border: '2px solid #ef4444', animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite'
              }} />
            )}
          </div>
        )}

        {/* Main info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: isMobileView ? 'space-between' : 'flex-start', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {isMobileView && (
                <div style={{
                  width: '9px', height: '9px', borderRadius: '50%',
                  background: m.dot, flexShrink: 0,
                  boxShadow: 'none',
                }} />
              )}
              <span style={{ fontSize: '1rem', fontWeight: 900, color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                {studentName}
              </span>
              <span style={{
                fontSize: '0.68rem', fontWeight: 800, background: 'rgba(15, 23, 42, 0.06)',
                color: '#475569', padding: '3px 10px', borderRadius: '100px',
                backdropFilter: 'blur(4px)'
              }}>{subject}</span>
            </div>
            {isMobileView && (
              <span style={{
                padding: '4px 10px', borderRadius: '100px', flexShrink: 0,
                fontSize: '0.68rem', fontWeight: 900, whiteSpace: 'nowrap',
                background: m.badge, color: m.badgeText,
                display: 'flex', alignItems: 'center', gap: '5px'
              }}>
                <UrgencyIcon size={12} color={m.badgeText} />
                <span>{m.badgeLabel}</span>
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: isMobileView ? '8px 12px' : '14px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 600 }}>
              <Calendar size={13} style={{ color: '#475569' }} /> {dateStr}
            </span>
            <span style={{ fontSize: '0.8rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 600 }}>
              <Clock size={13} style={{ color: '#475569' }} /> {timeStr} Uhr
            </span>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
              Lehrkraft: <strong style={{ color: '#0f172a', fontWeight: 700 }}>{teacherName}</strong>
            </span>
            {/* Zuständigkeits-Kennzeichnung zur Vermeidung von Doppel-Anrufen */}
            {t.handling_owner === 'teacher' ? (
              <span style={{
                fontSize: '0.72rem',
                fontWeight: 800,
                background: '#f1f5f9',
                color: '#475569',
                border: '1px solid #cbd5e1',
                padding: '2px 8px',
                borderRadius: '100px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }} title="Lehrkraft übernimmt die Schüler-Kontaktaufnahme eigenständig">
                <span>👤</span>
                <span>In Bearbeitung durch Lehrkraft</span>
              </span>
            ) : (
              <span style={{
                fontSize: '0.72rem',
                fontWeight: 800,
                background: '#fee2e2',
                color: '#dc2626',
                border: 'none',
                padding: '2px 8px',
                borderRadius: '100px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }} title="Sekretariat ist für die Benachrichtigung der Schüler verantwortlich">
                <span>🏢</span>
                <span>Handlungsbedarf Sekretariat</span>
              </span>
            )}

            {/* Passive Kontingent-Übersicht für das Sekretariat */}
            {(() => {
              const matchingToken = schoolMakeupTokens.find(tok => 
                tok.teacher_id === t.teacher_id && 
                tok.student_id === t.student_id && 
                tok.status !== 'CANCELLED_BY_TEACHER'
              );
              if (!matchingToken) return null;
              return (
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  background: matchingToken.status === 'FULLY_REDEEMED' ? '#d1fae5' : '#dbeafe',
                  color: matchingToken.status === 'FULLY_REDEEMED' ? '#047857' : '#1d4ed8',
                  border: 'none',
                  padding: '2px 8px',
                  borderRadius: '100px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }} title={`Lehrkraft hat Nachhol-Kontingent angelegt (${matchingToken.remaining_minutes}/${matchingToken.total_minutes} Min.)`}>
                  <span>🎟️</span>
                  <span>{matchingToken.status === 'FULLY_REDEEMED' ? 'Bereits nachgeholt' : `Nachhol-Kontingent (${matchingToken.remaining_minutes} Min.)`}</span>
                </span>
              );
            })()}
          </div>
          {urgency === 'RED' && (
            <div style={{ marginTop: '8px', fontSize: '0.72rem', fontWeight: 900, color: '#ef4444', background: '#fee2e2', padding: '6px 12px', borderRadius: '8px', width: 'fit-content', maxWidth: '100%', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldAlert size={14} color="#ef4444" style={{ flexShrink: 0 }} />
              <span>Ausfall in unter 2h — telefonischer Sofort-Kontakt empfohlen!</span>
            </div>
          )}
        </div>

        {/* Badge (Desktop/Tablet) */}
        {!isMobileView && (
          <span style={{
            padding: '6px 14px', borderRadius: '100px', flexShrink: 0,
            fontSize: '0.72rem', fontWeight: 900, whiteSpace: 'nowrap',
            background: m.badge, color: m.badgeText,
            boxShadow: 'none',
            display: 'flex', alignItems: 'center', gap: '6px'
          }}>
            <UrgencyIcon size={13} color={m.badgeText} />
            <span>{m.badgeLabel}</span>
          </span>
        )}

        {/* Action buttons – only in live mode */}
        {crisisTabMode === 'live' && (
          <div style={{ display: 'flex', gap: '8px', flexShrink: 0, alignItems: 'center', flexWrap: isMobileView ? 'wrap' : 'nowrap', width: isMobileView ? '100%' : 'auto' }}>
            {/* Falls Lehrkraft-Ticket: Button um Zuständigkeit aufs Sekretariat zu ziehen */}
            {t.handling_owner === 'teacher' && urgency !== 'GREEN' && handleClaimTicket && (
              <button
                type="button"
                onClick={() => handleClaimTicket(t.id)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                  flex: isMobileView ? '1 1 auto' : '0 0 auto',
                  minHeight: isMobileView ? '44px' : undefined,
                  background: '#f8fafc',
                  border: '1.5px solid #cbd5e1',
                  color: '#1e293b', borderRadius: '12px', padding: '8px 12px',
                  fontSize: '0.74rem', fontWeight: 800, cursor: 'pointer',
                  transition: 'all 0.15s', fontFamily: "'Plus Jakarta Sans', sans-serif",
                }}
                title="Sekretariat übernimmt die Kontaktaufnahme der Schüler"
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#94a3b8'; e.currentTarget.style.background = '#f1f5f9'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.background = '#f8fafc'; }}
              >
                <span>🏢</span>
                <span>Übernehmen</span>
              </button>
            )}

            {urgency !== 'GREEN' && (
              <button
                type="button"
                onClick={() => handleMarkAsNotified(t.id)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  flex: isMobileView ? '1 1 auto' : '0 0 auto',
                  minHeight: isMobileView ? '44px' : undefined,
                  background: '#34a853',
                  border: 'none',
                  color: 'white', borderRadius: '12px', padding: '8px 14px',
                  fontSize: '0.75rem', fontWeight: 900, cursor: 'pointer',
                  boxShadow: 'none',
                  transition: 'all 0.2s', fontFamily: "'Plus Jakarta Sans', sans-serif",
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                <CheckCircle size={14} /> Manuell grün melden
              </button>
            )}
            {urgency === 'GREEN' && (
              <button
                type="button"
                onClick={() => handleArchiveCrisisTicket(t.id)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  flex: isMobileView ? '1 1 auto' : '0 0 auto',
                  minHeight: isMobileView ? '44px' : undefined,
                  background: 'white', border: '1.5px solid #e2e8f0',
                  color: '#64748b', borderRadius: '12px', padding: '8px 14px',
                  fontSize: '0.75rem', fontWeight: 900, cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                  transition: 'all 0.2s', fontFamily: "'Plus Jakarta Sans', sans-serif",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#0f172a'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.color = '#64748b'; }}
              >
                <X size={14} /> Archivieren
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderAbsentTeachersCard = () => (
    <div style={{
      background: absentTeachers.length === 0
        ? '#ffffff'
        : '#fee2e2',
      border: absentTeachers.length === 0
        ? '1.5px solid #e2e8f0'
        : 'none',
      borderRadius: isMobileView ? '20px' : '24px',
      padding: isMobileView ? '16px' : '24px',
      display: 'flex',
      flexDirection: 'column',
      gap: isMobileView ? '12px' : '16px',
      boxShadow: absentTeachers.length === 0
        ? '0 8px 32px rgba(15, 23, 42, 0.03)'
        : 'none',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingBottom: isMobileView ? '10px' : '14px', borderBottom: absentTeachers.length === 0 ? '1px solid #e2e8f0' : '1px solid rgba(239, 68, 68, 0.15)' }}>
        <div style={{
          background: absentTeachers.length === 0 ? '#e6f4ea' : '#fee2e2',
          borderRadius: '12px', padding: '8px',
          border: 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          {absentTeachers.length === 0 ? (
            <UserCheck size={16} color="#34a853" />
          ) : (
            <UserX size={16} color="#ef4444" />
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <strong style={{ fontSize: '0.9rem', fontWeight: 950, color: absentTeachers.length === 0 ? '#1e293b' : '#7f1d1d', display: 'block', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Abwesenheiten
          </strong>
          <span style={{ fontSize: '0.72rem', color: absentTeachers.length === 0 ? '#64748b' : '#b91c1c', fontWeight: 600 }}>
            {absentTeachers.length === 0 ? 'Alle im Dienst' : 'Wählen zum Filtern'}
          </span>
        </div>
      </div>

      {absentTeachers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: isMobileView ? '12px 0' : '24px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
            <CheckCircle size={32} color="#34a853" />
          </div>
          <p style={{ margin: 0, fontSize: '0.82rem', color: '#475569', fontWeight: 700 }}>Alle Lehrkräfte aktiv im Dienst</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {absentTeachers.map((teacher: any) => {
            const count = crisisNotifications.filter(n => n.teacher?.id === teacher.id).length;
            const isSelected = selectedCrisisTeacherId === teacher.id;
            return (
              <div
                key={teacher.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedCrisisTeacherId(isSelected ? null : teacher.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedCrisisTeacherId(isSelected ? null : teacher.id);
                  }
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  background: isSelected ? '#ffffff' : 'white',
                  border: `1.5px solid ${isSelected ? '#ef4444' : '#e2e8f0'}`,
                  borderRadius: '16px', padding: '12px 14px',
                  cursor: 'pointer', transition: 'all 0.2s ease',
                  transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                  boxShadow: 'none',
                }}
              >
                <div style={{
                  width: '38px', height: '38px', borderRadius: '50%', flexShrink: 0,
                  background: '#fee2e2',
                  border: 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.9rem', fontWeight: 900,
                  color: '#ef4444',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                }}>
                  {teacher.first_name?.[0]?.toUpperCase() || 'L'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 900, fontSize: '0.85rem', color: '#7f1d1d', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    {formatTeacherFullName(teacher)}
                  </div>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '3px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#ef4444' }}>
                      {count} {count === 1 ? 'Fall' : 'Fälle'}
                    </span>
                    <span style={{ color: '#fca5a5', fontSize: '0.6rem' }}>&bull;</span>
                    <span style={{ fontSize: '0.72rem', color: '#b91c1c', fontWeight: 600 }}>{absenceDurStr(teacher.ausfall_until ?? teacher.ausfallUntil)}</span>
                  </div>
                </div>
                {/* Re-activate button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    effectiveEndAbsenceOnBehalf(teacher.id, formatTeacherFullName(teacher));
                  }}
                  title="Abwesenheit beenden (Stunden reaktivieren)"
                  style={{
                    background: '#ef4444', border: 'none',
                    borderRadius: '10px',
                    width: isTabletOrMobile ? '44px' : '36px',
                    height: isTabletOrMobile ? '44px' : '36px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', color: 'white', transition: 'all 0.15s',
                    flexShrink: 0,
                    boxShadow: 'none'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#dc2626'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#ef4444'; }}
                >
                  <UserCheck size={16} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {selectedCrisisTeacherId && (
        <button
          type="button"
          onClick={() => setSelectedCrisisTeacherId(null)}
          style={{
            background: 'white', border: '1.5px solid #e2e8f0',
            color: '#7f1d1d', fontSize: '0.78rem', cursor: 'pointer',
            padding: '10px 12px', minHeight: '44px', borderRadius: '12px', fontWeight: 800,
            width: '100%', transition: 'all 0.15s',
            fontFamily: "'Plus Jakarta Sans', sans-serif"
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#fee2e2'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'white'; }}
        >Filter aufheben ✕</button>
      )}
    </div>
  );

  const renderGuideCard = () => (
    <div style={{
      background: '#f8fafc',
      border: '1px solid #e2e8f0',
      borderRadius: isMobileView ? '20px' : '24px',
      padding: isMobileView ? '16px' : '24px',
      display: 'flex',
      flexDirection: 'column',
      gap: isMobileView ? '12px' : '16px',
      boxShadow: '0 10px 25px rgba(15, 23, 42, 0.03)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ background: '#fee2e2', borderRadius: '10px', padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <BookOpen size={16} color="#ef4444" />
        </div>
        <strong style={{ fontSize: '0.9rem', fontWeight: 900, color: '#1e293b', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          Anleitung: Operationscockpit
        </strong>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {[
          { icon: <AlertCircle size={14} color="#ef4444" />, title: 'Rot (Akut)', text: 'Ausfall in unter 2 Std. — Telefonischer Sofort-Kontakt dringend empfohlen!', bg: '#fee2e2' },
          { icon: <Clock size={14} color="#facc15" />, title: 'Gelb (Offen)', text: 'Schüler wurde digital benachrichtigt. Rückmeldung steht noch aus.', bg: '#fef9c3' },
          { icon: <CheckCircle size={14} color="#34a853" />, title: 'Grün (Erledigt)', text: 'Schüler wurde erfolgreich informiert (Kenntnisnahme bestätigt oder manuell gemeldet).', bg: '#e6f4ea' },
        ].map((item) => (
          <div key={item.title} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <div style={{ background: item.bg, borderRadius: '8px', padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
              {item.icon}
            </div>
            <div>
              <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#334155', display: 'block', marginBottom: '2px' }}>{item.title}</span>
              <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 550, lineHeight: 1.35, display: 'block' }}>{item.text}</span>
            </div>
          </div>
        ))}
      </div>

      <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '14px', marginTop: '4px' }}>
        <p style={{ margin: 0, fontSize: '0.72rem', color: '#64748b', lineHeight: 1.4, fontWeight: 550 }}>
          Das Operationscockpit unterstützt Sie bei Lehrerausfällen. Sobald Sie einen Schüler telefonisch kontaktiert haben, können Sie den Fall per Klick manuell auf <strong>Grün</strong> setzen. Nach Ablauf eines Tages werden erledigte Fälle automatisch ins Archiv übertragen.
        </p>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: isMobileView ? '16px' : '24px' }}>

      {/* ── TOP: KPI HEADER BAR (0,1% Goldstandard: 2x2 Grid on Mobile, 4-Column Grid on Tablet/Desktop) ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobileView ? 'repeat(2, minmax(0, 1fr))' : 'repeat(4, minmax(0, 1fr))',
          gap: isMobileView ? '12px' : '16px',
        }}
        className="animation-slide-up"
      >
        {/* KPI 1: Abwesende Lehrkräfte - Red */}
        <div style={{
          background: '#ef4444',
          color: 'white', borderRadius: isMobileView ? '20px' : '24px',
          padding: isMobileView ? '14px 15px' : '22px',
          minHeight: isMobileView ? '84px' : undefined,
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: isMobileView ? '6px' : '8px',
          boxShadow: 'none',
          border: 'none',
          backdropFilter: 'blur(20px)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '6px' }}>
            <span style={{ fontSize: isMobileView ? '0.62rem' : '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.9 }}>
              {isMobileView ? 'Abwesend' : 'Abwesende Lehrkräfte'}
            </span>
            <div style={{ background: 'rgba(255,255,255,0.2)', padding: isMobileView ? '5px' : '6px', borderRadius: isMobileView ? '8px' : '10px', flexShrink: 0 }}>
              <UserX size={isMobileView ? 13 : 15} color="white" />
            </div>
          </div>
          <div style={{ fontSize: isMobileView ? '1.5rem' : '2.2rem', fontWeight: 950, letterSpacing: '-0.02em', lineHeight: 1, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {absentTeachers.length}
          </div>
          <span style={{ fontSize: isMobileView ? '0.68rem' : '0.72rem', opacity: 0.9, fontWeight: 700 }}>
            {absentTeachers.length === 1 ? '1 Lehrkraft abwesend' : `${absentTeachers.length} Lehrkräfte abwesend`}
          </span>
        </div>

        {/* KPI 2: Offene Ausfälle - Yellow (Dark Slate-900 text for WCAG >12:1 contrast) */}
        <div style={{
          background: '#facc15',
          color: '#0f172a', borderRadius: isMobileView ? '20px' : '24px',
          padding: isMobileView ? '14px 15px' : '22px',
          minHeight: isMobileView ? '84px' : undefined,
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: isMobileView ? '6px' : '8px',
          boxShadow: 'none',
          border: 'none',
          backdropFilter: 'blur(20px)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '6px' }}>
            <span style={{ fontSize: isMobileView ? '0.62rem' : '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#1e293b' }}>
              Offene Ausfälle
            </span>
            <div style={{ background: 'rgba(15, 23, 42, 0.08)', padding: isMobileView ? '5px' : '6px', borderRadius: isMobileView ? '8px' : '10px', flexShrink: 0 }}>
              <ShieldAlert size={isMobileView ? 13 : 15} color="#0f172a" />
            </div>
          </div>
          <div style={{ fontSize: isMobileView ? '1.5rem' : '2.2rem', fontWeight: 950, letterSpacing: '-0.02em', lineHeight: 1, color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {unreadCount}
          </div>
          <span style={{ fontSize: isMobileView ? '0.68rem' : '0.72rem', color: '#1e293b', fontWeight: 700 }}>
            {unreadCount === 0 ? 'Alles im Plan ✓' : 'Info ausstehend'}
          </span>
        </div>

        {/* KPI 3: Erfolgreich informiert - Green */}
        <div style={{
          background: '#34a853',
          color: 'white', borderRadius: isMobileView ? '20px' : '24px',
          padding: isMobileView ? '14px 15px' : '22px',
          minHeight: isMobileView ? '84px' : undefined,
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: isMobileView ? '6px' : '8px',
          boxShadow: 'none',
          border: 'none',
          backdropFilter: 'blur(20px)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '6px' }}>
            <span style={{ fontSize: isMobileView ? '0.62rem' : '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.9 }}>
              {isMobileView ? 'Informiert' : 'Erfolgreich Informiert'}
            </span>
            <div style={{ background: 'rgba(255,255,255,0.2)', padding: isMobileView ? '5px' : '6px', borderRadius: isMobileView ? '8px' : '10px', flexShrink: 0 }}>
              <CheckCircle size={isMobileView ? 13 : 15} color="white" />
            </div>
          </div>
          <div style={{ fontSize: isMobileView ? '1.5rem' : '2.2rem', fontWeight: 950, letterSpacing: '-0.02em', lineHeight: 1, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {readCount}
          </div>
          <span style={{ fontSize: isMobileView ? '0.68rem' : '0.72rem', opacity: 0.9, fontWeight: 700 }}>Terminänderung zugestellt</span>
        </div>

        {/* KPI 4: Archiviert */}
        <div style={{
          background: '#475569',
          color: 'white', borderRadius: isMobileView ? '20px' : '24px',
          padding: isMobileView ? '14px 15px' : '22px',
          minHeight: isMobileView ? '84px' : undefined,
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: isMobileView ? '6px' : '8px',
          boxShadow: 'none',
          border: 'none',
          backdropFilter: 'blur(20px)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '6px' }}>
            <span style={{ fontSize: isMobileView ? '0.62rem' : '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.9 }}>
              {isMobileView ? 'Erledigt' : 'Erledigte Tagesfälle'}
            </span>
            <div style={{ background: 'rgba(255,255,255,0.2)', padding: isMobileView ? '5px' : '6px', borderRadius: isMobileView ? '8px' : '10px', flexShrink: 0 }}>
              <Clock size={isMobileView ? 13 : 15} color="white" />
            </div>
          </div>
          <div style={{ fontSize: isMobileView ? '1.5rem' : '2.2rem', fontWeight: 950, letterSpacing: '-0.02em', lineHeight: 1, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {archivedCount}
          </div>
          <span style={{ fontSize: isMobileView ? '0.68rem' : '0.72rem', opacity: 0.9, fontWeight: 700 }}>Tagesdisposition abgeschlossen</span>
        </div>
      </div>

      {/* ── MAIN CONTENT ROW (Responsive Split-Board: 1-Col on Mobile/iPad <=1180px, 2-Col on Desktop >1180px) ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isTabletOrMobile ? '1fr' : 'minmax(0, 1fr) 310px',
        gap: isMobileView ? '16px' : '24px',
        alignItems: 'start',
        minWidth: 0,
      }}>

        {/* LEFT: Ticket feed */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0 }}>

          {/* Section header + tab toggle */}
          <div style={{
            background: '#ffffff',
            backdropFilter: 'blur(24px) saturate(1.8)',
            WebkitBackdropFilter: 'blur(24px) saturate(1.8)',
            border: '1px solid rgba(255, 255, 255, 0.5)',
            borderRadius: isMobileView ? '20px' : '24px',
            padding: isMobileView ? '16px' : '18px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: isMobileView ? '12px' : '16px',
            flexWrap: 'wrap',
            boxShadow: '0 8px 32px rgba(15, 23, 42, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
              <div style={{
                background: '#ef4444',
                borderRadius: '14px', padding: '10px',
                boxShadow: 'none',
                flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyItems: 'center'
              }}>
                <ShieldAlert size={20} color="white" />
              </div>
              <div style={{ minWidth: 0 }}>
                <h3 style={{ margin: 0, fontSize: isMobileView ? '1.08rem' : '1.2rem', fontWeight: 950, color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif", display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <span>Operations-Cockpit</span>
                  {selectedCrisisTeacherId && <span style={{ color: '#ef4444', fontSize: '0.75rem', background: '#fee2e2', padding: '2px 10px', borderRadius: '100px', fontWeight: 800 }}>Gefiltert</span>}
                </h3>
                <p style={{ margin: '3px 0 0', fontSize: isMobileView ? '0.74rem' : '0.78rem', color: '#64748b', fontWeight: 600 }}>
                  Unterrichtsausfall-Kaskade &bull; Live-Abgleich mit Schülerbenachrichtigungen
                </p>
              </div>
            </div>

            {/* Tab Controls and Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', width: isMobileView ? '100%' : 'auto' }}>
              {crisisTabMode === 'live' && liveTickets.filter(n => getUrgency(n) === 'GREEN').length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    const greenIds = liveTickets.filter(n => getUrgency(n) === 'GREEN').map(t => t.id);
                    handleArchiveAllResolvedTickets(greenIds);
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    width: isMobileView ? '100%' : 'auto',
                    minHeight: isMobileView ? '44px' : undefined,
                    background: '#dcfce7', border: 'none',
                    color: '#15803d', borderRadius: '14px', padding: '8px 16px',
                    fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer',
                    fontFamily: "'Plus Jakarta Sans', sans-serif", transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#bbf7d0'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#dcfce7'; }}
                >
                  <Archive size={14} /> {liveTickets.filter(n => getUrgency(n) === 'GREEN').length} erledigte Ausfälle archivieren
                </button>
              )}

              {/* Live / Archiv toggle */}
              <div style={{
                display: 'flex', background: 'rgba(15, 23, 42, 0.04)', borderRadius: '14px',
                padding: '4px', gap: '4px', border: '1px solid rgba(0, 0, 0, 0.03)',
                backdropFilter: 'blur(8px)',
                width: isMobileView ? '100%' : 'auto',
              }}>
                {([['live', 'Aktive Fälle'], ['history', 'Historie & Archiv']] as const).map(([mode, label]) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setCrisisTabMode(mode)}
                    style={{
                      flex: isMobileView ? 1 : undefined,
                      padding: isMobileView ? '10px 12px' : '8px 18px', borderRadius: '10px', border: 'none',
                      fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer',
                      fontFamily: "'Plus Jakarta Sans', sans-serif", transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      background: crisisTabMode === mode ? 'white' : 'transparent',
                      color: crisisTabMode === mode ? '#0f172a' : '#64748b',
                      boxShadow: crisisTabMode === mode ? '0 4px 12px rgba(15, 23, 42, 0.08)' : 'none',
                    }}
                  >{label}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Mobile/Tablet inline Abwesenheiten Quick-Filter directly above the ticket feed */}
          {isTabletOrMobile && renderAbsentTeachersCard()}

          {/* Live mode view with conditions */}
          {crisisTabMode === 'live' && (() => {
            if (absentTeachers.length === 0) {
              return (
                <div style={{
                  background: '#ffffff',
                  backdropFilter: 'blur(24px)',
                  WebkitBackdropFilter: 'blur(24px)',
                  border: '1px solid rgba(255, 255, 255, 0.5)',
                  borderRadius: isMobileView ? '20px' : '24px',
                  padding: isMobileView ? '40px 20px' : '80px 40px', textAlign: 'center',
                  boxShadow: '0 8px 32px rgba(15, 23, 42, 0.04)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                    <CheckCircle size={isMobileView ? 48 : 56} color="#34a853" strokeWidth={1.5} />
                  </div>
                  <strong style={{ display: 'block', fontSize: isMobileView ? '1.1rem' : '1.25rem', fontWeight: 950, color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: '8px' }}>
                    Keine akuten Ausfälle
                  </strong>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', fontWeight: 600, maxWidth: '460px', marginInline: 'auto', lineHeight: 1.45 }}>
                    Derzeit sind alle Lehrkräfte aktiv im Dienst. Es liegen keine akuten Ausfälle vor.
                  </p>
                </div>
              );
            }

            if (liveTickets.length === 0) {
              return (
                <div style={{
                  background: '#ffffff',
                  backdropFilter: 'blur(24px)',
                  WebkitBackdropFilter: 'blur(24px)',
                  border: '1px solid rgba(255, 255, 255, 0.5)',
                  borderRadius: isMobileView ? '20px' : '24px',
                  padding: isMobileView ? '40px 20px' : '80px 40px', textAlign: 'center',
                  boxShadow: '0 8px 32px rgba(15, 23, 42, 0.04)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                    <Sparkles size={isMobileView ? 48 : 56} color="#facc15" strokeWidth={1.5} />
                  </div>
                  <strong style={{ display: 'block', fontSize: isMobileView ? '1.1rem' : '1.25rem', fontWeight: 950, color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: '8px' }}>
                    Keine kommenden Ausfälle
                  </strong>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', fontWeight: 600, maxWidth: '460px', marginInline: 'auto', lineHeight: 1.45 }}>
                    Es stehen derzeit keine zukünftigen Unterrichtsausfälle zur Absage an.
                  </p>
                </div>
              );
            }

            const todayDateStr = new Date().toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });
            
            const liveGroupsMap = new Map<string, any[]>();
            liveTickets.forEach(t => {
              const dVal = new Date(t.slot_start_datetime);
              const dateStr = dVal.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });
              if (!liveGroupsMap.has(dateStr)) {
                liveGroupsMap.set(dateStr, []);
              }
              liveGroupsMap.get(dateStr)!.push(t);
            });

            const liveGroups = Array.from(liveGroupsMap.entries()).map(([dateStr, tickets]) => {
              const firstTime = new Date(tickets[0].slot_start_datetime).getTime();
              return { dateStr, tickets, firstTime };
            }).sort((a, b) => a.firstTime - b.firstTime);

            const activeExpandedDay = expandedLiveDayStr || (liveGroups.some(g => g.dateStr === todayDateStr) ? todayDateStr : liveGroups[0]?.dateStr);

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {liveGroups.map(group => {
                  const isToday = group.dateStr === todayDateStr;
                  const isExpanded = activeExpandedDay === group.dateStr;
                  const total = group.tickets.length;
                  const pendingCount = group.tickets.filter(t => t.status === 'UNREAD').length;
                  const doneCount = total - pendingCount;

                  const headerBg = isToday
                    ? '#fef9c3'
                    : '#ffffff';
                  const headerBorder = isToday ? 'none' : '1.5px solid #cbd5e1';
                  const headerColor = isToday ? '#854d0e' : '#0f172a';
                  
                  return (
                    <div key={group.dateStr} style={{ display: 'flex', flexDirection: 'column' }}>
                      <div
                        role="button"
                        tabIndex={0}
                        aria-expanded={isExpanded}
                        onClick={() => setExpandedLiveDayStr(isExpanded ? 'NONE' : group.dateStr)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setExpandedLiveDayStr(isExpanded ? 'NONE' : group.dateStr);
                          }
                        }}
                        style={{
                          background: headerBg,
                          border: headerBorder,
                          borderBottom: isExpanded ? 'none' : headerBorder,
                          borderRadius: isExpanded ? '16px 16px 0 0' : '16px',
                          padding: isMobileView ? '14px 16px' : '16px 20px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '10px',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          position: 'relative',
                          zIndex: 2,
                        }}
                        onMouseEnter={e => {
                          if (!isToday) {
                            e.currentTarget.style.borderColor = '#ea4335';
                          }
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(15, 23, 42, 0.04)';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.borderColor = isToday ? 'transparent' : '#cbd5e1';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                          <div style={{
                            background: isToday ? '#fde047' : '#f1f5f9',
                            padding: '10px',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <Calendar size={20} color={isToday ? '#854d0e' : '#64748b'} />
                          </div>
                          <div>
                            <strong style={{ display: 'block', fontSize: '1rem', color: headerColor, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                               {group.dateStr} {isToday && '• Heute'}
                            </strong>
                            <span style={{ fontSize: '0.75rem', color: isToday ? '#854d0e' : '#64748b', fontWeight: 600 }}>
                              {total} Ausfälle geplant
                            </span>
                          </div>
                        </div>
                        
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.75rem', background: pendingCount > 0 ? (isToday ? '#fee2e2' : '#f1f5f9') : '#dcfce7', color: pendingCount > 0 ? '#dc2626' : '#15803d', padding: '4px 12px', borderRadius: '100px', fontWeight: 800 }}>
                            {pendingCount > 0 ? `${pendingCount} Ausstehend` : 'Alle informiert'}
                          </span>
                          {doneCount > 0 && (
                            <span style={{ fontSize: '0.75rem', background: '#dcfce7', color: '#15803d', padding: '4px 12px', borderRadius: '100px', fontWeight: 800 }}>
                              {doneCount} Erledigt
                            </span>
                          )}
                          <ChevronRight 
                            size={18} 
                            color={isToday ? '#854d0e' : '#64748b'}
                            style={{ 
                              transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                              transition: 'transform 0.2s ease',
                              marginLeft: '4px'
                            }} 
                          />
                        </div>
                      </div>

                      {isExpanded && (
                        <div style={{
                          background: '#f8fafc',
                          border: headerBorder,
                          borderTop: 'none',
                          borderRadius: '0 0 16px 16px',
                          padding: isMobileView ? '14px' : '20px',
                          zIndex: 1,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px',
                          boxShadow: '0 4px 12px rgba(15, 23, 42, 0.02)'
                        }}>
                          {group.tickets.map(t => (
                            <TicketCard key={t.id} t={t} />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* Ticket list – ARCHIVE mode (Collapsible Accordion Layout) */}
          {crisisTabMode === 'history' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {archiveGroups.length === 0 ? (
                <div style={{
                  background: '#ffffff',
                  backdropFilter: 'blur(24px)',
                  border: '1px solid rgba(255, 255, 255, 0.5)',
                  borderRadius: isMobileView ? '20px' : '24px',
                  padding: isMobileView ? '40px 20px' : '60px 40px', textAlign: 'center',
                  boxShadow: '0 8px 32px rgba(15, 23, 42, 0.04)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                    <ClipboardList size={isMobileView ? 48 : 56} color="#94a3b8" strokeWidth={1.5} />
                  </div>
                  <strong style={{ display: 'block', fontSize: isMobileView ? '1.1rem' : '1.25rem', color: '#0f172a', marginBottom: '8px' }}>
                    Keine archivierten Einträge
                  </strong>
                </div>
              ) : (
                archiveGroups.map(group => {
                  const total = group.tickets.length;
                  const successCount = group.tickets.filter(t => t.status === 'READ' || t.notified_at).length;
                  const failedCount = total - successCount;
                  const teacherName = group.teacher ? formatTeacherFullName(group.teacher) : 'Lehrkraft';
                  const isExpanded = selectedArchiveLog?.date === group.date && selectedArchiveLog?.teacher?.id === group.teacher?.id;

                  return (
                    <div key={`${group.date}_${group.teacher?.id}`} style={{ display: 'flex', flexDirection: 'column' }}>
                      <div 
                        role="button"
                        tabIndex={0}
                        aria-expanded={isExpanded}
                        onClick={() => setSelectedArchiveLog(isExpanded ? null : group)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setSelectedArchiveLog(isExpanded ? null : group);
                          }
                        }}
                        style={{
                          background: 'white',
                          border: '1.5px solid #cbd5e1',
                          borderBottom: isExpanded ? 'none' : '1.5px solid #cbd5e1',
                          borderRadius: isExpanded ? '16px 16px 0 0' : '16px',
                          padding: isMobileView ? '14px 16px' : '16px 20px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '10px',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          position: 'relative',
                          zIndex: 2,
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.borderColor = '#ef4444';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(15, 23, 42, 0.04)';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.borderColor = '#cbd5e1';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                          <div style={{ background: '#f1f5f9', padding: '10px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <BookOpen size={20} color="#ef4444" />
                          </div>
                          <div>
                            <strong style={{ display: 'block', fontSize: '0.95rem', color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                              {group.date} &bull; {teacherName}
                            </strong>
                            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
                              Abwesenheit: {absenceDurStr(group.teacher?.ausfall_until ?? group.teacher?.ausfallUntil)}
                            </span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.75rem', background: '#dcfce7', color: '#15803d', padding: '4px 10px', borderRadius: '100px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Check size={12} /> {successCount} Schüler erreicht
                          </span>
                          <span style={{ fontSize: '0.75rem', background: failedCount > 0 ? '#fee2e2' : '#f1f5f9', color: failedCount > 0 ? '#b91c1c' : '#64748b', padding: '4px 10px', borderRadius: '100px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {failedCount > 0 ? <><X size={12} /> {failedCount} nicht erreicht</> : 'Alle erreicht'}
                          </span>
                          {(() => {
                            const successRate = total > 0 ? Math.round((successCount / total) * 100) : 100;
                            const rateBg = successRate >= 80 ? '#dcfce7' : successRate >= 50 ? '#fef9c3' : '#fee2e2';
                            const rateColor = successRate >= 80 ? '#15803d' : successRate >= 50 ? '#854d0e' : '#b91c1c';
                            return (
                              <span style={{ fontSize: '0.75rem', background: rateBg, color: rateColor, padding: '4px 10px', borderRadius: '100px', fontWeight: 900 }}>
                                {successRate}% Erfolgsquote
                              </span>
                            );
                          })()}
                          <ChevronRight 
                            size={18} 
                            color="#64748b" 
                            style={{ 
                              transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                              transition: 'transform 0.2s ease',
                              marginLeft: '4px'
                            }} 
                          />
                        </div>
                      </div>

                      {/* Collapsible inline details panel */}
                      {isExpanded && (
                        <div style={{
                          background: '#f8fafc',
                          border: '1.5px solid #cbd5e1',
                          borderTop: 'none',
                          borderRadius: '0 0 16px 16px',
                          padding: isMobileView ? '14px' : '16px 20px',
                          zIndex: 1,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px',
                          boxShadow: '0 4px 12px rgba(15, 23, 42, 0.02)'
                        }}>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px', paddingBottom: '6px', borderBottom: '1px solid #e2e8f0' }}>
                            Betroffene Unterrichtsstunden und Benachrichtigungsstatus:
                          </div>
                          {group.tickets.map((t: any) => {
                            const isSuccess = t.status === 'READ' || t.notified_at;
                            const sName = t.student ? `${t.student.first_name} ${t.student.last_name}` : 'Unbekannter Schüler';
                            const tStr = new Date(t.slot_start_datetime).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
                            
                            return (
                              <div 
                                key={t.id} 
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  flexWrap: 'wrap',
                                  gap: '8px',
                                  background: isSuccess ? '#dcfce7' : '#fee2e2',
                                  border: 'none',
                                  borderRadius: '12px',
                                  padding: '10px 14px'
                                }}
                              >
                                <div>
                                  <strong style={{ display: 'block', fontSize: '0.85rem', color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                                    {sName}
                                  </strong>
                                  <span style={{ fontSize: '0.72rem', color: '#475569', fontWeight: 600 }}>
                                    {t.student?.instrument || 'Musikunterricht'} &bull; {tStr} Uhr
                                  </span>
                                </div>
                                <span style={{
                                  fontSize: '0.72rem',
                                  fontWeight: 800,
                                  color: isSuccess ? '#15803d' : '#dc2626',
                                  background: isSuccess ? '#dcfce7' : '#fee2e2',
                                  padding: '4px 10px',
                                  borderRadius: '100px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}>
                                  {isSuccess ? <><Check size={12} /> Erfolgreich informiert</> : <><X size={12} /> Nicht rechtzeitig informiert</>}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Mobile/Tablet: Guide Card sits cleanly below the active feed */}
          {isTabletOrMobile && renderGuideCard()}

        </div>

        {/* RIGHT SIDEBAR (Desktop > 1180px only) */}
        {!isTabletOrMobile && (
          <div style={{ width: '310px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {renderAbsentTeachersCard()}
            {renderGuideCard()}
          </div>
        )}
      </div>
    </div>
  );
};
