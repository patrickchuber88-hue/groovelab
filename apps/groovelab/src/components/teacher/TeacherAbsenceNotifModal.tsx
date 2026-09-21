import React from 'react';
import { 
  X, 
  AlertTriangle, 
  Calendar, 
  Clock, 
  Bell, 
  CheckCircle2, 
  User, 
  Building2, 
  Scale, 
  Mail, 
  Check 
} from 'lucide-react';
import { maskLastName, formatTeacherFullName } from '../../utils/nameHelper';
import { getSimulatedNow } from '../../hooks/useSimulatedTime';

export interface AbsenceNotifData {
  notifs: any[];
  absenceStartDateStr?: string;
  absenceUntilDateStr?: string;
  handlingOwner?: 'secretariat' | 'teacher' | string | null;
  officialNote?: string;
}

export interface TeacherAbsenceNotifModalProps {
  absenceNotifModal: AbsenceNotifData | null;
  setAbsenceNotifModal: React.Dispatch<React.SetStateAction<AbsenceNotifData | null>> | ((data: AbsenceNotifData | null) => void);
  allStudents: any[];
  schoolData?: any;
  teacher: any;
  showRealNames: boolean;
}

export const TeacherAbsenceNotifModal: React.FC<TeacherAbsenceNotifModalProps> = ({
  absenceNotifModal,
  setAbsenceNotifModal,
  allStudents,
  schoolData,
  teacher,
  showRealNames
}) => {
  if (!absenceNotifModal) return null;

  const targetSchoolEmail = schoolData?.absence_email || schoolData?.email || '';
  const teacherName = formatTeacherFullName(teacher) || 'Lehrkraft';
  const startStr = absenceNotifModal.absenceStartDateStr
    ? new Date(absenceNotifModal.absenceStartDateStr + 'T00:00:00').toLocaleDateString('de-DE')
    : getSimulatedNow().toLocaleDateString('de-DE');
  const untilStr = absenceNotifModal.absenceUntilDateStr
    ? new Date(absenceNotifModal.absenceUntilDateStr + 'T00:00:00').toLocaleDateString('de-DE')
    : 'auf Weiteres';

  const subject = encodeURIComponent(`Abwesenheitsmitteilung: ${teacherName} (${startStr} – ${untilStr})`);
  
  const studentHandlingText = absenceNotifModal.handlingOwner === 'teacher'
    ? 'Ich informiere meine Schüler selbst.'
    : 'Das Sekretariat übernimmt bitte die telefonische Information der Schüler.';

  const noteBlock = absenceNotifModal.officialNote && absenceNotifModal.officialNote.trim().length > 0
    ? `\n• Grund / Anmerkung: ${absenceNotifModal.officialNote.trim()}`
    : '\n• Grund / Anmerkung: [Optional hier Grund oder Notiz für die Schulleitung ergänzen]';

  const bodyText = `Sehr geehrte Schulleitung, liebes Musikschul-Team,\n\nich melde mich für den Zeitraum von ${startStr} bis voraussichtlich ${untilStr} abwesend.\n\nOrganisatorischer Status (Campus-Groovelab):\n• Schüler-Information: ${studentHandlingText}${noteBlock}\n• Betroffene Stunden: ${absenceNotifModal.notifs?.length || 0} Termine disponiert.\n\nSobald ich wieder einsatzbereit bin, gebe ich Bescheid.\n\nMit freundlichen Grüßen,\n${teacherName}`;
  const mailtoUrl = `mailto:${encodeURIComponent(targetSchoolEmail)}?subject=${subject}&body=${encodeURIComponent(bodyText)}`;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px',
      }}
      onClick={() => setAbsenceNotifModal(null)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="absence-notif-title"
        onClick={e => e.stopPropagation()}
        style={{
          background: 'white', borderRadius: '28px',
          padding: '32px', width: '100%', maxWidth: '540px',
          maxHeight: '80vh', overflow: 'hidden',
          display: 'flex', flexDirection: 'column', gap: '20px',
          boxShadow: '0 25px 60px rgba(0,0,0,0.2)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
          <div style={{
            background: 'linear-gradient(135deg, #ef4444, #dc2626)',
            borderRadius: '16px', padding: '12px', flexShrink: 0,
            boxShadow: '0 6px 20px rgba(239,68,68,0.3)',
          }}>
            <AlertTriangle size={22} color="white" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 id="absence-notif-title" style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Abwesenheit registriert
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#64748b' }}>
              Abwesend gemeldet bis einschließlich{' '}
              <strong style={{ color: '#ef4444' }}>
                {new Date((absenceNotifModal.absenceUntilDateStr || '') + 'T00:00:00').toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
              </strong>
            </p>
          </div>
          <button
            type="button"
            onClick={() => setAbsenceNotifModal(null)}
            aria-label="Bestätigung schließen"
            style={{
              background: '#f1f5f9', border: 'none', borderRadius: '10px',
              padding: '8px', cursor: 'pointer', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <X size={16} color="#64748b" />
          </button>
        </div>

        {/* Status bar */}
        <div style={{
          background: (absenceNotifModal.notifs?.length || 0) > 0 ? '#fff5f5' : '#e6f4ea',
          border: `1.5px solid ${(absenceNotifModal.notifs?.length || 0) > 0 ? '#fecaca' : '#e6f4ea'}`,
          borderRadius: '16px', padding: '14px 16px',
          display: 'flex', alignItems: 'center', gap: '12px',
        }}>
          {(absenceNotifModal.notifs?.length || 0) > 0 ? (
            <Bell size={24} color="#dc2626" style={{ flexShrink: 0 }} />
          ) : (
            <CheckCircle2 size={24} color="#166534" style={{ flexShrink: 0 }} />
          )}
          <div>
            <strong style={{ fontSize: '0.85rem', color: '#0f172a', display: 'block', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {(absenceNotifModal.notifs?.length || 0) > 0
                ? `${absenceNotifModal.notifs.length} Unterrichtseinheiten disponiert`
                : 'Keine Stunden betroffen'}
            </strong>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
              <span style={{
                fontSize: '0.68rem',
                fontWeight: 800,
                padding: '2px 8px',
                borderRadius: '100px',
                background: absenceNotifModal.handlingOwner === 'teacher' ? '#eff6ff' : '#fef2f2',
                color: absenceNotifModal.handlingOwner === 'teacher' ? '#1d4ed8' : '#dc2626',
                border: `1px solid ${absenceNotifModal.handlingOwner === 'teacher' ? '#bfdbfe' : '#fecaca'}`
              }}>
                {absenceNotifModal.handlingOwner === 'teacher' ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <User size={12} color="#1d4ed8" />
                    <span>Ich informiere selbst</span>
                  </span>
                ) : (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Building2 size={12} color="#dc2626" />
                    <span>Sekretariat beauftragt</span>
                  </span>
                )}
              </span>
              <span style={{ fontSize: '0.74rem', color: '#475569' }}>
                {absenceNotifModal.handlingOwner === 'teacher'
                  ? 'Du kontaktierst deine Schüler eigenständig (Push-Meldung ist bereits raus).'
                  : 'Das Schulsekretariat wurde im Ausfall-Cockpit beauftragt, deine Schüler anzurufen.'}
              </span>
            </div>
          </div>
        </div>

        {/* Affected student list */}
        {(absenceNotifModal.notifs?.length || 0) > 0 && (
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <p style={{ margin: 0, fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Betroffene Stunden ({absenceNotifModal.notifs.length})
            </p>
            {absenceNotifModal.notifs.map((n, i) => {
              const dt = new Date(n.slot_start_datetime);
              const dateStr = dt.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' });
              
              const durationMinutes = n.duration || 30;
              const dtEnd = new Date(dt.getTime() + durationMinutes * 60 * 1000);
              const timeStrStart = dt.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
              const timeStrEnd = dtEnd.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
              const timeStrRange = `${timeStrStart} - ${timeStrEnd} Uhr`;

              const studentName = n.student_name || (() => {
                const student = allStudents.find(s => s.id === n.student_id);
                return student ? `${student.first_name} ${maskLastName(student.last_name, showRealNames)}`.trim() : `Schüler: ${n.student_id?.substring(0, 8)}…`;
              })();

              return (
                <div
                  key={i}
                  style={{
                    background: '#f8fafc', border: '1.5px solid #e2e8f0',
                    borderLeft: '4px solid #ef4444',
                    borderRadius: '14px', padding: '12px 14px',
                    display: 'flex', alignItems: 'center', gap: '12px',
                  }}
                >
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
                    background: 'linear-gradient(135deg, #fef2f2, #fee2e2)',
                    border: '2px solid #fecaca',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.85rem', fontWeight: 800, color: '#dc2626',
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                  }}>
                    {String(i + 1).padStart(2, '0')}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: '0.82rem', color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      {studentName}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Calendar size={13} style={{ color: '#64748b' }} />
                        {dateStr}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={13} style={{ color: '#64748b' }} />
                        {timeStrRange}
                      </span>
                    </div>
                  </div>
                  <span style={{
                    fontSize: '0.65rem', fontWeight: 800, padding: '3px 10px',
                    borderRadius: '100px', background: '#fef2f2', color: '#dc2626',
                    border: '1px solid #fecaca', whiteSpace: 'nowrap',
                  }}>Storno</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Juristischer Hinweis & Offizielle E-Mail-Vorlage (Tier-1 SaaS Enterprise+ Goldstandard) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{
            background: '#f8fafc', border: '1px solid #cbd5e1',
            borderRadius: '14px', padding: '12px 16px',
            fontSize: '0.74rem', color: '#475569', lineHeight: 1.45,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
              <Scale size={15} color="#475569" style={{ flexShrink: 0 }} />
              <span>Organisatorischer Hinweis für Lehrkräfte</span>
            </div>
            Die Erfassung in Campus-Groovelab dient der didaktischen Unterrichtsorganisation und Schülerinformation. Bitte informiere deine Musikschulleitung bei Bedarf auch auf dem offiziellen Dienstweg.
          </div>

          <a
            href={mailtoUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              background: '#ffffff',
              color: '#0f172a',
              border: '1.5px solid #cbd5e1',
              borderRadius: '14px',
              padding: '12px 16px',
              fontSize: '0.82rem',
              fontWeight: 800,
              textDecoration: 'none',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              transition: 'all 0.15s',
              boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
            }}
          >
            <Mail size={16} color="#0f172a" style={{ flexShrink: 0 }} />
            <span>Offizielle Dienstmeldung per E-Mail vorbereiten</span>
            <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>({targetSchoolEmail || 'Musikschule'})</span>
          </a>

          <button
            type="button"
            onClick={() => setAbsenceNotifModal(null)}
            style={{
              background: 'linear-gradient(135deg, #0f172a, #1e293b)',
              color: 'white', border: 'none', borderRadius: '14px',
              padding: '14px', fontWeight: 900, fontSize: '0.85rem',
              cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif",
              boxShadow: '0 4px 16px rgba(15,23,42,0.2)',
              transition: 'all 0.15s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <Check size={16} strokeWidth={3} />
            <span>Verstanden — Zurück zum Briefing</span>
          </button>
        </div>
      </div>
    </div>
  );
};
