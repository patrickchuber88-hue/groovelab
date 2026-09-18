import React, { useState } from 'react';
import { Info, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { CampusEvent, ProgramPoint } from '../types/campusEvents.types';

interface CampusAnnouncementsColumnProps {
  schoolAnnouncements: any[];
  programPoints?: ProgramPoint[];
  customEvents?: CampusEvent[];
  role: 'student' | 'teacher' | 'admin' | 'secretary';
  schoolId: string;
  userId: string;
  brandColor: string;
  fetchAnnouncements: () => void;
  onOpenTeacherFeedback?: (event: CampusEvent) => void;
}

export const CampusAnnouncementsColumn: React.FC<CampusAnnouncementsColumnProps> = ({
  schoolAnnouncements,
  programPoints = [],
  customEvents = [],
  role,
  schoolId,
  userId,
  brandColor,
  fetchAnnouncements,
  onOpenTeacherFeedback
}) => {
  const [showAnnForm, setShowAnnForm] = useState(false);
  const [annTitle, setAnnTitle] = useState('');
  const [annMessage, setAnnMessage] = useState('');
  const [annTarget, setAnnTarget] = useState<'all' | 'teachers' | 'students'>('all');
  const [submittingAnn, setSubmittingAnn] = useState(false);

  const pendingQPs = programPoints.filter(pp => 
    pp.teacher_id === userId && 
    pp.additional_feedback_responses?.questions?.some((_: any, idx: number) => !pp.additional_feedback_responses.answers?.[idx])
  );

  return (
    <div id="tour-announcements-column" style={{
      background: '#ffffff',
      border: '1px solid rgba(0, 0, 0, 0.05)',
      borderRadius: '24px',
      padding: '16px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.02)',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      width: '100%',
      minWidth: 0,
      boxSizing: 'border-box',
      height: 'calc(100vh - 120px)',
      overflowY: 'auto'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 900, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Info size={18} color={brandColor} /> Infos der Verwaltung
          </h3>
          <p style={{ color: '#64748b', fontSize: '0.74rem', margin: '4px 0 0 0', fontWeight: 550, lineHeight: 1.4 }}>
            Mitteilungen &amp; Ankündigungen der Schulleitung
          </p>
        </div>
        {(role === 'admin' || role === 'secretary') && (
          <button
            type="button"
            onClick={() => setShowAnnForm(f => !f)}
            style={{
              background: showAnnForm ? '#f1f5f9' : brandColor,
              color: showAnnForm ? '#475569' : '#ffffff',
              border: 'none',
              borderRadius: '10px',
              padding: '7px 14px',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer',
              flexShrink: 0
            }}
          >
            {showAnnForm ? '✕ Schließen' : '＋ Neu'}
          </button>
        )}
      </div>

      {(role === 'admin' || role === 'secretary') && showAnnForm && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!annTitle.trim() || !annMessage.trim()) return;
            setSubmittingAnn(true);
            try {
              const { error } = await supabase
                .from('campus_announcements')
                .insert({
                  school_id: schoolId,
                  user_id: userId,
                  title: annTitle.trim(),
                  message: annMessage.trim(),
                  target_type: annTarget
                });
              if (!error) {
                setAnnTitle('');
                setAnnMessage('');
                setAnnTarget('all');
                setShowAnnForm(false);
                fetchAnnouncements();
              }
            } catch (err) {
              console.error(err);
            } finally {
              setSubmittingAnn(false);
            }
          }}
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}
        >
          <input
            placeholder="Titel..."
            value={annTitle}
            onChange={e => setAnnTitle(e.target.value)}
            required
            style={{
              padding: '10px 14px',
              borderRadius: '10px',
              border: '1px solid #cbd5e1',
              fontSize: '0.82rem',
              width: '100%',
              boxSizing: 'border-box'
            }}
          />
          <textarea
            placeholder="Mitteilung schreiben..."
            value={annMessage}
            onChange={e => setAnnMessage(e.target.value)}
            required
            style={{
              padding: '10px 14px',
              borderRadius: '10px',
              border: '1px solid #cbd5e1',
              fontSize: '0.82rem',
              minHeight: '80px',
              width: '100%',
              boxSizing: 'border-box'
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
            <select
              value={annTarget}
              onChange={e => setAnnTarget(e.target.value as any)}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.74rem',
                background: '#ffffff'
              }}
            >
              <option value="all">Sichtbar für alle</option>
              <option value="teachers">Nur Lehrkräfte</option>
              <option value="students">Nur Schüler</option>
            </select>
            <button
              type="submit"
              disabled={submittingAnn}
              style={{
                background: brandColor,
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                padding: '8px 18px',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              {submittingAnn ? 'Speichern...' : 'Speichern'}
            </button>
          </div>
        </form>
      )}

      {pendingQPs.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#b45309' }}>
            ⚠️ Offene Rückfragen ({pendingQPs.length})
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {pendingQPs.map(pp => {
              const ev = customEvents.find(e => e.id === pp.event_id);
              const evName = ev ? ev.title : 'Event';
              return (
                <div 
                  key={pp.id} 
                  onClick={() => {
                    if (ev) {
                      onOpenTeacherFeedback?.(ev);
                    }
                  }}
                  style={{
                    background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
                    border: '1px solid #f59e0b',
                    borderRadius: '14px',
                    padding: '12px 16px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(245, 158, 11, 0.05)',
                    transition: 'all 0.2s',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#92400e', textTransform: 'uppercase' }}>
                      {evName}
                    </span>
                    <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#b45309' }}>→ Beantworten</span>
                  </div>
                  <strong style={{ fontSize: '0.84rem', color: '#0f172a', fontWeight: 800 }}>
                    {pp.name}
                  </strong>
                  <span style={{ fontSize: '0.74rem', color: '#451a03', fontWeight: 550 }}>
                    {pp.additional_feedback_responses?.questions?.filter((_: any, idx: number) => !pp.additional_feedback_responses.answers?.[idx]).length} offene Frage(n)
                  </span>
                </div>
              );
            })}
          </div>
          <div style={{ height: '1px', background: '#e2e8f0', margin: '8px 0' }} />
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {schoolAnnouncements.length === 0 ? (
          <div style={{
            background: '#f8fafc',
            border: '1.5px dashed #e2e8f0',
            borderRadius: '16px',
            padding: '32px 16px',
            textAlign: 'center',
            color: '#64748b',
            fontSize: '0.82rem'
          }}>
            📋 Keine Mitteilungen vorhanden
          </div>
        ) : (
          schoolAnnouncements.map((ann: any, idx: number) => {
            const dateObj = new Date(ann.created_at);
            const dateStr = `${dateObj.getDate()}.${dateObj.getMonth() + 1}.${dateObj.getFullYear()}`;

            return (
              <div
                key={ann.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  paddingBottom: idx < schoolAnnouncements.length - 1 ? '16px' : '0',
                  borderBottom: idx < schoolAnnouncements.length - 1 ? '1px solid #f1f5f9' : 'none'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>{dateStr}</span>
                  {(role === 'admin' || role === 'secretary') && (
                    <button
                      type="button"
                      onClick={async () => {
                        if (window.confirm('Diese Mitteilung wirklich löschen?')) {
                          try {
                            const { error } = await supabase
                              .from('campus_announcements')
                              .delete()
                              .eq('id', ann.id);
                            if (!error) {
                              fetchAnnouncements();
                            } else {
                              alert('Fehler beim Löschen: ' + error.message);
                            }
                          } catch (err: any) {
                            alert('Fehler: ' + err.message);
                          }
                        }
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#ef4444',
                        cursor: 'pointer',
                        padding: '2px',
                        display: 'flex',
                        alignItems: 'center',
                        opacity: 0.5,
                        transition: 'opacity 0.2s'
                      }}
                      title="Löschen"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
                <strong style={{ fontSize: '0.94rem', color: '#1a253c', fontWeight: 800 }}>{ann.title}</strong>
                <p style={{ margin: 0, fontSize: '0.82rem', color: '#475569', lineHeight: 1.5 }}>{ann.message}</p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
