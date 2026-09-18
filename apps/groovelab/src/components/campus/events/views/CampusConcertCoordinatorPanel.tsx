import React, { useState, useMemo } from 'react';
import { 
  CalendarDays, 
  X, 
  Clock, 
  MapPin, 
  Users, 
  Music, 
  Download, 
  FileText, 
  Sliders, 
  Check, 
  AlertTriangle, 
  CheckCircle2, 
  ChevronUp, 
  ChevronDown, 
  Trash2,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { CampusEvent, ProgramPoint } from '../types/campusEvents.types';
import { calculateTimelineTimes, parseTechRequirements } from '../utils/campusEventsUtils';
import { formatGermanDate } from '../../../../utils/formatters';
import { formatCombinedStudentNames } from '../../../../utils/nameHelper';

interface CampusConcertCoordinatorPanelProps {
  activeEvent: CampusEvent;
  onClose: () => void;
  brandColor: string;
  programPoints: ProgramPoint[];
  loadingProgramPoints: boolean;
  activeStage: number;
  setActiveStage: (s: number) => void;
  stageCount: number;
  techViewMode: 'single' | 'all';
  setTechViewMode: (m: 'single' | 'all') => void;
  coordinatorTab: 'eckdaten' | 'submissions' | 'timeline' | 'feedback' | 'tech' | 'export';
  setCoordinatorTab: (tab: 'eckdaten' | 'submissions' | 'timeline' | 'feedback' | 'tech' | 'export') => void;
  techConsoleNightMode: boolean;
  setTechConsoleNightMode: (night: boolean) => void;
  handleExportPDF: () => void;
  handleExportTechRiderPDF: () => void;
  handleExportCSV: () => void;
  handleUpdateProgramPointStatus: (ppId: string, status: 'approved' | 'rejected') => void;
  handleDeleteProgramPoint: (ppId: string) => void;
  handleMoveProgramPoint: (ppId: string, dir: 'up' | 'down') => void;
  onOpenTeacherSubmission?: (ev: CampusEvent) => void;
  asOverlay?: boolean;
}

export function CampusConcertCoordinatorPanel({
  activeEvent,
  onClose,
  brandColor,
  programPoints,
  loadingProgramPoints,
  activeStage,
  setActiveStage,
  stageCount,
  techViewMode,
  setTechViewMode,
  coordinatorTab,
  setCoordinatorTab,
  techConsoleNightMode,
  setTechConsoleNightMode,
  handleExportPDF,
  handleExportTechRiderPDF,
  handleExportCSV,
  handleUpdateProgramPointStatus,
  handleDeleteProgramPoint,
  handleMoveProgramPoint,
  onOpenTeacherSubmission,
  asOverlay = false
}: CampusConcertCoordinatorPanelProps) {
  const activeEventStartTime = activeEvent.event_start_time || activeEvent.start_time || '14:00';
  const timeMap = useMemo(() => {
    return calculateTimelineTimes(programPoints, activeEventStartTime);
  }, [programPoints, activeEventStartTime]);

  const stagePoints = useMemo(() => {
    return programPoints
      .filter(p => (p.stage_number || 1) === activeStage && (p.is_scheduled || p.is_pause))
      .sort((a, b) => a.sort_order - b.sort_order);
  }, [programPoints, activeStage]);

  const panelContent = (
    <div style={{
      background: asOverlay ? 'transparent' : 'rgba(255, 255, 255, 0.4)',
      border: asOverlay ? 'none' : '1px solid rgba(255, 255, 255, 0.5)',
      borderRadius: asOverlay ? '0' : '24px',
      padding: asOverlay ? '0' : '24px',
      boxShadow: asOverlay ? 'none' : '0 8px 32px rgba(0,0,0,0.03)',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      height: '100%',
      overflow: 'hidden'
    }}>
      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span style={{ fontSize: '0.68rem', fontWeight: 800, color: brandColor, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            PLANUNGS-MODUL
          </span>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#1d1d1f', margin: '2px 0 0 0' }}>
            {activeEvent.title}
          </h3>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {onOpenTeacherSubmission && (
            <button
              onClick={() => onOpenTeacherSubmission(activeEvent)}
              style={{
                background: '#f1f5f9',
                border: '1.5px solid #cbd5e1',
                borderRadius: '16px',
                padding: '6px 14px',
                fontSize: '0.76rem',
                fontWeight: 800,
                color: '#475569',
                cursor: 'pointer'
              }}
            >
              Einreichungen
            </button>
          )}
          <button
            onClick={onClose}
            style={{
              background: '#f1f5f9',
              border: 'none',
              borderRadius: '50%',
              width: '34px',
              height: '34px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={16} color="#64748b" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid #e2e8f0',
        gap: '8px',
        overflowX: 'auto',
        paddingBottom: '2px'
      }}>
        {[
          { id: 'eckdaten', label: 'Eckdaten' },
          { id: 'submissions', label: 'Einreichungen' },
          { id: 'timeline', label: 'Programm' },
          { id: 'tech', label: 'Technik' },
          { id: 'export', label: 'Export' }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setCoordinatorTab(t.id as any)}
            style={{
              background: 'transparent',
              border: 'none',
              borderBottom: coordinatorTab === t.id ? `3px solid ${brandColor}` : '3px solid transparent',
              color: coordinatorTab === t.id ? '#0f172a' : '#64748b',
              padding: '8px 14px',
              fontWeight: coordinatorTab === t.id ? 800 : 600,
              fontSize: '0.84rem',
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* 1. Eckdaten */}
        {coordinatorTab === 'eckdaten' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            <div style={{ background: '#ffffff', border: '1px solid #f1f5f9', borderRadius: '16px', padding: '16px' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Datum & Uhrzeit</div>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                {formatGermanDate(activeEvent.event_date)} &middot; {activeEventStartTime} Uhr
              </div>
            </div>
            <div style={{ background: '#ffffff', border: '1px solid #f1f5f9', borderRadius: '16px', padding: '16px' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Ort / Bühne</div>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                {activeEvent.location || activeEvent.room?.name || 'Musikschule'}
              </div>
            </div>
            <div style={{ background: '#ffffff', border: '1px solid #f1f5f9', borderRadius: '16px', padding: '16px' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Bühnenanzahl</div>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                {stageCount} Bühne(n)
              </div>
            </div>
          </div>
        )}

        {/* 2. Submissions */}
        {coordinatorTab === 'submissions' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {programPoints.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: '#94a3b8', fontSize: '0.84rem' }}>
                Bisher keine Einreichungen eingegangen.
              </div>
            ) : (
              programPoints.map(pp => (
                <div key={pp.id} style={{
                  background: '#ffffff',
                  border: '1px solid #f1f5f9',
                  borderRadius: '14px',
                  padding: '12px 16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <strong style={{ fontSize: '0.88rem', color: '#0f172a' }}>{pp.name}</strong>
                    <div style={{ fontSize: '0.76rem', color: '#64748b' }}>
                      {pp.ensemble_band || 'Einzelbeitrag'} &middot; {pp.duration} Min &middot; Status: {pp.status || 'submitted'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={() => handleUpdateProgramPointStatus(pp.id, 'approved')}
                      style={{
                        background: '#e6f4ea',
                        border: 'none',
                        color: '#15803d',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      Genehmigen
                    </button>
                    <button
                      onClick={() => handleDeleteProgramPoint(pp.id)}
                      style={{
                        background: '#fef2f2',
                        border: 'none',
                        color: '#ef4444',
                        padding: '6px',
                        borderRadius: '8px',
                        cursor: 'pointer'
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* 3. Timeline / Programm */}
        {coordinatorTab === 'timeline' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Stage Selector */}
            {stageCount > 1 && (
              <div style={{ display: 'flex', gap: '8px' }}>
                {Array.from({ length: stageCount }, (_, i) => i + 1).map(s => (
                  <button
                    key={s}
                    onClick={() => setActiveStage(s)}
                    style={{
                      background: activeStage === s ? brandColor : '#f1f5f9',
                      color: activeStage === s ? '#ffffff' : '#64748b',
                      border: 'none',
                      padding: '6px 14px',
                      borderRadius: '10px',
                      fontWeight: 800,
                      fontSize: '0.78rem',
                      cursor: 'pointer'
                    }}
                  >
                    Bühne {s}
                  </button>
                ))}
              </div>
            )}

            {/* Stage Points Table */}
            <div style={{ background: '#ffffff', border: '1px solid #f1f5f9', borderRadius: '16px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                    <th style={{ padding: '12px 16px', fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase' }}>Zeit</th>
                    <th style={{ padding: '12px 16px', fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase' }}>Beitrag &amp; Besetzung</th>
                    <th style={{ padding: '12px 16px', fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase' }}>Dauer</th>
                    <th style={{ padding: '12px 16px', fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', textAlign: 'right' }}>Aktionen</th>
                  </tr>
                </thead>
                <tbody>
                  {stagePoints.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ padding: '32px', textAlign: 'center', color: '#94a3b8', fontSize: '0.84rem' }}>
                        Keine Beiträge auf Bühne {activeStage}.
                      </td>
                    </tr>
                  ) : (
                    stagePoints.map((pp, idx) => {
                      const timeInfo = timeMap[pp.id] || { start: '--:--', end: '--:--' };
                      return (
                        <tr key={pp.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                          <td style={{ padding: '12px 16px', fontWeight: 800, fontSize: '0.84rem', color: '#0f172a' }}>
                            {timeInfo.start} &ndash; {timeInfo.end}
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <strong style={{ fontSize: '0.88rem', color: '#0f172a' }}>{pp.name}</strong>
                            <div style={{ fontSize: '0.74rem', color: '#64748b' }}>{pp.ensemble_band || 'Einzelbeitrag'}</div>
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: '0.82rem', color: '#475569' }}>
                            {pp.duration} Min
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: '4px' }}>
                              <button
                                disabled={idx === 0}
                                onClick={() => handleMoveProgramPoint(pp.id, 'up')}
                                style={{
                                  background: '#f1f5f9',
                                  border: 'none',
                                  padding: '4px 8px',
                                  borderRadius: '6px',
                                  cursor: idx === 0 ? 'not-allowed' : 'pointer',
                                  opacity: idx === 0 ? 0.3 : 1
                                }}
                              >
                                <ChevronUp size={14} />
                              </button>
                              <button
                                disabled={idx === stagePoints.length - 1}
                                onClick={() => handleMoveProgramPoint(pp.id, 'down')}
                                style={{
                                  background: '#f1f5f9',
                                  border: 'none',
                                  padding: '4px 8px',
                                  borderRadius: '6px',
                                  cursor: idx === stagePoints.length - 1 ? 'not-allowed' : 'pointer',
                                  opacity: idx === stagePoints.length - 1 ? 0.3 : 1
                                }}
                              >
                                <ChevronDown size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 4. Technik */}
        {coordinatorTab === 'tech' && (
          <div style={{ background: '#ffffff', border: '1px solid #f1f5f9', borderRadius: '16px', padding: '20px' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '1rem', fontWeight: 800 }}>Signal- &amp; Patchplan (FOH)</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {stagePoints.map(pp => {
                const timeInfo = timeMap[pp.id] || { start: '--:--', end: '--:--' };
                const techItems = parseTechRequirements(pp.tech_requirements);
                return (
                  <div key={pp.id} style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
                    <strong style={{ fontSize: '0.86rem' }}>{timeInfo.start} &ndash; {pp.name}</strong>
                    <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px' }}>
                      {techItems.length > 0 ? (
                        techItems.map((item, i) => (
                          <span key={i} style={{ display: 'inline-block', marginRight: '10px', background: '#f8fafc', padding: '2px 6px', borderRadius: '4px' }}>
                            {item.count}× {item.type} {item.connection ? `(${item.connection})` : ''}
                          </span>
                        ))
                      ) : (
                        <span>Kein spezieller Audiobedarf gemeldet.</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 5. Export */}
        {coordinatorTab === 'export' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
            <div style={{ background: '#ffffff', border: '1px solid #f1f5f9', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '12px' }}>
              <div>
                <FileText size={24} color="#0284c7" />
                <h4 style={{ margin: '8px 0 4px 0', fontSize: '0.96rem', fontWeight: 800 }}>Besucher-Programm (PDF)</h4>
                <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b', lineHeight: 1.4 }}>
                  Generiert ein übersichtliches Programmheft für Konzertbesucher, sortiert nach Bühnen und Uhrzeiten.
                </p>
              </div>
              <button
                onClick={handleExportPDF}
                style={{
                  background: '#0284c7',
                  border: 'none',
                  color: '#ffffff',
                  padding: '10px 16px',
                  borderRadius: '12px',
                  fontWeight: 800,
                  fontSize: '0.8rem',
                  cursor: 'pointer'
                }}
              >
                Programmheft drucken / PDF
              </button>
            </div>

            <div style={{ background: '#ffffff', border: '1px solid #f1f5f9', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '12px' }}>
              <div>
                <Sliders size={24} color="#15803d" />
                <h4 style={{ margin: '8px 0 4px 0', fontSize: '0.96rem', fontWeight: 800 }}>Technik-Rider (PDF)</h4>
                <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b', lineHeight: 1.4 }}>
                  Erstellt ein detailliertes Übersichtsblatt für Tontechniker und Stagehands für Bühne {activeStage}.
                </p>
              </div>
              <button
                onClick={handleExportTechRiderPDF}
                style={{
                  background: '#15803d',
                  border: 'none',
                  color: '#ffffff',
                  padding: '10px 16px',
                  borderRadius: '12px',
                  fontWeight: 800,
                  fontSize: '0.8rem',
                  cursor: 'pointer'
                }}
              >
                Technik-Rider drucken / PDF
              </button>
            </div>

            <div style={{ background: '#ffffff', border: '1px solid #f1f5f9', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '12px' }}>
              <div>
                <Download size={24} color="#475569" />
                <h4 style={{ margin: '8px 0 4px 0', fontSize: '0.96rem', fontWeight: 800 }}>Rohdaten (CSV)</h4>
                <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b', lineHeight: 1.4 }}>
                  Exportiert die gesamte Tabelle als CSV für Tabellenkalkulationen wie Excel oder Numbers.
                </p>
              </div>
              <button
                onClick={handleExportCSV}
                style={{
                  background: '#475569',
                  border: 'none',
                  color: '#ffffff',
                  padding: '10px 16px',
                  borderRadius: '12px',
                  fontWeight: 800,
                  fontSize: '0.8rem',
                  cursor: 'pointer'
                }}
              >
                Tabelle als CSV laden
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (asOverlay) {
    return (
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          animation: 'fadeIn 0.15s ease'
        }}
      >
        <div
          onClick={e => e.stopPropagation()}
          style={{
            background: '#ffffff',
            width: '100vw',
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            padding: '24px 32px'
          }}
        >
          {panelContent}
        </div>
      </div>
    );
  }

  return panelContent;
}
