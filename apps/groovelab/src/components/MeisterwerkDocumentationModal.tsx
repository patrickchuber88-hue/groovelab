import React, { useState, useEffect } from 'react';
import { X, Check, Award, Flame, AlertCircle } from 'lucide-react';
import Confetti from 'react-confetti';
import { supabase } from '../lib/supabase';

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  photo_url?: string;
}

interface MeisterwerkDocumentationModalProps {
  student: Student;
  onClose: () => void;
}

interface ProgressItem {
  id?: string;
  topic_name: string;
  status: 'IN_PROGRESS' | 'THEORY_DONE' | 'MASTERED';
  is_current_homework: boolean;
  teacher_notes: string;
  updated_at?: string;
}

export const MeisterwerkDocumentationModal: React.FC<MeisterwerkDocumentationModalProps> = ({ student, onClose }) => {
  const [progressItems, setProgressItems] = useState<ProgressItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State for editing / adding
  const [activeItem, setActiveItem] = useState<ProgressItem | null>(null);
  const [topicName, setTopicName] = useState('');
  const [status, setStatus] = useState<'IN_PROGRESS' | 'THEORY_DONE' | 'MASTERED'>('IN_PROGRESS');
  const [isCurrentHomework, setIsCurrentHomework] = useState(false);
  const [teacherNotes, setTeacherNotes] = useState('');

  // Confetti State
  const [showConfetti, setShowConfetti] = useState(false);
  const [windowDimensions, setWindowDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });

  useEffect(() => {
    const handleResize = () => {
      setWindowDimensions({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch student's progress
  const fetchProgress = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch via direct supabase query as primary data fetch to guarantee real-time state
      const { data, error: dbError } = await supabase
        .from('progress_matrix')
        .select('*')
        .eq('student_id', student.id)
        .order('updated_at', { ascending: false });

      if (dbError) throw dbError;
      setProgressItems(data || []);
    } catch (err: any) {
      console.error('Error fetching progress:', err);
      setError('Fehler beim Laden des Lernfortschritts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProgress();
  }, [student.id]);

  const selectItemForEditing = (item: ProgressItem) => {
    setActiveItem(item);
    setTopicName(item.topic_name);
    setStatus(item.status);
    setIsCurrentHomework(item.is_current_homework);
    setTeacherNotes(item.teacher_notes || '');
  };

  const handleCreateNew = () => {
    setActiveItem(null);
    setTopicName('');
    setStatus('IN_PROGRESS');
    setIsCurrentHomework(false);
    setTeacherNotes('');
  };

  const handleStatusChange = (newStatus: 'IN_PROGRESS' | 'THEORY_DONE' | 'MASTERED') => {
    setStatus(newStatus);
    if (newStatus === 'MASTERED') {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 5000);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topicName.trim()) {
      alert('Bitte geben Sie ein Thema oder einen Songnamen ein.');
      return;
    }

    setSaving(true);
    setError(null);

    const payload = {
      id: activeItem?.id,
      studentId: student.id,
      topicName: topicName.trim(),
      status,
      isCurrentHomework,
      teacherNotes: teacherNotes.trim()
    };

    try {
      // 1. Try to post to API endpoint
      const response = await fetch('/api/teacher/save-progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionStorage.getItem('sb-access-token') || ''}`
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        await fetchProgress();
        handleCreateNew();
        return;
      }

      // 2. Direct Supabase update/insert fallback
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Nicht authentifiziert.');

      const row = {
        student_id: student.id,
        teacher_id: user.id,
        topic_name: topicName.trim(),
        status,
        is_current_homework: isCurrentHomework,
        teacher_notes: teacherNotes.trim(),
        updated_at: new Date().toISOString()
      };

      let dbError;
      if (activeItem?.id) {
        const { error } = await supabase
          .from('progress_matrix')
          .update(row)
          .eq('id', activeItem.id);
        dbError = error;
      } else {
        // Check if combination already exists
        const { data: existing } = await supabase
          .from('progress_matrix')
          .select('id')
          .eq('student_id', student.id)
          .eq('topic_name', topicName.trim())
          .maybeSingle();

        if (existing) {
          const { error } = await supabase
            .from('progress_matrix')
            .update(row)
            .eq('id', existing.id);
          dbError = error;
        } else {
          const { error } = await supabase
            .from('progress_matrix')
            .insert(row);
          dbError = error;
        }
      }

      if (dbError) throw dbError;

      await fetchProgress();
      handleCreateNew();
    } catch (err: any) {
      console.error('Error saving progress:', err);
      setError('Fehler beim Speichern des Fortschritts.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 4000,
      background: 'rgba(9, 9, 11, 0.75)',
      backdropFilter: 'blur(16px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      fontFamily: '"Outfit", sans-serif'
    }}>
      {showConfetti && (
        <Confetti
          width={windowDimensions.width}
          height={windowDimensions.height}
          recycle={false}
          numberOfPieces={400}
          gravity={0.15}
        />
      )}

      <div style={{
        background: 'white',
        borderRadius: '32px',
        width: '100%',
        maxWidth: '960px',
        maxHeight: '90vh',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        border: '1px solid rgba(226, 232, 240, 0.8)'
      }} className="animation-slide-up">
        {/* Header */}
        <div style={{
          padding: '24px 32px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#f8fafc'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              overflow: 'hidden',
              boxShadow: '0 4px 10px rgba(0,0,0,0.05)',
              border: '2px solid white'
            }}>
              <img
                src={student.photo_url || '/avatar_ghost.jpg'}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                alt=""
              />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>
                [ TAGESKOMPASS ] Meisterwerk-Protokoll
              </h2>
              <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '4px 0 0 0', fontWeight: 700 }}>
                Fortschritt dokumentieren für: {student.first_name} {student.last_name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(0,0,0,0.05)',
              border: 'none',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#64748b',
              transition: 'all 0.2s'
            }}
            className="hover-scale"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Content - Split layout */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }} className="flex-col md:flex-row">
          {/* Left Column: List of existing topics */}
          <div style={{
            flex: '1.2 1 0%',
            borderRight: '1px solid #f1f5f9',
            padding: '24px 32px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            background: '#fafbfd'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Bisherige Themen
              </span>
              <button
                onClick={handleCreateNew}
                style={{
                  background: '#e0e7ff',
                  color: '#4f46e5',
                  border: 'none',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                + Neu anlegen
              </button>
            </div>

            {loading ? (
              <div style={{ padding: '40px 0', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                Dokumentation wird geladen...
              </div>
            ) : progressItems.length === 0 ? (
              <div style={{ padding: '40px 0', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem', fontStyle: 'italic' }}>
                Noch kein Fortschritt dokumentiert.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {progressItems.map((item) => {
                  const isEditing = activeItem?.id === item.id;
                  
                  let statusBg = '#f1f5f9';
                  let statusColor = '#475569';
                  let statusText = 'In Arbeit';

                  if (item.status === 'THEORY_DONE') {
                    statusBg = '#f3e8ff';
                    statusColor = '#6b21a8';
                    statusText = 'Theorie';
                  } else if (item.status === 'MASTERED') {
                    statusBg = '#d1fae5';
                    statusColor = '#065f46';
                    statusText = 'Meister';
                  }

                  return (
                    <div
                      key={item.id}
                      onClick={() => selectItemForEditing(item)}
                      style={{
                        padding: '16px',
                        background: 'white',
                        borderRadius: '20px',
                        border: isEditing ? '2px solid #4f46e5' : '1px solid #e2e8f0',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        boxShadow: isEditing ? '0 4px 15px rgba(79, 70, 229, 0.08)' : '0 2px 5px rgba(0,0,0,0.01)',
                        position: 'relative',
                        overflow: 'hidden'
                      }}
                      className="hover-scale"
                    >
                      {item.is_current_homework && (
                        <div
                          style={{
                            position: 'absolute',
                            left: 0,
                            top: 0,
                            bottom: 0,
                            width: '4px',
                            background: '#06b6d4',
                            boxShadow: '0 0 10px #06b6d4'
                          }}
                          className="animate-pulse"
                        />
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <span style={{ fontWeight: 800, fontSize: '0.92rem', color: '#1e293b' }}>
                          {item.topic_name}
                        </span>
                        <span style={{
                          background: statusBg,
                          color: statusColor,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '0.68rem',
                          fontWeight: 900,
                          textTransform: 'uppercase'
                        }}>
                          {statusText}
                        </span>
                      </div>
                      
                      {item.teacher_notes && (
                        <p style={{
                          fontSize: '0.78rem',
                          color: '#64748b',
                          margin: 0,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          fontWeight: 500
                        }}>
                          {item.teacher_notes}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Form Editor */}
          <div style={{
            flex: '1 1 0%',
            padding: '24px 32px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px'
          }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {activeItem ? 'Dokumentation bearbeiten' : 'Neue Dokumentation'}
            </span>

            {error && (
              <div style={{
                background: '#fef2f2',
                border: '1px solid #fca5a5',
                padding: '12px 16px',
                borderRadius: '16px',
                color: '#991b1b',
                fontSize: '0.8rem',
                fontWeight: 750,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Topic Input */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 800, color: '#475569' }}>
                  Songtitel / Thema
                </label>
                <input
                  type="text"
                  placeholder="z.B. Stand by Me - Strophe"
                  value={topicName}
                  onChange={(e) => setTopicName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '14px',
                    border: '1.5px solid #e2e8f0',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    outline: 'none'
                  }}
                  required
                />
              </div>

              {/* Status matrix grids (3 colors) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 800, color: '#475569' }}>
                  Fortschritts-Status
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                  {/* IN PROGRESS (Yellow) */}
                  <button
                    type="button"
                    onClick={() => handleStatusChange('IN_PROGRESS')}
                    style={{
                      padding: '12px 8px',
                      borderRadius: '14px',
                      border: status === 'IN_PROGRESS' ? '2.5px solid #eab308' : '1px solid #cbd5e1',
                      background: status === 'IN_PROGRESS' ? '#fef9c3' : 'white',
                      color: status === 'IN_PROGRESS' ? '#854d0e' : '#64748b',
                      fontSize: '0.72rem',
                      fontWeight: 900,
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'all 0.2s',
                      boxShadow: status === 'IN_PROGRESS' ? '0 4px 12px rgba(234,179,8,0.15)' : 'none'
                    }}
                    className="hover-scale"
                  >
                    <span style={{ fontSize: '1.25rem' }}>🟡</span>
                    <span>In Arbeit</span>
                  </button>

                  {/* THEORY DONE (Purple) */}
                  <button
                    type="button"
                    onClick={() => handleStatusChange('THEORY_DONE')}
                    style={{
                      padding: '12px 8px',
                      borderRadius: '14px',
                      border: status === 'THEORY_DONE' ? '2.5px solid #a855f7' : '1px solid #cbd5e1',
                      background: status === 'THEORY_DONE' ? '#f3e8ff' : 'white',
                      color: status === 'THEORY_DONE' ? '#6b21a8' : '#64748b',
                      fontSize: '0.72rem',
                      fontWeight: 900,
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'all 0.2s',
                      boxShadow: status === 'THEORY_DONE' ? '0 4px 12px rgba(168,85,247,0.15)' : 'none'
                    }}
                    className="hover-scale"
                  >
                    <span style={{ fontSize: '1.25rem' }}>🟣</span>
                    <span>Theorie</span>
                  </button>

                  {/* MASTERED (Green) */}
                  <button
                    type="button"
                    onClick={() => handleStatusChange('MASTERED')}
                    style={{
                      padding: '12px 8px',
                      borderRadius: '14px',
                      border: status === 'MASTERED' ? '2.5px solid #10b981' : '1px solid #cbd5e1',
                      background: status === 'MASTERED' ? '#d1fae5' : 'white',
                      color: status === 'MASTERED' ? '#065f46' : '#64748b',
                      fontSize: '0.72rem',
                      fontWeight: 900,
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'all 0.2s',
                      boxShadow: status === 'MASTERED' ? '0 4px 12px rgba(16,185,129,0.15)' : 'none'
                    }}
                    className="hover-scale"
                  >
                    <span style={{ fontSize: '1.25rem' }}>💚</span>
                    <span>Meisterwerk!</span>
                  </button>
                </div>
              </div>

              {/* Homework toggle */}
              <div style={{
                background: '#fafbfd',
                padding: '16px',
                borderRadius: '20px',
                border: isCurrentHomework ? '2px solid #06b6d4' : '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'all 0.3s',
                boxShadow: isCurrentHomework ? '0 0 15px rgba(6, 182, 212, 0.15)' : 'none'
              }} className={isCurrentHomework ? 'animate-pulse' : ''}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e293b' }}>
                    Hausaufgabe festlegen
                  </span>
                  <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>
                    Cyan-pulsierender Rahmen beim Schüler
                  </span>
                </div>
                <label style={{
                  position: 'relative',
                  display: 'inline-block',
                  width: '46px',
                  height: '24px',
                  cursor: 'pointer'
                }}>
                  <input
                    type="checkbox"
                    checked={isCurrentHomework}
                    onChange={(e) => setIsCurrentHomework(e.target.checked)}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span style={{
                    position: 'absolute',
                    cursor: 'pointer',
                    inset: 0,
                    backgroundColor: isCurrentHomework ? '#06b6d4' : '#cbd5e1',
                    transition: '.3s',
                    borderRadius: '24px'
                  }}>
                    <span style={{
                      position: 'absolute',
                      content: '""',
                      height: '18px',
                      width: '18px',
                      left: isCurrentHomework ? '24px' : '3px',
                      bottom: '3px',
                      backgroundColor: 'white',
                      transition: '.3s',
                      borderRadius: '50%'
                    }} />
                  </span>
                </label>
              </div>

              {/* Daily Briefing textarea */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 800, color: '#475569' }}>
                  Tägliche Notizen (Lehrer-Notiz)
                </label>
                <textarea
                  placeholder="z.B. Akkordwechsel flüssig, Tempo auf 80 BPM steigern."
                  value={teacherNotes}
                  onChange={(e) => setTeacherNotes(e.target.value)}
                  style={{
                    width: '100%',
                    height: '100px',
                    padding: '12px 16px',
                    borderRadius: '14px',
                    border: '1.5px solid #e2e8f0',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    outline: 'none',
                    resize: 'none',
                    fontFamily: 'inherit'
                  }}
                />
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                {activeItem && (
                  <button
                    type="button"
                    onClick={handleCreateNew}
                    style={{
                      flex: 1,
                      padding: '14px',
                      borderRadius: '14px',
                      border: '1.5px solid #cbd5e1',
                      background: 'white',
                      color: '#475569',
                      fontWeight: 800,
                      cursor: 'pointer',
                      fontSize: '0.85rem'
                    }}
                  >
                    Abbrechen
                  </button>
                )}
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    flex: 2,
                    padding: '14px',
                    borderRadius: '14px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)',
                    color: 'white',
                    fontWeight: 900,
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    boxShadow: '0 4px 15px rgba(79, 70, 229, 0.2)'
                  }}
                >
                  {saving ? 'Wird gespeichert...' : 'Eintrag speichern'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
