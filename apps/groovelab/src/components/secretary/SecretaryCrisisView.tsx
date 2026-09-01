import React from 'react';
import { 
  ShieldAlert, UserX, UserCheck, Clock, CheckCircle, CheckCircle2, 
  Archive, Calendar, Sparkles, ChevronRight, BookOpen, Check, X, 
  ClipboardList, AlertCircle 
} from 'lucide-react';
import { formatTeacherFullName } from '../../utils/nameHelper';

interface CrisisNotificationItem {
  id: string;
  slot_start_datetime: string;
  status: 'UNREAD' | 'READ' | 'ARCHIVED';
  notified_at?: string;
  teacher_id?: string;
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
    sick_until?: string | null;
  };
}

interface SecretaryCrisisViewProps {
  crisisNotifications: CrisisNotificationItem[];
  crisisTabMode: 'live' | 'history';
  setCrisisTabMode: (mode: 'live' | 'history') => void;
  selectedCrisisTeacherId: string | null;
  setSelectedCrisisTeacherId: (id: string | null) => void;
  handleMarkAsNotified: (id: string) => Promise<void> | void;
  handleArchiveCrisisTicket: (id: string) => Promise<void> | void;
  handleArchiveAllResolvedTickets: (ids: string[]) => Promise<void> | void;
  handleEndSickOnBehalf: (teacherId: string, teacherName: string) => Promise<void> | void;
  expandedLiveDayStr: string | null;
  setExpandedLiveDayStr: (day: string | null) => void;
  selectedArchiveLog: any;
  setSelectedArchiveLog: (log: any) => void;
}

