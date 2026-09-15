import React, { useState } from 'react';
import { X, Calendar, AlertTriangle, Clock, CalendarX, Check } from 'lucide-react';
import { isTeacherCurrentlyAbsent as defaultIsTeacherCurrentlyAbsent } from '../../utils/teacherAbsenceHelper';

export interface TeacherAbsenceModalProps {
  showAbsenceModal: boolean;
  setShowAbsenceModal: (show: boolean) => void;
  windowWidth: number;
  teacher: any;
  isTeacherCurrentlyAbsent?: (teacher: any) => boolean;
  quickAbsencePreset: 'today' | 'friday' | 'next_friday' | 'custom';
  setQuickAbsencePreset: (preset: 'today' | 'friday' | 'next_friday' | 'custom') => void;
  absenceStartDate: string;
  setAbsenceStartDate: (date: string) => void;
  absenceUntilDate: string;
  setAbsenceUntilDate: (date: string) => void;
  showCustomStart?: boolean;
  setShowCustomStart?: (show: boolean) => void;
  absenceHandlingOwner: 'secretariat' | 'teacher' | '' | null;
  setAbsenceHandlingOwner: React.Dispatch<React.SetStateAction<'secretariat' | 'teacher' | null>> | ((owner: 'secretariat' | 'teacher') => void);
  absenceOfficialNote: string;
  setAbsenceOfficialNote: (note: string) => void;
  handleEndAbsence: () => Promise<void>;
  handleReportAbsence: () => Promise<void>;
  submittingAbsence: boolean;
  cancellationsCount?: number;
}

