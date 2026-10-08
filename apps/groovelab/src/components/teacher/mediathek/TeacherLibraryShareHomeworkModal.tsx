/**
 * 🏛️ Campus-Groovelab 3-Säulen-Bibliothek / Mediathek
 * TeacherLibraryShareHomeworkModal.tsx
 * 
 * 0,1% Goldstandard 1-Tap Teilen- & Zuweisungs-Flow:
 * - Weist ein Element (Snippet, Lehrwerk, Song) sofort als Hausaufgabe für die aktuelle Woche zu
 * - 100% reale Schüler der Lehrkraft (Zero Fake Data)
 * - Autoritatives Schreiben in progress_matrix & LocalStorage
 * - Event-Broadcast für Realtime-Sync ohne Seiten-Reload
 * - Monochrome Icons & BFSG 2025 / WCAG 2.2 AA konform
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  X, Search, Share2, Send, Check, CheckCircle2, User, Users,
  BookOpen, Music, FileText, Sparkles, Clock, AlertCircle
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { formatSingleStudentAnonymized } from '../../../utils/nameHelper';
import { LibrarySnippetItem, LibraryLehrwerkItem, LibrarySongItem } from './teacherLibrary.types';
import { MicroScoreSnippet, MicroScoreInstrument } from '../../student/meisterwerk/microscore/microScore.types';
import { resolveSnippetForInstrument } from '../../../services/canonicalScoreEngine';
import { getISOWeekRaw } from '../utils/teacherDashboardUtils';

export interface TeacherLibraryShareHomeworkModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: LibrarySnippetItem | LibraryLehrwerkItem | LibrarySongItem | MicroScoreSnippet | any | null;
  itemType: 'snippet' | 'lehrwerk' | 'song' | 'score_snippet';
  students: any[];
  teacherId?: string;
  schoolId?: string;
  showRealNames?: boolean;
}

export const TeacherLibraryShareHomeworkModal: React.FC<TeacherLibraryShareHomeworkModalProps> = ({
  isOpen,
  onClose,
  item,
  itemType,
  students = [],
  teacherId,
  schoolId,
  showRealNames = false
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [customNote, setCustomNote] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [successStudentIds, setSuccessStudentIds] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Compute current ISO week number
  const currentWeekStr = useMemo(() => {
    return getISOWeekRaw(new Date(), 1); // e.g. "2026-W41"
  }, []);

  const currentWeekNumber = useMemo(() => {
    return currentWeekStr.split('-W')[1] || String(Math.ceil((new Date().getDate() + 6) / 7));
  }, [currentWeekStr]);

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setSelectedStudentIds([]);
      setCustomNote('');
      setSuccessStudentIds([]);
      setErrorMessage(null);
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [isOpen, item]);

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Filter students based on search query
  const filteredStudents = useMemo(() => {
    if (!students || students.length === 0) return [];
    const q = searchQuery.toLowerCase().trim();
    return students.filter((s: any) => {
      if (!q) return true;
      const fn = (s.first_name || '').toLowerCase();
      const ln = (s.last_name || '').toLowerCase();
      const inst = (s.instrument || '').toLowerCase();
      return fn.includes(q) || ln.includes(q) || inst.includes(q);
    });
  }, [students, searchQuery]);

  // Build the formatted assignment string from item
  const buildAssignmentToken = () => {
    if (!item) return '';
    if (itemType === 'score_snippet') {
      const snip = item as any;
      const snippetWithCustom = customNote.trim()
        ? { ...snip, customNotice: customNote.trim() }
        : snip;
      return `MICROSCORE:${JSON.stringify(snippetWithCustom)}`;
    }
    if (itemType === 'snippet') {
      const snip = item as LibrarySnippetItem;
      const bpmPart = snip.bpm ? ` [${snip.bpm} BPM]` : '';
      const customPart = customNote.trim() ? ` — Notiz: ${customNote.trim()}` : '';
      return `[Aufgabe] ${snip.title}${bpmPart}: ${snip.notes}${customPart}`;
    }
    if (itemType === 'lehrwerk') {
      const lw = item as LibraryLehrwerkItem;
      const pagesPart = lw.recommendedPages ? ` ${lw.recommendedPages}` : '';
      const exPart = lw.exercises ? ` (${lw.exercises})` : '';
      const customPart = customNote.trim() ? ` — Notiz: ${customNote.trim()}` : '';
      return `[Buch] ${lw.title}${pagesPart}${exPart}${customPart}`;
    }
    if (itemType === 'song') {
      const s = item as LibrarySongItem;
      const bpmPart = s.tempo_bpm ? ` [${s.tempo_bpm} BPM]` : '';
      const customPart = customNote.trim() ? ` — Notiz: ${customNote.trim()}` : '';
      return `[Song] ${s.title} von ${s.artist}${bpmPart}${customPart}`;
    }
    return '';
  };

  // 1-Tap assign function
  const handleAssignToStudents = async (targetIds: string[]) => {
    if (!targetIds || targetIds.length === 0 || !item) return;

    setIsAssigning(true);
    setErrorMessage(null);

    const assignmentText = buildAssignmentToken();
    const topicName = `Hausaufgabe KW ${currentWeekNumber}`;
    const newlyAssigned: string[] = [];

    try {
      for (const sId of targetIds) {
        const targetStudent = students.find(s => s.id === sId);
        const studentInst = (targetStudent?.instrument || '').toLowerCase();

        // 0,1% Goldstandard: Universelle Notenschnipsel dynamisch für das Instrument des Schülers projizieren
        let studentAssignmentText = assignmentText;
        if (itemType === 'score_snippet' && item) {
          const snip = item as MicroScoreSnippet;
          let targetInst: MicroScoreInstrument = 'piano';
          if (studentInst.includes('gitarre') || studentInst.includes('guitar')) targetInst = 'guitar';
          else if (studentInst.includes('bass')) targetInst = 'bass';
          else if (studentInst.includes('drums') || studentInst.includes('schlagzeug')) targetInst = 'drums';
          else if (studentInst.includes('altsax') || studentInst.includes('sax')) targetInst = 'altosax';
          else if (studentInst.includes('trompete') || studentInst.includes('trumpet')) targetInst = 'trumpet';
          else if (studentInst.includes('querflöte') || studentInst.includes('flöte') || studentInst.includes('flute')) targetInst = 'flute';
          else if (studentInst.includes('klarinette') || studentInst.includes('clarinet')) targetInst = 'clarinet';
          else if (studentInst.includes('posaune') || studentInst.includes('trombone')) targetInst = 'trombone';
          else if (studentInst.includes('streicher') || studentInst.includes('strings') || studentInst.includes('geige')) targetInst = 'strings';
          else if (snip.instrument && snip.instrument !== 'universal') targetInst = snip.instrument;

          const tailoredSnippet = resolveSnippetForInstrument(snip, targetInst);
          const snippetWithCustom = customNote.trim()
            ? { ...tailoredSnippet, customNotice: customNote.trim() }
            : tailoredSnippet;
          studentAssignmentText = `MICROSCORE:${JSON.stringify(snippetWithCustom)}`;
        }

        // 1. Fetch existing notes for current week
        const { data: existingRows } = await supabase
          .from('progress_matrix')
          .select('id, homework_notes')
          .eq('student_id', sId)
          .eq('topic_name', topicName)
          .limit(1);

        let existingNotesList: string[] = [];
        let existingId: string | null = null;

        if (existingRows && existingRows.length > 0) {
          existingId = existingRows[0].id;
          const raw = existingRows[0].homework_notes;
          if (raw) {
            try {
              const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
              if (Array.isArray(parsed)) {
                existingNotesList = parsed;
              } else if (typeof parsed === 'string') {
                existingNotesList = [parsed];
              }
            } catch {
              existingNotesList = [String(raw)];
            }
          }
        } else {
          // Check local storage fallback
          const localRaw = localStorage.getItem(`campus_homework_notes_${sId}`);
          if (localRaw) {
            try {
              const parsed = JSON.parse(localRaw);
              if (Array.isArray(parsed)) existingNotesList = parsed;
            } catch {}
          }
        }

        // Avoid exact duplicate
        if (!existingNotesList.includes(studentAssignmentText)) {
          existingNotesList.push(studentAssignmentText);
        }

        const notesPayload = JSON.stringify(existingNotesList);

        // 2. Persist to progress_matrix
        if (existingId) {
          const { error: updErr } = await supabase
            .from('progress_matrix')
            .update({
              homework_notes: notesPayload,
              is_current_homework: true,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingId);

          if (updErr) console.warn('[TeacherLibraryShare] Update warning:', updErr);
        } else {
          const { error: insErr } = await supabase
            .from('progress_matrix')
            .insert({
              student_id: sId,
              teacher_id: teacherId || null,
              topic_name: topicName,
              status: 'IN_PROGRESS',
              is_current_homework: true,
              homework_notes: notesPayload,
              teacher_notes: '',
              updated_at: new Date().toISOString()
            });

          if (insErr) console.warn('[TeacherLibraryShare] Insert warning:', insErr);
        }

        // 3. Update LocalStorage
        try {
          localStorage.setItem(`campus_homework_notes_${sId}`, notesPayload);
        } catch {}

        // 4. Dispatch Realtime Event Cascade
        window.dispatchEvent(new CustomEvent('campus_homework_updated', { detail: { studentId: sId } }));
        window.dispatchEvent(new CustomEvent('campus_homework_notes_updated', { detail: { studentId: sId } }));
        window.dispatchEvent(new CustomEvent('groovelab_student_prep_updated', { detail: { studentId: sId } }));
        window.dispatchEvent(new CustomEvent('homework-updated', { detail: { studentId: sId } }));

        newlyAssigned.push(sId);
      }

      setSuccessStudentIds(prev => Array.from(new Set([...prev, ...newlyAssigned])));
    } catch (err: any) {
      console.error('[TeacherLibraryShare] Error assigning homework:', err);
      setErrorMessage('Fehler bei der Zuweisung: ' + (err?.message || 'Unbekannter Fehler'));
    } finally {
      setIsAssigning(false);
    }
  };

  const toggleSelectStudent = (sId: string) => {
    setSelectedStudentIds(prev =>
      prev.includes(sId) ? prev.filter(id => id !== sId) : [...prev, sId]
    );
  };

  const handleSelectAll = () => {
    if (selectedStudentIds.length === filteredStudents.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(filteredStudents.map(s => s.id));
    }
  };

  if (!isOpen || !item) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Hausaufgabe zuweisen"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        padding: '16px'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        style={{
          width: '100%',
          maxWidth: '560px',
          maxHeight: '90vh',
          backgroundColor: '#ffffff',
          borderRadius: '20px',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#ffffff'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: '#4f46e5',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(79, 70, 229, 0.25)'
            }}>
              <Send size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#0f172a' }}>
                Als Hausaufgabe festlegen
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.76rem', color: '#64748b', fontWeight: 600 }}>
                Zielwoche: Kalenderwoche {currentWeekNumber} ({currentWeekStr})
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Schließen"
            style={{
              background: '#f1f5f9',
              border: 'none',
              borderRadius: '8px',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#475569',
              cursor: 'pointer'
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Selected Item Card Preview */}
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            padding: '14px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {itemType === 'score_snippet' && <Music size={16} color="#0f172a" />}
                {itemType === 'snippet' && <FileText size={16} color="#0f172a" />}
                {itemType === 'lehrwerk' && <BookOpen size={16} color="#0f172a" />}
                {itemType === 'song' && <Music size={16} color="#0f172a" />}
                <span style={{ fontSize: '0.72rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#475569' }}>
                  {itemType === 'score_snippet' ? 'Notenschnipsel' : itemType === 'snippet' ? 'Didaktik-Snippet' : itemType === 'lehrwerk' ? 'Lehrwerk' : 'Song / Playalong'}
                </span>
              </div>
              <span style={{
                background: '#0f172a',
                color: '#ffffff',
                fontSize: '0.68rem',
                fontWeight: 800,
                borderRadius: '6px',
                padding: '2px 8px'
              }}>
                KW {currentWeekNumber}
              </span>
            </div>

            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
              {item.title}
            </div>

            {/* Beschreibung / Didaktischer Text */}
            {(() => {
              if (itemType === 'score_snippet') {
                const snip = item as any;
                const desc = snip.description || (Array.isArray(snip.notes)
                  ? `${snip.notes.filter((n: any) => n.pitch !== 'REST').length} gespielte Noten • ${snip.barsCount || 2} Takte (${snip.timeSignature || '4/4'})`
                  : '');
                return desc ? (
                  <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b', lineHeight: 1.4 }}>
                    {desc}
                  </p>
                ) : null;
              }
              if ('notes' in item && typeof item.notes === 'string' && item.notes) {
                return (
                  <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b', lineHeight: 1.4 }}>
                    {item.notes}
                  </p>
                );
              }
              return null;
            })()}

            {/* Tempo BPM */}
            {(() => {
              const bpm = ('tempoBpm' in item && (item as any).tempoBpm) || ('bpm' in item && (item as any).bpm);
              if (!bpm) return null;
              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.74rem', color: '#334155', fontWeight: 700 }}>
                  <Clock size={12} />
                  <span>Empfohlenes Tempo: {bpm} BPM</span>
                </div>
              );
            })()}
          </div>

          {/* Optional Didactic Note Input */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#334155', marginBottom: '6px' }}>
              Zusätzlicher Hinweis für den Schüler (Optional):
            </label>
            <input
              type="text"
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              placeholder="z. B. Achte besonders auf den lockeren Daumen..."
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '10px',
                border: '1.5px solid #cbd5e1',
                fontSize: '0.82rem',
                color: '#0f172a',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Student Search & Selection Bar */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a' }}>
                Schüler auswählen ({filteredStudents.length})
              </span>
              {filteredStudents.length > 1 && (
                <button
                  type="button"
                  onClick={handleSelectAll}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#0f172a',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  {selectedStudentIds.length === filteredStudents.length ? 'Auswahl aufheben' : 'Alle auswählen'}
                </button>
              )}
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: '#f8fafc',
              border: '1.5px solid #e2e8f0',
              borderRadius: '10px',
              padding: '8px 12px',
              marginBottom: '10px'
            }}>
              <Search size={14} color="#64748b" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Schüler nach Name oder Instrument filtern..."
                style={{
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  width: '100%',
                  fontSize: '0.82rem',
                  color: '#0f172a'
                }}
              />
            </div>

            {/* Students List */}
            <div style={{
              maxHeight: '220px',
              overflowY: 'auto',
              border: '1px solid #f1f5f9',
              borderRadius: '12px',
              padding: '4px'
            }}>
              {filteredStudents.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '0.82rem' }}>
                  Keine passenden Schüler gefunden.
                </div>
              ) : (
                filteredStudents.map((stud: any) => {
                  const isSelected = selectedStudentIds.includes(stud.id);
                  const isAlreadyAssigned = successStudentIds.includes(stud.id);
                  const displayName = formatSingleStudentAnonymized(stud.first_name, stud.last_name, stud.id, showRealNames);

                  return (
                    <div
                      key={stud.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        borderRadius: '10px',
                        background: isAlreadyAssigned ? '#f0fdf4' : isSelected ? '#f8fafc' : '#ffffff',
                        borderBottom: '1px solid #f8fafc',
                        transition: 'background 0.1s ease'
                      }}
                    >
                      <div
                        style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', flex: 1 }}
                        onClick={() => toggleSelectStudent(stud.id)}
                      >
                        <div style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '6px',
                          border: isSelected ? '2px solid #4f46e5' : '2px solid #cbd5e1',
                          background: isSelected ? '#4f46e5' : '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#ffffff',
                          transition: 'all 0.15s ease'
                        }}>
                          {isSelected && <Check size={12} strokeWidth={3} />}
                        </div>

                        <div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>
                            {displayName}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
                            {stud.instrument || 'Instrument nicht zugewiesen'}
                          </div>
                        </div>
                      </div>

                      {/* 1-Tap Instant Single Action */}
                      <button
                        type="button"
                        onClick={() => handleAssignToStudents([stud.id])}
                        disabled={isAssigning}
                        style={{
                          background: isAlreadyAssigned ? '#16a34a' : '#4f46e5',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '6px 10px',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          transition: 'all 0.15s ease'
                        }}
                        title={`Sofort für ${displayName} als Hausaufgabe KW ${currentWeekNumber} festlegen`}
                      >
                        {isAlreadyAssigned ? (
                          <>
                            <CheckCircle2 size={13} />
                            <span>Zugewiesen!</span>
                          </>
                        ) : (
                          <>
                            <Send size={12} />
                            <span>Zuweisen</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {errorMessage && (
            <div style={{
              background: '#fef2f2',
              color: '#b91c1c',
              padding: '10px 14px',
              borderRadius: '10px',
              fontSize: '0.78rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <AlertCircle size={15} />
              <span>{errorMessage}</span>
            </div>
          )}

          {successStudentIds.length > 0 && (
            <div style={{
              background: '#f0fdf4',
              color: '#166534',
              padding: '10px 14px',
              borderRadius: '10px',
              fontSize: '0.78rem',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <CheckCircle2 size={16} />
              <span>Erfolgreich als Hausaufgabe für KW {currentWeekNumber} zugewiesen! ({successStudentIds.length} Schüler)</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 24px',
          borderTop: '1px solid #f1f5f9',
          background: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#f1f5f9',
              color: '#475569',
              border: 'none',
              borderRadius: '10px',
              padding: '8px 16px',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Schließen
          </button>

          {selectedStudentIds.length > 0 && (
            <button
              type="button"
              onClick={() => handleAssignToStudents(selectedStudentIds)}
              disabled={isAssigning}
              style={{
                background: '#4f46e5',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                padding: '8px 18px',
                fontSize: '0.82rem',
                fontWeight: 900,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 4px 14px rgba(79, 70, 229, 0.25)',
                transition: 'all 0.15s ease'
              }}
            >
              <Send size={14} />
              <span>{selectedStudentIds.length} ausgewählten Schülern zuweisen</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
