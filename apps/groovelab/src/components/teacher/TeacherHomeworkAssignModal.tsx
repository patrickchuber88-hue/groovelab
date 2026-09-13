import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Send,
  Users,
  User,
  Search,
  CheckSquare,
  Square,
  BookOpen,
  Music,
  Mic,
  FileText,
  Calendar,
  AlertCircle,
  Sparkles,
  Check
} from 'lucide-react';
import { maskLastName } from '../../utils/nameHelper';
import { assignTeacherHomeworkToStudents } from '../../services/teacherStudioService';

export interface TeacherHomeworkAssignModalProps {
  isOpen: boolean;
  onClose: () => void;
  teacher: any;
  allStudents: any[];
  todayStudents?: any[];
  currentWeekIso: string;
  currentWeekNum: string;
  currentNotesContent?: string;
  currentLehrwerke?: any[];
  currentSongs?: any[];
  currentAudios?: any[];
  onSuccess?: (assignedCount: number, studentNames: string[]) => void;
}

export const TeacherHomeworkAssignModal: React.FC<TeacherHomeworkAssignModalProps> = ({
  isOpen,
  onClose,
  teacher,
  allStudents = [],
  todayStudents = [],
  currentWeekIso,
  currentWeekNum,
  currentNotesContent = '',
  currentLehrwerke = [],
  currentSongs = [],
  currentAudios = [],
  onSuccess
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [includeNotes, setIncludeNotes] = useState(true);
  const [includeLehrwerke, setIncludeLehrwerke] = useState(true);
  const [includeSongs, setIncludeSongs] = useState(true);
  const [includeAudios, setIncludeAudios] = useState(true);
  const [targetWeekOffset, setTargetWeekOffset] = useState<0 | 1>(0); // 0 = this week, 1 = next week
  const [appendMode, setAppendMode] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize selection: default to todayStudents if available, else empty
  useEffect(() => {
    if (isOpen) {
      if (todayStudents && todayStudents.length > 0) {
        setSelectedStudentIds(new Set(todayStudents.map(s => String(s.id))));
      } else {
        setSelectedStudentIds(new Set());
      }
      setSearchQuery('');
      setErrorMessage(null);
      setIsSubmitting(false);
    }
  }, [isOpen, todayStudents]);

  // ESC Key listener for WCAG dialog parity
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  // Filtered Students
  const filteredStudents = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return allStudents.filter(s => {
      if (!s) return false;
      const firstName = (s.first_name || s.name?.split(' ')[0] || '').toLowerCase();
      const lastName = (s.last_name || '').toLowerCase();
      const instrument = (s.instrument || '').toLowerCase();
      return !q || firstName.includes(q) || lastName.includes(q) || instrument.includes(q);
    });
  }, [allStudents, searchQuery]);

  const toggleStudent = (id: string) => {
    setSelectedStudentIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAllToday = () => {
    if (todayStudents && todayStudents.length > 0) {
      setSelectedStudentIds(new Set(todayStudents.map(s => String(s.id))));
    }
  };

  const selectAll = () => {
    setSelectedStudentIds(new Set(allStudents.map(s => String(s.id))));
  };

  const clearSelection = () => {
    setSelectedStudentIds(new Set());
  };

  // Compute calculated target week
  const computedTargetWeekIso = useMemo(() => {
    if (targetWeekOffset === 0) return currentWeekIso;
    const parts = currentWeekIso.split('-W');
    if (parts.length === 2) {
      const year = parseInt(parts[0], 10);
      const wk = parseInt(parts[1], 10) + 1;
      return `${year}-W${String(wk).padStart(2, '0')}`;
    }
    return currentWeekIso;
  }, [currentWeekIso, targetWeekOffset]);

  const computedTargetWeekNum = useMemo(() => {
    const wk = parseInt(currentWeekNum || '1', 10) + targetWeekOffset;
    return String(wk).padStart(2, '0');
  }, [currentWeekNum, targetWeekOffset]);

  const handleExecuteAssign = async () => {
    if (selectedStudentIds.size === 0) {
      setErrorMessage('Bitte wähle mindestens einen Schüler aus.');
      return;
    }

    const teacherId = teacher?.id || teacher?.userId;
    const schoolId = teacher?.school_id || teacher?.schoolId;

    if (!teacherId || !schoolId) {
      setErrorMessage('Fehler: Lehrkraft-Identität oder Schulzuordnung fehlt.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      const targetStudentIdsArr = Array.from(selectedStudentIds);
      const res = await assignTeacherHomeworkToStudents({
        teacherId,
        schoolId,
        targetStudentIds: targetStudentIdsArr,
        targetWeekIso: computedTargetWeekIso,
        topicName: `Hausaufgabe KW ${computedTargetWeekNum}`,
        notesContent: includeNotes ? currentNotesContent : '',
        lehrwerke: includeLehrwerke ? currentLehrwerke : [],
        songs: includeSongs ? currentSongs : [],
        audios: includeAudios ? currentAudios : [],
        appendMode
      });

      if (!res.success) {
        setErrorMessage(res.error || 'Fehler beim Zuweisen der Hausaufgabe.');
        setIsSubmitting(false);
        return;
      }

      const assignedStudentNames = allStudents
        .filter(s => selectedStudentIds.has(String(s.id)))
        .map(s => s.first_name || s.name || 'Schüler');

      if (onSuccess) {
        onSuccess(res.assigned_count, assignedStudentNames);
      }
      onClose();
    } catch (err: any) {
      console.error('[TeacherHomeworkAssignModal] Error assigning:', err);
      setErrorMessage(err?.message || 'Unerwarteter Fehler.');
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Hausaufgabe an Schüler zuweisen"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(6px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        boxSizing: 'border-box'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '680px',
          maxHeight: '92vh',
          backgroundColor: '#ffffff',
          borderRadius: '24px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          fontFamily: "'Plus Jakarta Sans', sans-serif"
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(to right, #f8fafc, #ffffff)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: '#e0f2fe',
                color: '#0284c7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Send size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                Hausaufgabe an Schüler zuweisen
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                Kopiert vorbereitete Inhalte deterministisch in die Schüler-Aufgabenhefte
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Schließen"
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              border: '1px solid #e2e8f0',
              background: '#ffffff',
              color: '#64748b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div
          style={{
            padding: '20px 24px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            flex: 1
          }}
        >
          {errorMessage && (
            <div
              style={{
                padding: '12px 16px',
                borderRadius: '12px',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#991b1b',
                fontSize: '0.82rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <AlertCircle size={16} color="#dc2626" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 1. Ziel-Woche */}
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
              1. Ziel-Kalenderwoche
            </label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setTargetWeekOffset(0)}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: '12px',
                  border: targetWeekOffset === 0 ? '2px solid #0284c7' : '1px solid #cbd5e1',
                  background: targetWeekOffset === 0 ? '#f0f9ff' : '#ffffff',
                  color: targetWeekOffset === 0 ? '#0369a1' : '#475569',
                  fontWeight: 700,
                  fontSize: '0.86rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: 'pointer'
                }}
              >
                <Calendar size={16} />
                <span>Aktuelle Woche (KW {currentWeekNum})</span>
              </button>
              <button
                type="button"
                onClick={() => setTargetWeekOffset(1)}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: '12px',
                  border: targetWeekOffset === 1 ? '2px solid #0284c7' : '1px solid #cbd5e1',
                  background: targetWeekOffset === 1 ? '#f0f9ff' : '#ffffff',
                  color: targetWeekOffset === 1 ? '#0369a1' : '#475569',
                  fontWeight: 700,
                  fontSize: '0.86rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: 'pointer'
                }}
              >
                <Calendar size={16} />
                <span>Nächste Woche (KW {parseInt(currentWeekNum || '1', 10) + 1})</span>
              </button>
            </div>
          </div>

          {/* 2. Inhaltsauswahl */}
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
              2. Zu übertragende Inhalte
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setIncludeNotes(!includeNotes)}
                style={{
                  padding: '10px 12px',
                  borderRadius: '12px',
                  border: includeNotes ? '2px solid #10b981' : '1px solid #cbd5e1',
                  background: includeNotes ? '#ecfdf5' : '#ffffff',
                  color: includeNotes ? '#065f46' : '#64748b',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer'
                }}
              >
                {includeNotes ? <CheckSquare size={16} color="#10b981" /> : <Square size={16} />}
                <FileText size={15} />
                <span>Notizen ({currentNotesContent ? 'Vorhanden' : 'Leer'})</span>
              </button>

              <button
                type="button"
                onClick={() => setIncludeLehrwerke(!includeLehrwerke)}
                style={{
                  padding: '10px 12px',
                  borderRadius: '12px',
                  border: includeLehrwerke ? '2px solid #10b981' : '1px solid #cbd5e1',
                  background: includeLehrwerke ? '#ecfdf5' : '#ffffff',
                  color: includeLehrwerke ? '#065f46' : '#64748b',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer'
                }}
              >
                {includeLehrwerke ? <CheckSquare size={16} color="#10b981" /> : <Square size={16} />}
                <BookOpen size={15} />
                <span>Lehrwerke ({currentLehrwerke.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setIncludeSongs(!includeSongs)}
                style={{
                  padding: '10px 12px',
                  borderRadius: '12px',
                  border: includeSongs ? '2px solid #10b981' : '1px solid #cbd5e1',
                  background: includeSongs ? '#ecfdf5' : '#ffffff',
                  color: includeSongs ? '#065f46' : '#64748b',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer'
                }}
              >
                {includeSongs ? <CheckSquare size={16} color="#10b981" /> : <Square size={16} />}
                <Music size={15} />
                <span>Songs ({currentSongs.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setIncludeAudios(!includeAudios)}
                style={{
                  padding: '10px 12px',
                  borderRadius: '12px',
                  border: includeAudios ? '2px solid #10b981' : '1px solid #cbd5e1',
                  background: includeAudios ? '#ecfdf5' : '#ffffff',
                  color: includeAudios ? '#065f46' : '#64748b',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer'
                }}
              >
                {includeAudios ? <CheckSquare size={16} color="#10b981" /> : <Square size={16} />}
                <Mic size={15} />
                <span>Audio ({currentAudios.length})</span>
              </button>
            </div>
          </div>

          {/* 3. Ziel-Schüler auswählen */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                3. Ziel-Schüler auswählen ({selectedStudentIds.size} von {allStudents.length})
              </label>
              <div style={{ display: 'flex', gap: '6px' }}>
                {todayStudents && todayStudents.length > 0 && (
                  <button
                    type="button"
                    onClick={selectAllToday}
                    style={{
                      background: '#f1f5f9',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '4px 8px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      color: '#0284c7',
                      cursor: 'pointer'
                    }}
                  >
                    Heute ({todayStudents.length})
                  </button>
                )}
                <button
                  type="button"
                  onClick={selectAll}
                  style={{
                    background: '#f1f5f9',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '4px 8px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    color: '#475569',
                    cursor: 'pointer'
                  }}
                >
                  Alle
                </button>
                <button
                  type="button"
                  onClick={clearSelection}
                  style={{
                    background: '#f1f5f9',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '4px 8px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    color: '#64748b',
                    cursor: 'pointer'
                  }}
                >
                  Keine
                </button>
              </div>
            </div>

            {/* Suche */}
            <div style={{ position: 'relative', marginBottom: '10px' }}>
              <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Schüler nach Name oder Instrument filtern..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '9px 12px 9px 36px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.84rem',
                  outline: 'none'
                }}
              />
            </div>

            {/* Schüler-Liste */}
            <div
              style={{
                maxHeight: '210px',
                overflowY: 'auto',
                border: '1px solid #e2e8f0',
                borderRadius: '14px',
                padding: '6px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                background: '#fafafa'
              }}
            >
              {filteredStudents.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '0.82rem' }}>
                  Keine Schüler gefunden.
                </div>
              ) : (
                filteredStudents.map(student => {
                  const sId = String(student.id);
                  const isSelected = selectedStudentIds.has(sId);
                  const fName = student.first_name || student.name?.split(' ')[0] || 'Schüler';
                  const lName = student.last_name || '';

                  return (
                    <div
                      key={sId}
                      onClick={() => toggleStudent(sId)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          toggleStudent(sId);
                        }
                      }}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '10px',
                        background: isSelected ? '#e0f2fe' : '#ffffff',
                        border: isSelected ? '1px solid #bae6fd' : '1px solid #f1f5f9',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        transition: 'background 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '6px',
                            border: isSelected ? '2px solid #0284c7' : '2px solid #cbd5e1',
                            background: isSelected ? '#0284c7' : '#ffffff',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          {isSelected && <Check size={14} strokeWidth={3} />}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '0.86rem', fontWeight: 700, color: '#0f172a' }}>
                            {fName} {maskLastName(lName)}
                          </span>
                          {student.instrument && (
                            <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                              {student.instrument}
                            </span>
                          )}
                        </div>
                      </div>

                      {todayStudents.some(t => String(t.id) === sId) && (
                        <span
                          style={{
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: '6px',
                            background: '#dcfce7',
                            color: '#15803d'
                          }}
                        >
                          Heute
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* 4. Kopier-Modus */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#f8fafc', borderRadius: '12px' }}>
            <div>
              <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#1e293b', display: 'block' }}>
                An bestehende Hausaufgabe anhängen
              </span>
              <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                Vorhandene Notizen der Schüler bleiben erhalten und werden nicht gelöscht
              </span>
            </div>
            <input
              type="checkbox"
              checked={appendMode}
              onChange={e => setAppendMode(e.target.checked)}
              style={{ width: '18px', height: '18px', accentColor: '#0284c7', cursor: 'pointer' }}
            />
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#ffffff'
          }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              padding: '10px 18px',
              borderRadius: '12px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#475569',
              fontWeight: 700,
              fontSize: '0.84rem',
              cursor: 'pointer'
            }}
          >
            Abbrechen
          </button>

          <button
            type="button"
            onClick={handleExecuteAssign}
            disabled={isSubmitting || selectedStudentIds.size === 0}
            style={{
              padding: '10px 22px',
              borderRadius: '12px',
              border: 'none',
              background: selectedStudentIds.size === 0 ? '#94a3b8' : 'linear-gradient(135deg, #0284c7, #0369a1)',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '0.88rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: selectedStudentIds.size === 0 || isSubmitting ? 'not-allowed' : 'pointer',
              boxShadow: selectedStudentIds.size === 0 ? 'none' : '0 4px 12px rgba(2, 132, 199, 0.3)'
            }}
          >
            <Send size={16} />
            <span>
              {isSubmitting
                ? 'Wird zugewiesen...'
                : `An ${selectedStudentIds.size} Schüler zuweisen`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