export const TeacherAbsenceModal: React.FC<TeacherAbsenceModalProps> = ({
  showAbsenceModal,
  setShowAbsenceModal,
  windowWidth,
  teacher,
  isTeacherCurrentlyAbsent,
  quickAbsencePreset,
  setQuickAbsencePreset,
  absenceStartDate,
  setAbsenceStartDate,
  absenceUntilDate,
  setAbsenceUntilDate,
  absenceHandlingOwner,
  setAbsenceHandlingOwner,
  absenceOfficialNote,
  setAbsenceOfficialNote,
  handleEndAbsence,
  handleReportAbsence,
  submittingAbsence,
  cancellationsCount = 0
}) => {
  const [showCustomStart, setShowCustomStart] = useState(false);

  if (!showAbsenceModal) return null;

  const isAbsent = (isTeacherCurrentlyAbsent || defaultIsTeacherCurrentlyAbsent)(teacher);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: windowWidth <= 768 ? 'flex-end' : 'center',
        justifyContent: 'center',
        padding: windowWidth <= 768 ? '0px' : '16px',
        animation: 'fadeIn 0.2s ease-out'
      }}
      onClick={() => setShowAbsenceModal(false)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="absence-modal-title"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#ffffff',
          borderRadius: windowWidth <= 768 ? '24px 24px 0 0' : '24px',
          width: '100%',
          maxWidth: '490px',
          maxHeight: windowWidth <= 768 ? '94vh' : '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.3)',
          overflow: 'hidden',
          boxSizing: 'border-box'
        }}
      >
        {/* Apple Drag Indicator for Mobile Viewports */}
        {windowWidth <= 768 && (
          <div style={{ width: '36px', height: '4px', background: '#cbd5e1', borderRadius: '100px', margin: '10px auto 2px auto' }} />
        )}

        {/* Header */}
        <div style={{
          padding: '14px 20px 12px 20px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '12px',
              background: isAbsent
                ? 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)'
                : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: isAbsent
                ? '0 4px 12px rgba(14, 165, 233, 0.25)'
                : '0 4px 12px rgba(239, 68, 68, 0.25)'
            }}>
              {isAbsent ? <Calendar size={19} /> : <AlertTriangle size={19} />}
            </div>
            <div>
              <h2 id="absence-modal-title" style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                {isAbsent ? 'Abwesenheit verwalten' : 'Abwesenheit / Ausfall melden'}
              </h2>
              <p style={{ margin: '1px 0 0 0', fontSize: '0.72rem', color: '#64748b', fontWeight: 500 }}>
                {isAbsent ? 'Verfügbarkeit wiederherstellen oder Zeitraum korrigieren' : 'Sagt Termine ab & alarmiert das Sekretariat zur Schülerbetreuung'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowAbsenceModal(false)}
            aria-label="Abwesenheitsdialog schließen"
            style={{
              background: '#f1f5f9',
              border: 'none',
              borderRadius: '10px',
              padding: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748b',
              transition: 'all 0.15s'
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Body Content */}
        <div style={{ padding: '12px 20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
          
          {/* Notice Banner */}
          {isAbsent ? (
            <div style={{
              background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
              border: '1px solid #86efac',
              borderRadius: '12px',
              padding: '8px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 2px 6px rgba(34, 197, 94, 0.06)'
            }}>
              <span style={{ fontSize: '1rem', lineHeight: 1 }}>🟢</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <strong style={{ fontSize: '0.78rem', color: '#166534', display: 'block', fontWeight: 800 }}>
                  Aktuell als abwesend gemeldet
                </strong>
                <span style={{ fontSize: '0.70rem', color: '#15803d', lineHeight: 1.35, fontWeight: 600 }}>
                  Bis einschließlich {(teacher?.ausfall_until ?? (teacher as any)?.ausfallUntil) ? new Date(String(teacher.ausfall_until || teacher.ausfallUntil).substring(0, 10) + 'T00:00:00').toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' }) : 'auf Weiteres'}. Du kannst dich jederzeit vorzeitig wieder verfügbar melden.
                </span>
              </div>
            </div>
          ) : (
            <div style={{
              background: '#fff5f5',
              border: '1px solid #fecaca',
              borderRadius: '12px',
              padding: '7px 11px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span style={{ fontSize: '1rem', lineHeight: 1 }}>ℹ️</span>
              <span style={{ fontSize: '0.72rem', color: '#991b1b', lineHeight: 1.35, fontWeight: 550 }}>
                Alle betroffenen Stundenplandaten im Zeitraum werden storniert. Das Sekretariat erhält ein Ticket zur Betreuung der Schüler.
              </span>
            </div>
          )}

          {/* 1-Tap Quick-Selection Chips */}
          <div>
            <label style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '5px' }}>
              Schnell-Auswahl (1-Tap):
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
              <button
                type="button"
                onClick={() => {
                  const today = new Date().toLocaleDateString('sv-SE');
                  setAbsenceStartDate(today);
                  setAbsenceUntilDate(today);
                  setQuickAbsencePreset('today');
                  setShowCustomStart(false);
                }}
                style={{
                  padding: '7px 10px',
                  borderRadius: '10px',
                  border: quickAbsencePreset === 'today' ? '2px solid #ef4444' : '1.5px solid #e2e8f0',
                  background: quickAbsencePreset === 'today' ? '#fee2e2' : '#f8fafc',
                  color: quickAbsencePreset === 'today' ? '#b91c1c' : '#334155',
                  fontWeight: quickAbsencePreset === 'today' ? 800 : 600,
                  fontSize: '0.78rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                <span>⚡</span>
                <span>Nur Heute</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const today = new Date().toLocaleDateString('sv-SE');
                  const fri = (() => {
                    const d = new Date();
                    const day = d.getDay();
                    const diffToFri = (5 - day + 7) % 7;
                    d.setDate(d.getDate() + diffToFri);
                    return d.toLocaleDateString('sv-SE');
                  })();
                  setAbsenceStartDate(today);
                  setAbsenceUntilDate(fri);
                  setQuickAbsencePreset('friday');
                  setShowCustomStart(false);
                }}
                style={{
                  padding: '7px 10px',
                  borderRadius: '10px',
                  border: quickAbsencePreset === 'friday' ? '2px solid #ef4444' : '1.5px solid #e2e8f0',
                  background: quickAbsencePreset === 'friday' ? '#fee2e2' : '#f8fafc',
                  color: quickAbsencePreset === 'friday' ? '#b91c1c' : '#334155',
                  fontWeight: quickAbsencePreset === 'friday' ? 800 : 600,
                  fontSize: '0.78rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                <span>📅</span>
                <span>Bis Freitag</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const today = new Date().toLocaleDateString('sv-SE');
                  const nextFri = (() => {
                    const d = new Date();
                    const day = d.getDay();
                    const diffToFri = (5 - day + 7) % 7;
                    d.setDate(d.getDate() + diffToFri + 7);
                    return d.toLocaleDateString('sv-SE');
                  })();
                  setAbsenceStartDate(today);
                  setAbsenceUntilDate(nextFri);
                  setQuickAbsencePreset('next_friday');
                  setShowCustomStart(false);
                }}
                style={{
                  padding: '7px 10px',
                  borderRadius: '10px',
                  border: quickAbsencePreset === 'next_friday' ? '2px solid #ef4444' : '1.5px solid #e2e8f0',
                  background: quickAbsencePreset === 'next_friday' ? '#fee2e2' : '#f8fafc',
                  color: quickAbsencePreset === 'next_friday' ? '#b91c1c' : '#334155',
                  fontWeight: quickAbsencePreset === 'next_friday' ? 800 : 600,
                  fontSize: '0.78rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                <span>🗓️</span>
                <span>Nächste Woche Fr</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setQuickAbsencePreset('custom');
                  setShowCustomStart(true);
                }}
                style={{
                  padding: '7px 10px',
                  borderRadius: '10px',
                  border: quickAbsencePreset === 'custom' ? '2px solid #ef4444' : '1.5px solid #e2e8f0',
                  background: quickAbsencePreset === 'custom' ? '#fee2e2' : '#f8fafc',
                  color: quickAbsencePreset === 'custom' ? '#b91c1c' : '#334155',
                  fontWeight: quickAbsencePreset === 'custom' ? 800 : 600,
                  fontSize: '0.78rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                <span>✏️</span>
                <span>Individuell</span>
              </button>
            </div>
          </div>

          {/* Visual Period Display Card */}
          <div style={{
            background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
            border: '1.5px solid #e2e8f0',
            borderRadius: '14px',
            padding: '10px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Gewählter Zeitraum
              </span>
              <span style={{ fontSize: '0.70rem', fontWeight: 800, color: '#ef4444', background: '#fee2e2', padding: '1px 7px', borderRadius: '100px' }}>
                {(() => {
                  if (!absenceStartDate || !absenceUntilDate) return '1 Tag';
                  const s = new Date(absenceStartDate + 'T00:00:00');
                  const u = new Date(absenceUntilDate + 'T00:00:00');
                  s.setHours(0,0,0,0);
                  u.setHours(0,0,0,0);
                  const diff = Math.round((u.getTime() - s.getTime()) / (24*3600*1000)) + 1;
                  return diff > 1 ? `${diff} Tage` : '1 Tag';
                })()}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.64rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Von</span>
                <strong style={{ fontSize: '0.84rem', color: '#0f172a', fontWeight: 800 }}>
                  {absenceStartDate ? new Date(absenceStartDate + 'T00:00:00').toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Sofort'}
                </strong>
              </div>
              <div style={{ color: '#cbd5e1', fontSize: '0.82rem' }}>➔</div>
              <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'right' }}>
                <span style={{ fontSize: '0.64rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Bis einschließlich</span>
                <strong style={{ fontSize: '0.84rem', color: '#b91c1c', fontWeight: 800 }}>
                  {absenceUntilDate ? new Date(absenceUntilDate + 'T00:00:00').toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Nicht gewählt'}
                </strong>
              </div>
            </div>

            {/* Custom Date Pickers */}
            {(quickAbsencePreset === 'custom' || showCustomStart) && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', paddingTop: '8px', borderTop: '1px solid #e2e8f0', marginTop: '2px' }}>
                <div>
                  <label style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '2px' }}>Startdatum:</label>
                  <input 
                    type="date"
                    value={absenceStartDate}
                    onChange={(e) => {
                      setAbsenceStartDate(e.target.value);
                      setQuickAbsencePreset('custom');
                    }}
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      borderRadius: '10px',
                      border: '1.5px solid #cbd5e1',
                      background: '#ffffff',
                      fontSize: '0.78rem',
                      color: '#0f172a',
                      fontWeight: 700,
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '2px' }}>Enddatum:</label>
                  <input 
                    type="date"
                    value={absenceUntilDate}
                    onChange={(e) => {
                      setAbsenceUntilDate(e.target.value);
                      setQuickAbsencePreset('custom');
                    }}
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      borderRadius: '10px',
                      border: '1.5px solid #cbd5e1',
                      background: '#ffffff',
                      fontSize: '0.78rem',
                      color: '#0f172a',
                      fontWeight: 700,
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Live Lesson Impact Counter */}
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '6px 10px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <Clock size={14} color="#64748b" />
            <span style={{ fontSize: '0.72rem', color: '#475569', fontWeight: 600 }}>
              {cancellationsCount > 0 
                ? `Heute sind ${cancellationsCount} Unterrichtseinheiten betroffen.` 
                : 'Alle geplanten Termine im Zeitraum werden storniert.'}
            </span>
          </div>

          {/* ── ZUSTÄNDIGKEIT FÜR SCHÜLER-BENACHRICHTIGUNG (PFLICHTAUSWAHL) ── */}
          <div>
            <label style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span>Wer informiert die Schüler telefonisch?</span>
              <span style={{ 
                fontSize: '0.62rem', 
                fontWeight: 800, 
                color: absenceHandlingOwner ? '#15803d' : '#ef4444',
                background: absenceHandlingOwner ? '#dcfce7' : '#fee2e2',
                padding: '2px 8px',
                borderRadius: '100px',
                border: `1px solid ${absenceHandlingOwner ? '#bbf7d0' : '#fecaca'}`
              }}>
                {absenceHandlingOwner ? '✓ Ausgewählt' : 'Pflichtfeld'}
              </span>
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
              {/* Option 1: Sekretariat beauftragen */}
              <div
                role="button"
                tabIndex={0}
                aria-label="Sekretariat beauftragen: Die Verwaltung übernimmt die telefonische Kontaktaufnahme im Ausfall-Cockpit"
                onClick={() => setAbsenceHandlingOwner('secretariat')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setAbsenceHandlingOwner('secretariat');
                  }
                }}
                style={{
                  padding: '10px 12px',
                  borderRadius: '14px',
                  border: absenceHandlingOwner === 'secretariat' ? '2px solid #ef4444' : '1.5px solid #cbd5e1',
                  background: absenceHandlingOwner === 'secretariat' ? '#fef2f2' : '#ffffff',
                  cursor: 'pointer',
                  transition: 'all 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  boxShadow: absenceHandlingOwner === 'secretariat' ? '0 4px 12px rgba(239, 68, 68, 0.12)' : 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '1.05rem' }}>🏢</span>
                  <div style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    border: absenceHandlingOwner === 'secretariat' ? '5px solid #ef4444' : '1.5px solid #cbd5e1',
                    background: '#ffffff',
                    boxSizing: 'border-box',
                    transition: 'all 0.15s'
                  }} />
                </div>
                <strong style={{ fontSize: '0.80rem', color: absenceHandlingOwner === 'secretariat' ? '#991b1b' : '#0f172a', fontWeight: 850 }}>
                  Sekretariat beauftragen
                </strong>
                <span style={{ fontSize: '0.66rem', color: '#64748b', lineHeight: 1.25 }}>
                  Die Verwaltung übernimmt die telefonische Kontaktaufnahme im Ausfall-Cockpit
                </span>
              </div>

              {/* Option 2: Lehrkraft informiert selbst */}
              <div
                role="button"
                tabIndex={0}
                aria-label="Ich übernehme selbst: Ich kontaktiere meine Schüler eigenständig"
                onClick={() => setAbsenceHandlingOwner('teacher')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setAbsenceHandlingOwner('teacher');
                  }
                }}
                style={{
                  padding: '10px 12px',
                  borderRadius: '14px',
                  border: absenceHandlingOwner === 'teacher' ? '2px solid #ef4444' : '1.5px solid #cbd5e1',
                  background: absenceHandlingOwner === 'teacher' ? '#fef2f2' : '#ffffff',
                  cursor: 'pointer',
                  transition: 'all 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  boxShadow: absenceHandlingOwner === 'teacher' ? '0 4px 12px rgba(239, 68, 68, 0.12)' : 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '1.05rem' }}>👤</span>
                  <div style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    border: absenceHandlingOwner === 'teacher' ? '5px solid #ef4444' : '1.5px solid #cbd5e1',
                    background: '#ffffff',
                    boxSizing: 'border-box',
                    transition: 'all 0.15s'
                  }} />
                </div>
                <strong style={{ fontSize: '0.80rem', color: absenceHandlingOwner === 'teacher' ? '#991b1b' : '#0f172a', fontWeight: 850 }}>
                  Ich übernehme selbst
                </strong>
                <span style={{ fontSize: '0.66rem', color: '#64748b', lineHeight: 1.25 }}>
                  Ich kontaktiere meine Schüler eigenständig (telefonisch / persönlich)
                </span>
              </div>
            </div>

            {!absenceHandlingOwner && (
              <div style={{
                marginTop: '6px',
                padding: '6px 10px',
                borderRadius: '10px',
                background: '#fff1f2',
                border: '1px solid #fecdd3',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.68rem',
                color: '#e11d48',
                fontWeight: 700
              }}>
                <span>⚠️</span>
                <span>Bitte triff eine Auswahl, wer die Schüler kontaktiert.</span>
              </div>
            )}
          </div>

          {/* ── FLÜCHTIGE ANMERKUNG FÜR DIE E-MAIL AN DIE SCHULLEITUNG (ZERO-STORAGE PRIVACY) ── */}
          <div>
            <label style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span>Anmerkung / Grund (optional für E-Mail)</span>
              <span style={{ fontSize: '0.64rem', fontWeight: 600, color: '#94a3b8' }}>🔒 Flüchtig / Nicht gespeichert</span>
            </label>
            <input
              type="text"
              placeholder="z.B. Konzertreise / Tournee (abgesprochen), Notizen für Vertretung..."
              value={absenceOfficialNote}
              onChange={(e) => setAbsenceOfficialNote(e.target.value)}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '7px 11px',
                borderRadius: '10px',
                border: '1.5px solid #cbd5e1',
                background: '#ffffff',
                fontSize: '0.78rem',
                color: '#0f172a',
                outline: 'none'
              }}
            />
            <span style={{ fontSize: '0.64rem', color: '#94a3b8', display: 'block', marginTop: '3px', lineHeight: 1.25 }}>
              Wird ausschließlich lokal für deinen E-Mail-Entwurf an die Schulleitung verwendet und nicht auf dem Server gespeichert.
            </span>
          </div>
        </div>

        {/* Sticky Bottom Action Footer */}
        <div style={{
          padding: '12px 20px',
          paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
          borderTop: '1px solid #f1f5f9',
          background: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px'
        }}>
          {isAbsent ? (
            <>
              {/* 1. Hauptaktion: Sofort wieder verfügbar melden (Groß & Campus-Grün) */}
              <button
                type="button"
                onClick={() => {
                  handleEndAbsence();
                  setShowAbsenceModal(false);
                }}
                disabled={submittingAbsence}
                style={{
                  background: 'linear-gradient(135deg, #34a853 0%, #2e8b57 100%)',
                  color: '#ffffff',
                  border: 'none',
                  padding: '11px 16px',
                  borderRadius: '12px',
                  fontWeight: 900,
                  fontSize: '0.88rem',
                  cursor: submittingAbsence ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 14px rgba(52, 168, 83, 0.3)',
                  letterSpacing: '-0.01em',
                  transition: 'all 0.15s'
                }}
                className="hover-scale"
              >
                <Check size={16} strokeWidth={3} />
                <span>{submittingAbsence ? 'Wird aktualisiert...' : 'Wieder verfügbar melden'}</span>
              </button>

              {/* 2. Sekundäraktion: Geänderten Zeitraum speichern */}
              <button
                type="button"
                onClick={handleReportAbsence}
                disabled={submittingAbsence}
                style={{
                  background: '#f8fafc',
                  color: '#334155',
                  border: '1.5px solid #cbd5e1',
                  padding: '9px 12px',
                  borderRadius: '11px',
                  fontWeight: 800,
                  fontSize: '0.80rem',
                  cursor: submittingAbsence ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'all 0.15s'
                }}
                className="hover-scale"
              >
                <CalendarX size={14} color="#64748b" />
                <span>{submittingAbsence ? 'Wird übermittelt...' : 'Neuen Zeitraum speichern'}</span>
              </button>

              {/* 3. Schließen */}
              <button
                type="button"
                onClick={() => setShowAbsenceModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  padding: '3px',
                  cursor: 'pointer'
                }}
              >
                Schließen
              </button>
            </>
          ) : (
            <>
              {/* Regulärer Erst-Absage Flow */}
              <button
                type="button"
                onClick={handleReportAbsence}
                disabled={submittingAbsence || !absenceHandlingOwner}
                title={!absenceHandlingOwner ? 'Bitte wähle zuerst aus, wer die Schüler telefonisch kontaktiert' : undefined}
                style={{
                  background: (!absenceHandlingOwner || submittingAbsence)
                    ? '#cbd5e1'
                    : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  color: (!absenceHandlingOwner || submittingAbsence)
                    ? '#64748b'
                    : '#ffffff',
                  border: 'none',
                  padding: '11px 16px',
                  borderRadius: '12px',
                  fontWeight: 900,
                  fontSize: '0.88rem',
                  cursor: (submittingAbsence || !absenceHandlingOwner) ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: (!absenceHandlingOwner || submittingAbsence)
                    ? 'none'
                    : '0 4px 14px rgba(239, 68, 68, 0.3)',
                  opacity: submittingAbsence ? 0.7 : 1,
                  letterSpacing: '-0.01em',
                  transition: 'all 0.15s'
                }}
                className={absenceHandlingOwner && !submittingAbsence ? 'hover-scale' : undefined}
              >
                <CalendarX size={16} />
                <span>
                  {submittingAbsence
                    ? 'Wird übermittelt...'
                    : !absenceHandlingOwner
                    ? 'Zuständigkeit oben auswählen...'
                    : 'Terminabsage jetzt einreichen'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setShowAbsenceModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  padding: '3px',
                  cursor: 'pointer'
                }}
              >
                Abbrechen
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
