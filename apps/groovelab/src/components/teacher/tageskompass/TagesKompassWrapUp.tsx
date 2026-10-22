import React, { useState } from 'react';
import { Moon, CheckCircle2, Calendar, ChevronRight, Check, Zap, Sparkles, Mic, ArrowRight } from 'lucide-react';
import { TagesKompassTeacher, TagesKompassStudent, NextTeachingDaySummary, formatTagesKompassStudentName } from './types';
import { TagesKompassSmartInput } from './TagesKompassSmartInput';

interface TagesKompassWrapUpProps {
  teacher: TagesKompassTeacher;
  totalSlots: number;
  unfinishedStudents: TagesKompassStudent[];
  nextDaySummary?: NextTeachingDaySummary | null;
  onSaveHomeworkForStudent: (studentId: string, textOrAudio: string, isAudio?: boolean) => Promise<void>;
  onDismissAllRemaining?: () => void;
  onOpenQuickModal?: (student?: any) => void;
}

export const TagesKompassWrapUp: React.FC<TagesKompassWrapUpProps> = ({
  teacher,
  totalSlots,
  unfinishedStudents = [],
  nextDaySummary,
  onSaveHomeworkForStudent,
  onDismissAllRemaining,
  onOpenQuickModal
}) => {
  const [activeCatchUpStudentId, setActiveCatchUpStudentId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDismissedForSession, setIsDismissedForSession] = useState(false);

  const teacherName = teacher?.first_name || teacher?.name || 'Lehrkraft';
  const hasUnfinished = unfinishedStudents.length > 0 && !isDismissedForSession;
  const activeStudentObj = unfinishedStudents.find(s => s.id === activeCatchUpStudentId || s.studentId === activeCatchUpStudentId);

  const handleSaveText = async (text: string) => {
    if (!activeCatchUpStudentId) return;
    setIsSaving(true);
    try {
      await onSaveHomeworkForStudent(activeCatchUpStudentId, text, false);
      setActiveCatchUpStudentId(null);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAudio = async (audioUrl: string) => {
    if (!activeCatchUpStudentId) return;
    setIsSaving(true);
    try {
      await onSaveHomeworkForStudent(activeCatchUpStudentId, `AUDIO:${audioUrl}`, true);
      setActiveCatchUpStudentId(null);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDismissAll = () => {
    setIsDismissedForSession(true);
    if (onDismissAllRemaining) {
      onDismissAllRemaining();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
      {/* 1. Header: Warmer, eleganter Feierabend-Gruß (Tone-in-Tone, kein Alarm) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div 
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: '#4f46e5',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 4px 12px rgba(79, 70, 229, 0.25)'
            }}
          >
            <Moon size={20} strokeWidth={2.2} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.08rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
              Schönen Feierabend, {teacherName}!
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.76rem', color: '#64748b', fontWeight: 600 }}>
              Heute alle {totalSlots} Unterrichtseinheiten erfolgreich abgeschlossen
            </p>
          </div>
        </div>

        {/* Status-Badge: Uni-farbenes Slate / Smaragd */}
        <div
          style={{
            fontSize: '0.72rem',
            fontWeight: 700,
            color: hasUnfinished ? '#334155' : '#15803d',
            background: hasUnfinished ? '#f1f5f9' : '#dcfce7',
            border: `1px solid ${hasUnfinished ? '#e2e8f0' : '#bbf7d0'}`,
            padding: '4px 12px',
            borderRadius: '100px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          {hasUnfinished ? (
            <>
              <Sparkles size={12} color="#64748b" />
              <span>{unfinishedStudents.length} {unfinishedStudents.length === 1 ? 'Notiz offen' : 'Notizen offen'}</span>
            </>
          ) : (
            <>
              <CheckCircle2 size={12} color="#15803d" />
              <span>100% Dokumentiert</span>
            </>
          )}
        </div>
      </div>

      {/* 2. Soft-Surface Container (Schluss mit Box-in-Box Rahmen) */}
      {hasUnfinished ? (
        <div 
          style={{
            background: '#fafaf9',
            border: '1px solid #f5f5f4',
            borderRadius: '18px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#292524' }}>
              Noch etwas für die Stunde festhalten?
            </span>
            <span style={{ fontSize: '0.72rem', fontWeight: 500, color: '#78716c' }}>
              5s-Sprachmemo oder Vorwoche übernehmen
            </span>
          </div>

          {/* Schüler-Kacheln mit Zeit & Instrumenten-Kontext (Uni-farbene Buttons) */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {unfinishedStudents.map(std => {
              const stdId = std.id || std.studentId || '';
              const isSelected = activeCatchUpStudentId === stdId;
              const name = formatTagesKompassStudentName(std);
              const instrument = std.instrument || std.fach || null;
              const startTime = std.startTime || null;

              return (
                <button
                  key={stdId}
                  type="button"
                  onClick={() => setActiveCatchUpStudentId(isSelected ? null : stdId)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: isSelected ? '#4f46e5' : '#ffffff',
                    color: isSelected ? '#ffffff' : '#1e293b',
                    border: isSelected ? '1px solid #4f46e5' : '1px solid #e2e8f0',
                    padding: '8px 14px',
                    borderRadius: '12px',
                    fontSize: '0.80rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: isSelected ? '0 4px 14px rgba(79, 70, 229, 0.25)' : '0 1px 2px rgba(0,0,0,0.03)',
                    transition: 'all 0.15s ease'
                  }}
                  className="hover-scale-mini"
                >
                  {startTime && (
                    <span 
                      style={{ 
                        fontSize: '0.70rem', 
                        fontWeight: 700, 
                        color: isSelected ? '#ffffff' : '#64748b',
                        background: isSelected ? 'rgba(255, 255, 255, 0.18)' : '#f1f5f9',
                        padding: '1px 6px',
                        borderRadius: '5px'
                      }}
                    >
                      {startTime}
                    </span>
                  )}
                  <span style={{ fontWeight: isSelected ? 800 : 700, color: isSelected ? '#ffffff' : '#0f172a' }}>
                    {name}
                  </span>
                  {instrument && (
                    <span style={{ fontSize: '0.70rem', fontWeight: 600, color: isSelected ? '#94a3b8' : '#64748b' }}>
                      • {instrument}
                    </span>
                  )}
                  <Mic size={12} color={isSelected ? '#cbd5e1' : '#94a3b8'} style={{ marginLeft: '2px' }} />
                  <ChevronRight 
                    size={13} 
                    color={isSelected ? '#ffffff' : '#94a3b8'}
                    style={{ transform: isSelected ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }} 
                  />
                </button>
              );
            })}
          </div>

          {/* Aufgeklapptes Smart-Input für den ausgewählten Schüler */}
          {activeCatchUpStudentId && activeStudentObj && (
            <div style={{ marginTop: '2px', animation: 'fadeIn 0.2s ease' }}>
              <TagesKompassSmartInput
                studentId={activeCatchUpStudentId}
                studentName={formatTagesKompassStudentName(activeStudentObj)}
                studentInstrument={activeStudentObj?.instrument || activeStudentObj?.fach}
                schoolId={teacher?.school_id}
                isSaving={isSaving}
                onSaveText={handleSaveText}
                onSaveAudio={handleSaveAudio}
              />
              {onOpenQuickModal && (
                <button
                  type="button"
                  onClick={() => onOpenQuickModal(activeStudentObj)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    width: '100%',
                    marginTop: '8px',
                    background: 'transparent',
                    border: '1px dashed #cbd5e1',
                    borderRadius: '10px',
                    padding: '7px 10px',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    color: '#475569',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Zap size={12} color="#4f46e5" />
                  <span>Im Schnellmodal (mit Metronom & Didaktik-Chips) öffnen</span>
                </button>
              )}
            </div>
          )}

          {/* Didaktischer Feierabend-Bypass: Wenn bewusst keine Notizen nötig sind */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '2px' }}>
            <button
              type="button"
              onClick={handleDismissAll}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#78716c',
                fontSize: '0.74rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 6px',
                transition: 'color 0.15s ease'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#1c1917')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#78716c')}
            >
              <span>Keine Notizen nötig • Jetzt Feierabend machen</span>
              <ArrowRight size={12} />
            </button>
          </div>
        </div>
      ) : (
        /* Belohnender 100%-Zustand (Ruhig, befreiend & wertschätzend) */
        <div 
          style={{
            background: '#f0fdf4',
            borderRadius: '16px',
            padding: '16px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px'
          }}
        >
          <div 
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '12px',
              background: '#dcfce7',
              color: '#15803d',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <Check size={20} strokeWidth={2.8} />
          </div>
          <div>
            <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#166534' }}>
              Alle heutigen Unterrichtsstunden sind dokumentiert.
            </div>
            <div style={{ fontSize: '0.74rem', fontWeight: 600, color: '#15803d' }}>
              Schüler & Eltern sind versorgt. Hab einen wohlverdienten Feierabend!
            </div>
          </div>
        </div>
      )}

      {/* 3. Bereinigte Vorschau nächster Unterrichtstag */}
      {nextDaySummary && (
        <div 
          style={{
            background: '#ffffff',
            border: '1px solid #f1f5f9',
            borderRadius: '14px',
            padding: '11px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={15} color="#64748b" />
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1e293b' }}>
              Nächster Unterricht: {nextDaySummary.dayName || 'Nächster Unterrichtstag'}
            </span>
          </div>

          <span style={{ fontSize: '0.74rem', fontWeight: 600, color: '#64748b' }}>
            {nextDaySummary.totalAppointments} Einheiten ab {nextDaySummary.firstStartTime} Uhr
            {nextDaySummary.firstRoom && nextDaySummary.firstRoom.trim() !== 'Raum' && nextDaySummary.firstRoom.trim() !== ''
              ? ` • ${nextDaySummary.firstRoom}`
              : ''}
          </span>
        </div>
      )}
    </div>
  );
};