export const SecretaryCrisisView: React.FC<SecretaryCrisisViewProps> = ({
  crisisNotifications,
  crisisTabMode,
  setCrisisTabMode,
  selectedCrisisTeacherId,
  setSelectedCrisisTeacherId,
  handleMarkAsNotified,
  handleArchiveCrisisTicket,
  handleArchiveAllResolvedTickets,
  handleEndSickOnBehalf,
  expandedLiveDayStr,
  setExpandedLiveDayStr,
  selectedArchiveLog,
  setSelectedArchiveLog,
}) => {
  const now = new Date();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  // ── Derived data ──
  const sickTeachersMap = new Map<string, any>();
  crisisNotifications.forEach(n => {
    if (n.teacher && n.teacher.sick_until) {
      const sickUntilTime = new Date(n.teacher.sick_until).getTime();
      if (sickUntilTime >= todayStart.getTime()) {
        sickTeachersMap.set(n.teacher.id, n.teacher);
      }
    }
  });
  const sickTeachers = Array.from(sickTeachersMap.values());

  const liveTickets = crisisNotifications.filter(n => {
    const isPast = new Date(n.slot_start_datetime).getTime() < todayStart.getTime();
    if (n.status === 'ARCHIVED' || isPast) return false;
    if (!n.teacher || !n.teacher.sick_until) return false;
    const sickUntilTime = new Date(n.teacher.sick_until).getTime();
    return sickUntilTime >= todayStart.getTime();
  });
  const todayEnd = new Date(todayStart);
  todayEnd.setHours(23, 59, 59, 999);
  const todayTickets = liveTickets.filter(n => {
    const time = new Date(n.slot_start_datetime).getTime();
    return time >= todayStart.getTime() && time <= todayEnd.getTime();
  });
  const archiveTickets = crisisNotifications.filter(n => {
    const isPast = new Date(n.slot_start_datetime).getTime() < todayStart.getTime();
    const isHealthy = !n.teacher || !n.teacher.sick_until || new Date(n.teacher.sick_until).getTime() < todayStart.getTime();
    return n.status === 'ARCHIVED' || isPast || isHealthy;
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

  // ── Helper: sick duration string ──
  const sickDurStr = (v: string | null | undefined) => {
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
      RED:    { leftBar: '#ef4444', bg: 'linear-gradient(135deg, rgba(254, 242, 242, 0.75) 0%, rgba(254, 226, 226, 0.45) 100%)', border: 'rgba(239, 68, 68, 0.25)', badge: '#ef4444', badgeText: 'white', badgeLabel: 'Akuter Ausfall', icon: ShieldAlert, dot: '#ef4444' },
      YELLOW: { leftBar: '#f59e0b', bg: 'linear-gradient(135deg, rgba(255, 251, 235, 0.75) 0%, rgba(254, 243, 199, 0.45) 100%)', border: 'rgba(245, 158, 11, 0.25)', badge: '#f59e0b', badgeText: 'white', badgeLabel: 'Ausstehend', icon: Clock, dot: '#f59e0b' },
      GREEN:  { leftBar: '#34a853', bg: 'linear-gradient(135deg, rgba(230, 244, 234, 0.75) 0%, rgba(230, 244, 234, 0.45) 100%)', border: 'rgba(52, 168, 83, 0.25)', badge: '#34a853', badgeText: 'white', badgeLabel: 'Informiert', icon: CheckCircle2, dot: '#34a853' },
    };
    const m = urgencyMeta[urgency] || urgencyMeta['GREEN'];
    const UrgencyIcon = m.icon;

    return (
      <div key={t.id} style={{
        background: m.bg,
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: `1px solid ${m.border}`,
        borderLeft: `5px solid ${m.leftBar}`,
        borderRadius: '20px',
        padding: '18px 22px',
        display: 'flex',
        alignItems: 'center',
        gap: '18px',
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: '0 8px 32px rgba(15, 23, 42, 0.03)',
      }} className="hover-scale">
        <div style={{
          width: '10px', height: '10px', borderRadius: '50%',
          background: m.dot, flexShrink: 0,
          position: 'relative',
          boxShadow: urgency === 'RED' ? '0 0 10px rgba(239,68,68,0.6)' : 'none',
        }}>
          {urgency === 'RED' && (
            <div style={{
              position: 'absolute', inset: -4, borderRadius: '50%',
              border: '2px solid #ef4444', animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite'
            }} />
          )}
        </div>

        {/* Main info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
            <span style={{ fontSize: '1rem', fontWeight: 900, color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {studentName}
            </span>
            <span style={{
              fontSize: '0.68rem', fontWeight: 800, background: 'rgba(15, 23, 42, 0.06)',
              color: '#475569', padding: '3px 10px', borderRadius: '100px',
              backdropFilter: 'blur(4px)'
            }}>{subject}</span>
          </div>
          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 600 }}>
              <Calendar size={13} style={{ color: '#475569' }} /> {dateStr}
            </span>
            <span style={{ fontSize: '0.8rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 600 }}>
              <Clock size={13} style={{ color: '#475569' }} /> {timeStr} Uhr
            </span>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
              Lehrkraft: <strong style={{ color: '#0f172a', fontWeight: 700 }}>{teacherName}</strong>
            </span>
          </div>
          {urgency === 'RED' && (
            <div style={{ marginTop: '8px', fontSize: '0.72rem', fontWeight: 900, color: '#ef4444', background: '#fee2e2', padding: '6px 12px', borderRadius: '8px', width: 'fit-content', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldAlert size={14} color="#ef4444" />
              <span>Ausfall in unter 2h — telefonischer Sofort-Kontakt empfohlen!</span>
            </div>
          )}
        </div>

        {/* Badge */}
        <span style={{
          padding: '6px 14px', borderRadius: '100px', flexShrink: 0,
          fontSize: '0.72rem', fontWeight: 900, whiteSpace: 'nowrap',
          background: m.badge, color: m.badgeText,
          boxShadow: `0 4px 14px ${m.badge}35`,
          display: 'flex', alignItems: 'center', gap: '6px'
        }}>
          <UrgencyIcon size={13} color="white" />
          <span>{m.badgeLabel}</span>
        </span>

        {/* Action buttons – only in live mode */}
        {crisisTabMode === 'live' && (
          <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
            {urgency !== 'GREEN' && (
              <button
                onClick={() => handleMarkAsNotified(t.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  background: 'linear-gradient(135deg, #34a853 0%, #34a853 100%)',
                  border: 'none',
                  color: 'white', borderRadius: '12px', padding: '8px 14px',
                  fontSize: '0.75rem', fontWeight: 900, cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(52,168,83,0.2)',
                  transition: 'all 0.2s', fontFamily: "'Plus Jakarta Sans', sans-serif",
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(52,168,83,0.3)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(52,168,83,0.2)'; }}
              >
                <CheckCircle size={14} /> Manuell grün melden
              </button>
            )}
            {urgency === 'GREEN' && (
              <button
                onClick={() => handleArchiveCrisisTicket(t.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* ── TOP: KPI HEADER BAR ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }} className="animation-slide-up">
        {/* KPI 1: Kranke Lehrkräfte - Red */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.95) 0%, rgba(220, 38, 38, 0.95) 100%)',
          color: 'white', borderRadius: '24px', padding: '22px',
          display: 'flex', flexDirection: 'column', gap: '8px',
          boxShadow: '0 12px 30px -5px rgba(239, 68, 68, 0.35)',
          border: '1px solid rgba(255,255,255,0.2)',
          backdropFilter: 'blur(20px)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.85 }}>
              Kranke Lehrkräfte
            </span>
            <div style={{ background: 'rgba(255,255,255,0.2)', padding: '6px', borderRadius: '10px' }}>
              <UserX size={15} color="white" />
            </div>
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: 950, letterSpacing: '-0.02em', lineHeight: 1, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {sickTeachers.length}
          </div>
          <span style={{ fontSize: '0.72rem', opacity: 0.85, fontWeight: 600 }}>
            {sickTeachers.length === 1 ? '1 Lehrkraft abwesend' : `${sickTeachers.length} Lehrkräfte abwesend`}
          </span>
        </div>

        {/* KPI 2: Offene Ausfälle - Yellow */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(250, 204, 21, 0.95) 0%, rgba(234, 179, 8, 0.95) 100%)',
          color: 'white', borderRadius: '24px', padding: '22px',
          display: 'flex', flexDirection: 'column', gap: '8px',
          boxShadow: '0 12px 30px -5px rgba(234, 179, 8, 0.35)',
          border: '1px solid rgba(255,255,255,0.2)',
          backdropFilter: 'blur(20px)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.85 }}>
              Offene Ausfälle
            </span>
            <div style={{ background: 'rgba(255,255,255,0.2)', padding: '6px', borderRadius: '10px' }}>
              <ShieldAlert size={15} color="white" />
            </div>
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: 950, letterSpacing: '-0.02em', lineHeight: 1, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {unreadCount}
          </div>
          <span style={{ fontSize: '0.72rem', opacity: 0.85, fontWeight: 600 }}>
            {unreadCount === 0 ? 'Exzellent — Alles im Plan' : 'Benachrichtigung ausstehend'}
          </span>
        </div>

        {/* KPI 3: Erfolgreich informiert - Green */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(52, 168, 83, 0.95) 0%, rgba(19, 115, 51, 0.95) 100%)',
          color: 'white', borderRadius: '24px', padding: '22px',
          display: 'flex', flexDirection: 'column', gap: '8px',
          boxShadow: '0 12px 30px -5px rgba(52, 168, 83, 0.3)',
          border: '1px solid rgba(255,255,255,0.2)',
          backdropFilter: 'blur(20px)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.85 }}>
              Erfolgreich Informiert
            </span>
            <div style={{ background: 'rgba(255,255,255,0.2)', padding: '6px', borderRadius: '10px' }}>
              <CheckCircle size={15} color="white" />
            </div>
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: 950, letterSpacing: '-0.02em', lineHeight: 1, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {readCount}
          </div>
          <span style={{ fontSize: '0.72rem', opacity: 0.85, fontWeight: 600 }}>Terminänderung zugestellt</span>
        </div>

        {/* KPI 4: Archiviert */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(100, 116, 139, 0.95) 0%, rgba(71, 85, 105, 0.95) 100%)',
          color: 'white', borderRadius: '24px', padding: '22px',
          display: 'flex', flexDirection: 'column', gap: '8px',
          boxShadow: '0 12px 30px -5px rgba(100,116,139,0.25)',
          border: '1px solid rgba(255,255,255,0.2)',
          backdropFilter: 'blur(20px)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.85 }}>
              Archivierte Fälle
            </span>
            <div style={{ background: 'rgba(255,255,255,0.2)', padding: '6px', borderRadius: '10px' }}>
              <Clock size={15} color="white" />
            </div>
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: 950, letterSpacing: '-0.02em', lineHeight: 1, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {archivedCount}
          </div>
          <span style={{ fontSize: '0.72rem', opacity: 0.85, fontWeight: 600 }}>Protokollierte Historie</span>
        </div>
      </div>

      {/* ── MAIN CONTENT ROW ── */}
      <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>

        {/* LEFT: Ticket feed */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0 }}>

          {/* Section header + tab toggle */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.72) 0%, rgba(255, 255, 255, 0.40) 100%)',
            backdropFilter: 'blur(24px) saturate(1.8)',
            WebkitBackdropFilter: 'blur(24px) saturate(1.8)',
            border: '1px solid rgba(255, 255, 255, 0.5)',
            borderRadius: '24px',
            padding: '18px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            flexWrap: 'wrap',
            boxShadow: '0 8px 32px rgba(15, 23, 42, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                borderRadius: '14px', padding: '10px',
                boxShadow: '0 6px 20px rgba(239,68,68,0.25)',
                display: 'flex', alignItems: 'center', justifyItems: 'center'
              }}>
                <ShieldAlert size={20} color="white" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 950, color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  Operations-Cockpit
                  {selectedCrisisTeacherId && <span style={{ color: '#ef4444', fontSize: '0.78rem', marginLeft: '10px', background: '#fee2e2', padding: '2px 10px', borderRadius: '100px', fontWeight: 800 }}>Gefiltert</span>}
                </h3>
                <p style={{ margin: '3px 0 0', fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
                  Lehrerausfall-Kaskade &bull; Live-Abgleich mit Schülerbenachrichtigungen
                </p>
              </div>
            </div>

            {/* Tab Controls and Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {crisisTabMode === 'live' && liveTickets.filter(n => getUrgency(n) === 'GREEN').length > 0 && (
                <button
                  onClick={() => {
                    const greenIds = liveTickets.filter(n => getUrgency(n) === 'GREEN').map(t => t.id);
                    handleArchiveAllResolvedTickets(greenIds);
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    background: 'rgba(52, 168, 83, 0.08)', border: '1.5px solid rgba(52, 168, 83, 0.25)',
                    color: '#34a853', borderRadius: '14px', padding: '8px 16px',
                    fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer',
                    fontFamily: "'Plus Jakarta Sans', sans-serif", transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(52, 168, 83, 0.15)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(52, 168, 83, 0.08)'; }}
                >
                  <Archive size={14} /> {liveTickets.filter(n => getUrgency(n) === 'GREEN').length} erledigte Ausfälle archivieren
                </button>
              )}

              {/* Live / Archiv toggle */}
              <div style={{
                display: 'flex', background: 'rgba(15, 23, 42, 0.04)', borderRadius: '14px',
                padding: '4px', gap: '4px', border: '1px solid rgba(0, 0, 0, 0.03)',
                backdropFilter: 'blur(8px)'
              }}>
                {([['live', 'Aktive Fälle'], ['history', 'Historie & Archiv']] as const).map(([mode, label]) => (
                  <button
                    key={mode}
                    onClick={() => setCrisisTabMode(mode)}
                    style={{
                      padding: '8px 18px', borderRadius: '10px', border: 'none',
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

          {/* Live mode view with conditions */}
          {crisisTabMode === 'live' && (() => {
            if (sickTeachers.length === 0) {
              return (
                <div style={{
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.72) 0%, rgba(255, 255, 255, 0.40) 100%)',
                  backdropFilter: 'blur(24px)',
                  WebkitBackdropFilter: 'blur(24px)',
                  border: '1px solid rgba(255, 255, 255, 0.5)',
                  borderRadius: '24px',
                  padding: '80px 40px', textAlign: 'center',
                  boxShadow: '0 8px 32px rgba(15, 23, 42, 0.04)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
                    <CheckCircle size={56} color="#34a853" strokeWidth={1.5} />
                  </div>
                  <strong style={{ display: 'block', fontSize: '1.25rem', fontWeight: 950, color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: '8px' }}>
                    Keine akuten Krankmeldungen
                  </strong>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', fontWeight: 600, maxWidth: '460px', marginInline: 'auto', lineHeight: 1.4 }}>
                    Derzeit sind alle Lehrkräfte aktiv im Dienst. Es liegen keine akuten Ausfälle vor.
                  </p>
                </div>
              );
            }

            if (liveTickets.length === 0) {
              return (
                <div style={{
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.72) 0%, rgba(255, 255, 255, 0.40) 100%)',
                  backdropFilter: 'blur(24px)',
                  WebkitBackdropFilter: 'blur(24px)',
                  border: '1px solid rgba(255, 255, 255, 0.5)',
                  borderRadius: '24px',
                  padding: '80px 40px', textAlign: 'center',
                  boxShadow: '0 8px 32px rgba(15, 23, 42, 0.04)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
                    <Sparkles size={56} color="#f59e0b" strokeWidth={1.5} />
                  </div>
                  <strong style={{ display: 'block', fontSize: '1.25rem', fontWeight: 950, color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: '8px' }}>
                    Keine kommenden Ausfälle
                  </strong>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', fontWeight: 600, maxWidth: '460px', marginInline: 'auto', lineHeight: 1.4 }}>
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
                    ? 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)'
                    : '#ffffff';
                  const headerBorder = isToday ? '1.5px solid #fde047' : '1.5px solid #cbd5e1';
                  const headerColor = isToday ? '#78350f' : '#0f172a';
                  
                  return (
                    <div key={group.dateStr} style={{ display: 'flex', flexDirection: 'column' }}>
                      <div
                        onClick={() => setExpandedLiveDayStr(isExpanded ? 'NONE' : group.dateStr)}
                        style={{
                          background: headerBg,
                          border: headerBorder,
                          borderBottom: isExpanded ? 'none' : headerBorder,
                          borderRadius: isExpanded ? '16px 16px 0 0' : '16px',
                          padding: '16px 20px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
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
                          e.currentTarget.style.borderColor = isToday ? '#fcd34d' : '#cbd5e1';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                          <div style={{
                            background: isToday ? '#fef3c7' : '#f1f5f9',
                            padding: '10px',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <Calendar size={20} color={isToday ? '#d97706' : '#64748b'} />
                          </div>
                          <div>
                            <strong style={{ display: 'block', fontSize: '1rem', color: headerColor, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                              {group.dateStr} {isToday && '• Heute'}
                            </strong>
                            <span style={{ fontSize: '0.75rem', color: isToday ? '#92400e' : '#64748b', fontWeight: 600 }}>
                              {total} Ausfälle geplant
                            </span>
                          </div>
                        </div>
                        
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.78rem', background: pendingCount > 0 ? (isToday ? '#fee2e2' : '#f1f5f9') : '#e6f4ea', color: pendingCount > 0 ? '#dc2626' : '#34a853', padding: '4px 12px', borderRadius: '100px', fontWeight: 800 }}>
                            {pendingCount > 0 ? `${pendingCount} Ausstehend` : 'Alle informiert'}
                          </span>
                          {doneCount > 0 && (
                            <span style={{ fontSize: '0.78rem', background: '#e6f4ea', color: '#34a853', padding: '4px 12px', borderRadius: '100px', fontWeight: 800 }}>
                              {doneCount} Erledigt
                            </span>
                          )}
                          <ChevronRight 
                            size={18} 
                            color={isToday ? '#92400e' : '#64748b'}
                            style={{ 
                              transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                              transition: 'transform 0.2s ease',
                              marginLeft: '8px'
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
                          padding: '20px',
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
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.72) 0%, rgba(255, 255, 255, 0.40) 100%)',
                  backdropFilter: 'blur(24px)',
                  border: '1px solid rgba(255, 255, 255, 0.5)',
                  borderRadius: '24px',
                  padding: '60px 40px', textAlign: 'center',
                  boxShadow: '0 8px 32px rgba(15, 23, 42, 0.04)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
                    <ClipboardList size={56} color="#94a3b8" strokeWidth={1.5} />
                  </div>
                  <strong style={{ display: 'block', fontSize: '1.25rem', color: '#0f172a', marginBottom: '8px' }}>
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
                        onClick={() => setSelectedArchiveLog(isExpanded ? null : group)}
                        style={{
                          background: 'white',
                          border: '1.5px solid #cbd5e1',
                          borderBottom: isExpanded ? 'none' : '1.5px solid #cbd5e1',
                          borderRadius: isExpanded ? '16px 16px 0 0' : '16px',
                          padding: '16px 20px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          position: 'relative',
                          zIndex: 2,
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.borderColor = '#ea4335';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(15, 23, 42, 0.04)';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.borderColor = '#cbd5e1';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                          <div style={{ background: '#f1f5f9', padding: '10px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <BookOpen size={20} color="#ea4335" />
                          </div>
                          <div>
                            <strong style={{ display: 'block', fontSize: '0.95rem', color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                              {group.date} &bull; {teacherName}
                            </strong>
                            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
                              Krankmeldung: {sickDurStr(group.teacher?.sick_until)}
                            </span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.78rem', background: '#e6f4ea', color: '#34a853', padding: '4px 10px', borderRadius: '100px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Check size={12} /> {successCount} Schüler erreicht
                          </span>
                          <span style={{ fontSize: '0.78rem', background: failedCount > 0 ? '#fce8e6' : '#f1f5f9', color: failedCount > 0 ? '#c5221f' : '#64748b', padding: '4px 10px', borderRadius: '100px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {failedCount > 0 ? <><X size={12} /> {failedCount} nicht erreicht</> : 'Alle erreicht'}
                          </span>
                          {(() => {
                            const successRate = total > 0 ? Math.round((successCount / total) * 100) : 100;
                            const rateBg = successRate >= 80 ? '#e6f4ea' : successRate >= 50 ? '#fef3c7' : '#fee2e2';
                            const rateColor = successRate >= 80 ? '#34a853' : successRate >= 50 ? '#92400e' : '#991b1b';
                            return (
                              <span style={{ fontSize: '0.78rem', background: rateBg, color: rateColor, padding: '4px 10px', borderRadius: '100px', fontWeight: 900 }}>
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
                              marginLeft: '8px'
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
                          padding: '16px 20px',
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
                                  background: isSuccess ? '#e6f4ea' : '#fef2f2',
                                  border: `1px solid ${isSuccess ? '#e6f4ea' : '#fca5a5'}`,
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
                                  color: isSuccess ? '#34a853' : '#dc2626',
                                  background: isSuccess ? '#e6f4ea' : '#fee2e2',
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

        </div>

        {/* RIGHT SIDEBAR */}
        <div style={{ width: '310px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Sick teacher list */}
          <div style={{
            background: sickTeachers.length === 0
              ? '#ffffff'
              : 'linear-gradient(135deg, rgba(254, 242, 242, 0.95) 0%, rgba(254, 226, 226, 0.95) 100%)',
            border: sickTeachers.length === 0
              ? '1.5px solid #e2e8f0'
              : '1.5px solid #fca5a5',
            borderRadius: '24px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            boxShadow: sickTeachers.length === 0
              ? '0 8px 32px rgba(15, 23, 42, 0.03)'
              : '0 8px 32px rgba(239, 68, 68, 0.04)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingBottom: '14px', borderBottom: sickTeachers.length === 0 ? '1px solid #e2e8f0' : '1px solid rgba(239, 68, 68, 0.15)' }}>
              <div style={{
                background: sickTeachers.length === 0 ? '#e6f4ea' : '#fee2e2',
                borderRadius: '12px', padding: '8px',
                border: sickTeachers.length === 0 ? '1px solid #e6f4ea' : '1px solid #fca5a5',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                {sickTeachers.length === 0 ? (
                  <UserCheck size={16} color="#34a853" />
                ) : (
                  <UserX size={16} color="#ef4444" />
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <strong style={{ fontSize: '0.9rem', fontWeight: 950, color: sickTeachers.length === 0 ? '#1e293b' : '#7f1d1d', display: 'block', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  Krankmeldungen
                </strong>
                <span style={{ fontSize: '0.72rem', color: sickTeachers.length === 0 ? '#64748b' : '#b91c1c', fontWeight: 600 }}>
                  {sickTeachers.length === 0 ? 'Alle im Dienst' : 'Wählen zum Filtern'}
                </span>
              </div>
            </div>

            {sickTeachers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
                  <CheckCircle size={32} color="#34a853" />
                </div>
                <p style={{ margin: 0, fontSize: '0.82rem', color: '#7f1d1d', fontWeight: 700 }}>Alle Lehrkräfte aktiv im Dienst</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {sickTeachers.map((teacher: any) => {
                  const count = crisisNotifications.filter(n => n.teacher?.id === teacher.id).length;
                  const isSelected = selectedCrisisTeacherId === teacher.id;
                  return (
                    <div
                      key={teacher.id}
                      onClick={() => setSelectedCrisisTeacherId(isSelected ? null : teacher.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '12px',
                        background: isSelected ? '#fff5f5' : 'white',
                        border: `1.5px solid ${isSelected ? '#ef4444' : '#fca5a5'}`,
                        borderRadius: '16px', padding: '12px 14px',
                        cursor: 'pointer', transition: 'all 0.2s ease',
                        transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                        boxShadow: isSelected ? '0 8px 20px rgba(239,68,68,0.08)' : '0 2px 4px rgba(239, 68, 68, 0.02)',
                      }}
                    >
                      <div style={{
                        width: '38px', height: '38px', borderRadius: '50%', flexShrink: 0,
                        background: 'linear-gradient(135deg, #fef2f2, #fee2e2)',
                        border: '2px solid #fecaca',
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
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '3px' }}>
                          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#ef4444' }}>
                            {count} {count === 1 ? 'Fall' : 'Fälle'}
                          </span>
                          <span style={{ color: '#fca5a5', fontSize: '0.6rem' }}>&bull;</span>
                          <span style={{ fontSize: '0.72rem', color: '#b91c1c', fontWeight: 600 }}>{sickDurStr(teacher.sick_until)}</span>
                        </div>
                      </div>
                      {/* Re-activate / Gesundmelden button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEndSickOnBehalf(teacher.id, formatTeacherFullName(teacher));
                        }}
                        title="Lehrkraft als gesund melden (Stunden reaktivieren)"
                        style={{
                          background: '#ef4444', border: 'none',
                          borderRadius: '10px', width: '28px', height: '28px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: 'pointer', color: 'white', transition: 'all 0.15s',
                          flexShrink: 0,
                          boxShadow: '0 2px 6px rgba(239, 68, 68, 0.2)'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#dc2626'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = '#ef4444'; }}
                      >
                        <UserCheck size={15} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {selectedCrisisTeacherId && (
              <button
                onClick={() => setSelectedCrisisTeacherId(null)}
                style={{
                  background: 'white', border: '1.5px solid #fca5a5',
                  color: '#7f1d1d', fontSize: '0.78rem', cursor: 'pointer',
                  padding: '8px 12px', borderRadius: '12px', fontWeight: 800,
                  width: '100%', transition: 'all 0.15s',
                  fontFamily: "'Plus Jakarta Sans', sans-serif"
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#fee2e2'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'white'; }}
              >Filter aufheben ✕</button>
            )}
          </div>

          {/* Anleitung: Operationscockpit Info Box */}
          <div style={{
            background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
            border: '1px solid #e2e8f0',
            borderRadius: '24px', 
            padding: '24px',
            display: 'flex', 
            flexDirection: 'column', 
            gap: '16px',
            boxShadow: '0 10px 25px rgba(15, 23, 42, 0.03)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ background: '#fee2e2', borderRadius: '10px', padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <BookOpen size={16} color="#ea4335" />
              </div>
              <strong style={{ fontSize: '0.9rem', fontWeight: 900, color: '#1e293b', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Anleitung: Operationscockpit
              </strong>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {[
                { icon: <AlertCircle size={14} color="#ef4444" />, title: 'Rot (Akut)', text: 'Ausfall in unter 2 Std. — Telefonischer Sofort-Kontakt dringend empfohlen!', bg: '#fee2e2' },
                { icon: <Clock size={14} color="#f59e0b" />, title: 'Gelb (Offen)', text: 'Schüler wurde digital benachrichtigt. Rückmeldung steht noch aus.', bg: '#fef3c7' },
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
        </div>
      </div>
    </div>
  );
};
