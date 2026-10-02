import React, { useState } from 'react';
import { Moon, CheckCircle2, AlertTriangle, Calendar, ChevronRight, Check, Zap } from 'lucide-react';
import { TagesKompassTeacher, TagesKompassStudent, NextTeachingDaySummary, formatTagesKompassStudentName } from './types';
import { TagesKompassSmartInput } from './TagesKompassSmartInput';

interface TagesKompassWrapUpProps {
  teacher: TagesKompassTeacher;
  totalSlots: number;
  unfinishedStudents: TagesKompassStudent[];
  nextDaySummary?: NextTeachingDaySummary | null;
  onSaveHomeworkForStudent: (studentId: string, textOrAudio: string, isAudio?: boolean) => Promise<void>;
  onOpenQuickModal?: (student?: any) => void;
}

export const TagesKompassWrapUp: React.FC<TagesKompassWrapUpProps> = ({
  teacher,
  totalSlots,
  unfinishedStudents = [],
  nextDaySummary,
  onSaveHomeworkForStudent,
  onOpenQuickModal
}) => {
  const [activeCatchUpStudentId, setActiveCatchUpStudentId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const teacherName = teacher?.first_name || teacher?.name || 'Lehrkraft';
  const hasUnfinished = unfinishedStudents.length > 0;
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
      {/* 1. Header: Feierabend-Gruß */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div 
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '12px',
              background: '#fef3c7',
              color: '#d97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Moon size={20} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.01em' }}>
              Schönen Feierabend, {teacherName}!
            </h3>
            <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
              Heute alle {totalSlots} Unterrichtseinheiten abgeschlossen
            </p>
          </div>
        </div>

        <span
          style={{
            fontSize: '0.70rem',
            fontWeight: 800,
            color: hasUnfinished ? '#c2410c' : '#15803d',
            background: hasUnfinished ? '#ffedd5' : '#dcfce7',
            border: `1px solid ${hasUnfinished ? '#fed7aa' : '#bbf7d0'}`,
            padding: '3px 10px',
            borderRadius: '100px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px'
          }}
        >
          {hasUnfinished ? (
            <>
              <AlertTriangle size={12} color="#c2410c" />
              <span>{unfinishedStudents.length} {unfinishedStudents.length === 1 ? 'OFFENE HAUSAUFGABE' : 'OFFENE HAUSAUFGABEN'}</span>
            </>
          ) : (
            <>
              <CheckCircle2 size={12} color="#15803d" />
              <span>100% DOKUMENTIERT</span>
            </>
          )}
        </span>
      </div>

      {/* 2. Nachhol-Pille bei fehlender Hausaufgabe (Simple, schlicht, kompakt) */}
      {hasUnfinished ? (
        <div 
          style={{
            background: '#fff7ed',
            border: '1.5px solid #fed7aa',
            borderRadius: '18px',
            padding: '14px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#9a3412', textTransform: 'uppercase' }}>
              Noch keine Hausaufgabe erfasst für:
            </span>
            <span style={{ fontSize: '0.70rem', fontWeight: 600, color: '#c2410c' }}>
              Kurz 5s-Sprachmemo oder Notiz nachtragen
            </span>
          </div>

          {/* Horizontale Schüler-Pillen */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {unfinishedStudents.map(std => {
              const stdId = std.id || std.studentId || '';
              const isSelected = activeCatchUpStudentId === stdId;
              const name = formatTagesKompassStudentName(std);

              return (
                <button
                  key={stdId}
                  type="button"
                  onClick={() => setActiveCatchUpStudentId(isSelected ? null : stdId)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: isSelected ? '#ea580c' : '#ffffff',
                    color: isSelected ? '#ffffff' : '#9a3412',
                    border: isSelected ? '1.5px solid #ea580c' : '1px solid #fed7aa',
                    padding: '6px 12px',
                    borderRadius: '10px',
                    fontSize: '0.80rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span>{name}</span>
                  <ChevronRight size={13} style={{ transform: isSelected ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }} />
                </button>
              );
            })}
          </div>

          {/* Aufgeklapptes Smart-Input für den ausgewählten Schüler */}
          {activeCatchUpStudentId && activeStudentObj && (
            <div style={{ marginTop: '4px', animation: 'fadeIn 0.2s ease' }}>
              <TagesKompassSmartInput
                studentId={activeCatchUpStudentId}
                studentName={formatTagesKompassStudentName(activeStudentObj)}
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
                    marginTop: '6px',
                    background: 'transparent',
                    border: '1px dashed #fed7aa',
                    borderRadius: '10px',
                    padding: '6px 10px',
                    fontSize: '0.74rem',
                    fontWeight: 800,
                    color: '#9a3412',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Zap size={12} color="#c2410c" />
                  <span>Im Schnellmodal (mit Metronom & Didaktik-Chips) öffnen</span>
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        // 100% Vollständig (Belohnend & Ruhig)
        <div 
          style={{
            background: '#f0fdf4',
            border: '1.5px solid #bbf7d0',
            borderRadius: '18px',
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}
        >
          <div 
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
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
            <div style={{ fontSize: '0.88rem', fontWeight: 900, color: '#166534' }}>
              Alle heutigen Unterrichtsstunden sind dokumentiert.
            </div>
            <div style={{ fontSize: '0.74rem', fontWeight: 600, color: '#15803d' }}>
              Alle Schüler und Eltern haben ihre Aufgaben erhalten.
            </div>
          </div>
        </div>
      )}

      {/* 3. Ausblick auf den nächsten Unterrichtstag */}
      {nextDaySummary && (
        <div 
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={16} color="#64748b" />
            <span style={{ fontSize: '0.80rem', fontWeight: 800, color: '#1e293b' }}>
              Nächster Unterricht: {nextDaySummary.dayName || 'Nächster Unterrichtstag'}
            </span>
          </div>

          <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748b' }}>
            {nextDaySummary.totalAppointments} Einheiten ab {nextDaySummary.firstStartTime} Uhr ({nextDaySummary.firstRoom})
          </span>
        </div>
      )}
    </div>
  );
};
