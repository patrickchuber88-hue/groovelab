import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  User,
  Inbox,
  Wrench,
  Search,
  Printer,
  X,
  Mic,
  Send,
  Circle,
  CheckCircle2,
  Trash2,
  Pin,
  Clock,
  Sparkles,
  Users,
  Calendar,
  DoorClosed,
  Check,
  ArrowUpRight,
  BookOpen,
  Lock,
  Layers
} from 'lucide-react';
import { UserNote, maskStudentName } from '../../../../services/notesService';
import { useDictationInput } from '../../../../hooks/useVoiceToText';
import { generateTeacherNotesDailyPlanPDF } from '../../../../utils/pdfGenerator';

export interface TeacherNotesBoardViewProps {
  onClose: () => void;
  notes: UserNote[];
  allStudents?: any[];
  todayStudents?: any[];
  user: any;
  schoolId?: number | string;
  onCreateNote: (content: string, options?: any) => Promise<any>;
  onUpdateNote: (id: string, updates: Partial<UserNote>) => Promise<any>;
  onDeleteNote: (id: string) => Promise<any>;
  onTogglePin: (id: string) => Promise<any>;
  onToggleCompleteTodo: (id: string) => Promise<any>;
  onToggleArchive: (id: string) => Promise<any>;
  onResolveRoomIssue?: (id: string, resolvedBy?: 'teacher' | 'secretary') => Promise<any>;
  onDismissRoomIssue?: (id: string) => Promise<any>;
  onOpenHomeworkModal?: (student: any) => void;
  initialTab?: 'students' | 'desk' | 'defects';
  initialStudentId?: string | number;
}

export const TeacherNotesBoardView: React.FC<TeacherNotesBoardViewProps> = ({
  onClose,
  notes = [],
  allStudents = [],
  todayStudents = [],
  user,
  schoolId,
  onCreateNote,
  onUpdateNote,
  onDeleteNote,
  onTogglePin,
  onToggleCompleteTodo,
  onToggleArchive,
  onResolveRoomIssue,
  onDismissRoomIssue,
  onOpenHomeworkModal,
  initialTab = 'students',
  initialStudentId
}) => {
  // ── 1. ACTIVE MAIN TAB ──────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'students' | 'desk' | 'defects'>(initialTab);

  // ── 2. GLOBAL SEARCH QUERY ──────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState<string>('');

  // ── 3. STUDENT MASTER-DETAIL STATE ──────────────────────────────────────
  const [studentScope, setStudentScope] = useState<'today' | 'all'>('today');
  const [studentSearch, setStudentSearch] = useState<string>('');

  // Base list of students depending on scope
  const activeStudentList = useMemo(() => {
    const list = studentScope === 'today' && todayStudents.length > 0 ? todayStudents : allStudents;
    if (!studentSearch.trim()) return list;
    const q = studentSearch.toLowerCase().trim();
    return list.filter(s => {
      const name = (s.first_name || s.name || '').toLowerCase();
      const inst = (s.instrument || '').toLowerCase();
      return name.includes(q) || inst.includes(q);
    });
  }, [studentScope, todayStudents, allStudents, studentSearch]);

  // Selected student in Master-Detail
  const [selectedStudent, setSelectedStudent] = useState<any>(() => {
    if (initialStudentId) {
      const found = allStudents.find(s => String(s.id) === String(initialStudentId));
      if (found) return found;
    }
    return todayStudents[0] || allStudents[0] || null;
  });

  // Keep selected student valid if list changes
  useEffect(() => {
    if (!selectedStudent && activeStudentList.length > 0) {
      setSelectedStudent(activeStudentList[0]);
    }
  }, [activeStudentList, selectedStudent]);

  // Count notes per student
  const studentNoteCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    notes.forEach(n => {
      if (n.is_archived || n.note_type === 'room_issue') return;
      if (n.student_id) {
        counts[String(n.student_id)] = (counts[String(n.student_id)] || 0) + 1;
      } else if (n.student_name) {
        const sLower = n.student_name.toLowerCase();
        counts[sLower] = (counts[sLower] || 0) + 1;
      }
    });
    return counts;
  }, [notes]);

  const getStudentNoteCount = (st: any) => {
    if (!st) return 0;
    const byId = studentNoteCounts[String(st.id)];
    if (byId !== undefined) return byId;
    const sName = (st.first_name || st.name || '').toLowerCase();
    return studentNoteCounts[sName] || 0;
  };

  // ── 4. FILTERED DATASETS ────────────────────────────────────────────────
  // Notes for selected student
  const selectedStudentNotes = useMemo(() => {
    if (!selectedStudent) return [];
    const sId = String(selectedStudent.id);
    const sName = (selectedStudent.first_name || selectedStudent.name || '').toLowerCase();

    return notes.filter(n => {
      if (n.is_archived || n.note_type === 'room_issue') return false;
      const matchStudent = (n.student_id && String(n.student_id) === sId) ||
        (n.student_name && n.student_name.toLowerCase().includes(sName));
      if (!matchStudent) return false;
      if (searchQuery.trim()) {
        return n.content.toLowerCase().includes(searchQuery.toLowerCase().trim());
      }
      return true;
    }).sort((a, b) => {
      if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [notes, selectedStudent, searchQuery]);

  // Desk / Personal To-Dos (Open & Done)
  const deskNotes = useMemo(() => {
    return notes.filter(n => {
      if (n.note_type === 'room_issue') return false;
      const isPersonal = !n.student_id && (!n.student_name || n.note_type === 'todo');
      if (!isPersonal) return false;
      if (searchQuery.trim()) {
        return n.content.toLowerCase().includes(searchQuery.toLowerCase().trim());
      }
      return true;
    });
  }, [notes, searchQuery]);

  const openDeskTodos = useMemo(() => {
    return deskNotes
      .filter(n => !n.is_completed && !n.is_archived)
      .sort((a, b) => {
        if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [deskNotes]);

  const completedDeskTodos = useMemo(() => {
    return deskNotes
      .filter(n => n.is_completed || n.is_archived)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [deskNotes]);

  // Reported room defects
  const defectNotes = useMemo(() => {
    return notes.filter(n => {
      if (n.note_type !== 'room_issue') return false;
      if (searchQuery.trim()) {
        return n.content.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
          Boolean(n.room_id && n.room_id.toLowerCase().includes(searchQuery.toLowerCase().trim()));
      }
      return true;
    }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [notes, searchQuery]);

  // ── 5. INPUTS & DICTATION ───────────────────────────────────────────────
  const [inputText, setInputText] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // 🎙️ 0.1% Goldstandard Dictation (Silence Auto-Stop & Zero Duplication)
  const {
    isListening,
    startListening,
    stopListening,
    isSupported: isSpeechSupported
  } = useDictationInput({
    value: inputText,
    onChange: setInputText,
    autoStopOnSilence: true,
    silenceTimeoutMs: 2000
  });

  const handleCreateCurrentNote = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = inputText.trim();
    if (!clean || isSubmitting) return;

    setIsSubmitting(true);
    try {
      if (activeTab === 'students' && selectedStudent) {
        await onCreateNote(clean, {
          studentId: selectedStudent.id,
          studentName: selectedStudent.first_name || selectedStudent.name,
          noteType: 'student_note',
          visibility: 'private'
        });
      } else if (activeTab === 'desk') {
        await onCreateNote(clean, {
          noteType: 'todo',
          visibility: 'private'
        });
      }
      setInputText('');
    } catch (err) {
      console.error('[TeacherNotesBoardView] Failed to save note:', err);
    } finally {
      setIsSubmitting(false);
      if (inputRef.current) inputRef.current.focus();
    }
  };

  // ── 6. PDF EXPORT HANDLER ───────────────────────────────────────────────
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);

  const handleExportContextPdf = async () => {
    setIsExportingPdf(true);
    try {
      if (activeTab === 'students' && selectedStudent) {
        // Export Student Dossier
        await generateTeacherNotesDailyPlanPDF({
          teacherName: user?.name || user?.email || 'Lehrkraft',
          schoolName: user?.school_name || 'Campus-Groovelab',
          dateStr: new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }),
          notes: selectedStudentNotes.map(n => ({
            id: n.id,
            content: n.content,
            studentName: selectedStudent.first_name || selectedStudent.name,
            isCompleted: n.is_completed,
            tag: selectedStudent.instrument || 'Unterricht'
          })),
          todayStudents: [selectedStudent]
        }, 'preview');
      } else {
        // Export Desk To-Dos
        await generateTeacherNotesDailyPlanPDF({
          teacherName: user?.name || user?.email || 'Lehrkraft',
          schoolName: user?.school_name || 'Campus-Groovelab',
          dateStr: new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }),
          notes: openDeskTodos.map(n => ({
            id: n.id,
            content: n.content,
            isCompleted: n.is_completed,
            tag: 'Schreibtisch'
          })),
          todayStudents: []
        }, 'preview');
      }
    } catch (err) {
      console.error('[TeacherNotesBoardView] PDF export failed:', err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  // ── 7. TIME HELPER ──────────────────────────────────────────────────────
  const formatTime = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      const now = new Date();
      const isToday = d.toDateString() === now.toDateString();
      if (isToday) {
        return `Heute, ${d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`;
      }
      return d.toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return '';
    }
  };

  const selectedStudentDisplayName = selectedStudent ? maskStudentName(selectedStudent.first_name || selectedStudent.name) : 'Schüler';

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: '#f8fafc',
      boxSizing: 'border-box',
      overflow: 'hidden'
    }}>
      {/* ── TOP HEADER: TITEL, 3 TABS, SUCHE & PDF ────────────────────────── */}
      <header style={{
        background: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        padding: '14px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        flexShrink: 0
      }}>
        {/* Links: Titel & Zähler */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: '#0f172a',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Layers size={18} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{
                margin: 0,
                fontSize: '1.08rem',
                fontWeight: 850,
                color: '#0f172a',
                letterSpacing: '-0.02em'
              }}>
                Notizen-Board
              </h1>
              <span style={{
                fontSize: '0.70rem',
                fontWeight: 800,
                background: '#f1f5f9',
                color: '#475569',
                padding: '2px 8px',
                borderRadius: '100px'
              }}>
                {notes.filter(n => !n.is_archived).length} Notizen
              </span>
            </div>
            <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
              Zentrale Unterrichtsorganisation & Didaktik-Akte
            </div>
          </div>
        </div>

        {/* Mitte: 3 Monochrome Segment-Tabs */}
        <nav
          role="tablist"
          aria-label="Notizen Board Bereiche"
          style={{
            display: 'flex',
            alignItems: 'center',
            background: '#f1f5f9',
            padding: '3px',
            borderRadius: '11px',
            gap: '3px'
          }}
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'students'}
            onClick={() => setActiveTab('students')}
            style={{
              border: 'none',
              background: activeTab === 'students' ? '#ffffff' : 'transparent',
              color: activeTab === 'students' ? '#0f172a' : '#64748b',
              fontWeight: activeTab === 'students' ? 850 : 650,
              fontSize: '0.78rem',
              padding: '6px 14px',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: activeTab === 'students' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <User size={14} color={activeTab === 'students' ? '#0f172a' : '#64748b'} />
            <span>Schüler-Akten & Didaktik</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'desk'}
            onClick={() => setActiveTab('desk')}
            style={{
              border: 'none',
              background: activeTab === 'desk' ? '#ffffff' : 'transparent',
              color: activeTab === 'desk' ? '#0f172a' : '#64748b',
              fontWeight: activeTab === 'desk' ? 850 : 650,
              fontSize: '0.78rem',
              padding: '6px 14px',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: activeTab === 'desk' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <Inbox size={14} color={activeTab === 'desk' ? '#0f172a' : '#64748b'} />
            <span>Mein Schreibtisch ({openDeskTodos.length})</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'defects'}
            onClick={() => setActiveTab('defects')}
            style={{
              border: 'none',
              background: activeTab === 'defects' ? '#ffffff' : 'transparent',
              color: activeTab === 'defects' ? '#0f172a' : '#64748b',
              fontWeight: activeTab === 'defects' ? 850 : 650,
              fontSize: '0.78rem',
              padding: '6px 14px',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: activeTab === 'defects' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <Wrench size={14} color={activeTab === 'defects' ? '#0f172a' : '#64748b'} />
            <span>Raummängel ({defectNotes.length})</span>
          </button>
        </nav>

        {/* Rechts: Suche, PDF-Export & Schließen */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Kontextueller PDF Button */}
          {activeTab !== 'defects' && (
            <button
              type="button"
              onClick={handleExportContextPdf}
              disabled={isExportingPdf}
              title={activeTab === 'students' ? 'Schüler-Dossier als PDF ausgeben' : 'To-Do Liste als PDF drucken'}
              style={{
                border: '1px solid #e2e8f0',
                background: '#ffffff',
                color: '#334155',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '0.76rem',
                fontWeight: 750,
                cursor: isExportingPdf ? 'wait' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease'
              }}
              className="hover-scale-mini"
            >
              <Printer size={13} color="#475569" />
              <span>{isExportingPdf ? 'Erstelle...' : activeTab === 'students' ? 'Schüler-Dossier PDF' : 'To-Dos PDF'}</span>
            </button>
          )}

          {/* Suchfeld */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: '#f1f5f9',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '5px 10px',
            width: '180px'
          }}>
            <Search size={13} color="#94a3b8" />
            <input
              type="text"
              placeholder="Notizen filtern..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: '0.76rem',
                color: '#0f172a',
                width: '100%'
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 0 }}
              >
                <X size={12} color="#64748b" />
              </button>
            )}
          </div>

          {/* Schließen Button */}
          <button
            type="button"
            onClick={onClose}
            title="Board schließen (Esc)"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              background: '#ffffff',
              color: '#64748b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            className="hover-scale-mini"
          >
            <X size={16} />
          </button>
        </div>
      </header>

      {/* ── HAUPT-INHALTSBEREICH NACH TABS ─────────────────────────────────── */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>

        {/* ── TAB 1: SCHÜLER-AKTEN & DIDAKTIK (MASTER-DETAIL) ─────────────── */}
        {activeTab === 'students' && (
          <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
            {/* LINKE SPALTE: SCHÜLER-NAVIGATION (290px) */}
            <aside style={{
              width: '290px',
              flexShrink: 0,
              background: '#ffffff',
              borderRight: '1px solid #e2e8f0',
              display: 'flex',
              flexDirection: 'column',
              padding: '14px',
              boxSizing: 'border-box',
              gap: '10px'
            }}>
              {/* Scope-Umschalter: Heute vs. Alle */}
              <div style={{
                display: 'flex',
                background: '#f1f5f9',
                padding: '2px',
                borderRadius: '8px',
                gap: '2px'
              }}>
                <button
                  type="button"
                  onClick={() => setStudentScope('today')}
                  style={{
                    flex: 1,
                    border: 'none',
                    background: studentScope === 'today' ? '#ffffff' : 'transparent',
                    color: studentScope === 'today' ? '#0f172a' : '#64748b',
                    fontSize: '0.74rem',
                    fontWeight: studentScope === 'today' ? 800 : 650,
                    padding: '5px 8px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    boxShadow: studentScope === 'today' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
                  }}
                >
                  <Calendar size={12} />
                  <span>Heute ({todayStudents.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStudentScope('all')}
                  style={{
                    flex: 1,
                    border: 'none',
                    background: studentScope === 'all' ? '#ffffff' : 'transparent',
                    color: studentScope === 'all' ? '#0f172a' : '#64748b',
                    fontSize: '0.74rem',
                    fontWeight: studentScope === 'all' ? 800 : 650,
                    padding: '5px 8px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    boxShadow: studentScope === 'all' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
                  }}
                >
                  <Users size={12} />
                  <span>Alle ({allStudents.length})</span>
                </button>
              </div>

              {/* Schüler-Schnellsuche */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '5px 8px'
              }}>
                <Search size={12} color="#94a3b8" />
                <input
                  type="text"
                  placeholder="Schüler suchen..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    outline: 'none',
                    fontSize: '0.74rem',
                    color: '#0f172a',
                    width: '100%'
                  }}
                />
              </div>

              {/* Schüler-Liste */}
              <div style={{
                flex: 1,
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '3px'
              }} className="custom-scrollbar">
                {activeStudentList.length === 0 ? (
                  <div style={{ padding: '16px 8px', textAlign: 'center', color: '#94a3b8', fontSize: '0.74rem' }}>
                    Keine Schüler gefunden
                  </div>
                ) : (
                  activeStudentList.map(st => {
                    const isSelected = selectedStudent && String(selectedStudent.id) === String(st.id);
                    const count = getStudentNoteCount(st);
                    const name = maskStudentName(st.first_name || st.name);
                    return (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => setSelectedStudent(st)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 10px',
                          borderRadius: '8px',
                          border: isSelected ? '1px solid #cbd5e1' : '1px solid transparent',
                          background: isSelected ? '#f1f5f9' : 'transparent',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'all 0.1s ease'
                        }}
                        className="hover-bg-slate-50"
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                          <div style={{
                            width: '26px',
                            height: '26px',
                            borderRadius: '50%',
                            background: isSelected ? '#0f172a' : '#e2e8f0',
                            color: isSelected ? '#ffffff' : '#475569',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            flexShrink: 0
                          }}>
                            {st.first_name?.[0] || st.name?.[0] || 'S'}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{
                              fontSize: '0.78rem',
                              fontWeight: isSelected ? 800 : 650,
                              color: isSelected ? '#0f172a' : '#334155',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}>
                              {name}
                            </div>
                            <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                              {st.instrument || 'Musik'}
                            </div>
                          </div>
                        </div>

                        {count > 0 && (
                          <span style={{
                            fontSize: '0.68rem',
                            fontWeight: 750,
                            padding: '1px 6px',
                            borderRadius: '10px',
                            background: isSelected ? '#0f172a' : '#f1f5f9',
                            color: isSelected ? '#ffffff' : '#64748b'
                          }}>
                            {count}
                          </span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </aside>

            {/* RECHTE SPALTE: SCHÜLER-AKTE & TIMELINE */}
            <main style={{
              flex: 1,
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
              background: '#f8fafc',
              overflow: 'hidden'
            }}>
              {selectedStudent ? (
                <>
                  {/* Schüler-Header & Aktionen */}
                  <div style={{
                    padding: '14px 24px',
                    background: '#ffffff',
                    borderBottom: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '10px',
                    flexShrink: 0
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '50%',
                        background: '#f1f5f9',
                        color: '#0f172a',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.90rem',
                        fontWeight: 850
                      }}>
                        {selectedStudent.first_name?.[0] || selectedStudent.name?.[0] || 'S'}
                      </div>
                      <div>
                        <div style={{ fontSize: '0.98rem', fontWeight: 850, color: '#0f172a' }}>
                          {selectedStudentDisplayName}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 650 }}>
                          {selectedStudent.instrument || 'Musik'} • {selectedStudentNotes.length} Notizen in der Akte
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {/* Vertraulichkeits-Badge */}
                      <span style={{
                        fontSize: '0.70rem',
                        fontWeight: 700,
                        color: '#475569',
                        background: '#f1f5f9',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        <Lock size={11} color="#64748b" />
                        <span>Vertraulich (Nur für dich)</span>
                      </span>

                      {/* Schüler-Aufgabenheft Button */}
                      {onOpenHomeworkModal && (
                        <button
                          type="button"
                          onClick={() => onOpenHomeworkModal(selectedStudent)}
                          style={{
                            border: '1px solid #e2e8f0',
                            background: '#f8fafc',
                            color: '#0f172a',
                            fontSize: '0.74rem',
                            fontWeight: 750,
                            padding: '5px 10px',
                            borderRadius: '7px',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                          className="hover-scale-mini"
                        >
                          <BookOpen size={12} />
                          <span>Aufgabenheft</span>
                          <ArrowUpRight size={11} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 1-Zeilen-Eingabezeile für Schüler */}
                  <div style={{
                    padding: '12px 24px',
                    background: '#ffffff',
                    borderBottom: '1px solid #e2e8f0',
                    flexShrink: 0
                  }}>
                    <form onSubmit={handleCreateCurrentNote}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: '#f8fafc',
                        border: '1px solid #cbd5e1',
                        borderRadius: '10px',
                        padding: '6px 12px'
                      }}>
                        <input
                          ref={inputRef}
                          type="text"
                          value={inputText}
                          onChange={(e) => setInputText(e.target.value)}
                          placeholder={`Notiz oder didaktische Beobachtung zu ${selectedStudentDisplayName} erfassen...`}
                          style={{
                            flex: 1,
                            border: 'none',
                            outline: 'none',
                            background: 'transparent',
                            fontSize: '0.84rem',
                            color: '#0f172a',
                            minWidth: 0
                          }}
                        />

                        {isSpeechSupported && (
                          <button
                            type="button"
                            onClick={() => isListening ? stopListening() : startListening()}
                            title={isListening ? "Diktat beenden" : "Diktieren"}
                            style={{
                              border: 'none',
                              background: isListening ? '#ef4444' : 'transparent',
                              color: isListening ? '#ffffff' : '#64748b',
                              width: '28px',
                              height: '28px',
                              borderRadius: '6px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer'
                            }}
                          >
                            <Mic size={14} />
                          </button>
                        )}

                        <button
                          type="submit"
                          disabled={!inputText.trim() || isSubmitting}
                          title="Speichern (Enter)"
                          style={{
                            border: 'none',
                            background: inputText.trim() ? '#0f172a' : '#e2e8f0',
                            color: inputText.trim() ? '#ffffff' : '#94a3b8',
                            width: '28px',
                            height: '28px',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: inputText.trim() ? 'pointer' : 'default'
                          }}
                        >
                          <Send size={12} />
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Chronologische Notizen-Timeline */}
                  <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '20px 24px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }} className="custom-scrollbar">
                    {selectedStudentNotes.length === 0 ? (
                      <div style={{
                        padding: '48px 24px',
                        textAlign: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '8px',
                        color: '#64748b'
                      }}>
                        <Sparkles size={24} color="#94a3b8" />
                        <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#0f172a' }}>
                          Noch keine Notizen zu {selectedStudentDisplayName}
                        </div>
                        <div style={{ fontSize: '0.76rem', color: '#64748b', maxWidth: '380px' }}>
                          Nutze die Eingabezeile oben, um deine erste pädagogische Beobachtung, Stück-Vorbereitung oder Hausaufgaben-Reflexion festzuhalten.
                        </div>
                      </div>
                    ) : (
                      selectedStudentNotes.map(note => {
                        const isCompleted = note.is_completed;
                        return (
                          <div
                            key={note.id}
                            style={{
                              background: isCompleted ? '#f8fafc' : '#ffffff',
                              border: note.is_pinned ? '1.5px solid #0f172a' : '1px solid #e2e8f0',
                              borderRadius: '12px',
                              padding: '12px 16px',
                              display: 'flex',
                              alignItems: 'flex-start',
                              justifyContent: 'space-between',
                              gap: '12px',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                              transition: 'all 0.12s ease'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', flex: 1, minWidth: 0 }}>
                              <button
                                type="button"
                                onClick={() => onToggleCompleteTodo(note.id)}
                                title={isCompleted ? "Als offen markieren" : "Als erledigt markieren"}
                                style={{
                                  border: 'none',
                                  background: 'transparent',
                                  padding: 0,
                                  marginTop: '2px',
                                  cursor: 'pointer',
                                  color: isCompleted ? '#16a34a' : '#94a3b8'
                                }}
                              >
                                {isCompleted ? <CheckCircle2 size={17} color="#16a34a" /> : <Circle size={17} />}
                              </button>

                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{
                                  fontSize: '0.84rem',
                                  fontWeight: 650,
                                  color: isCompleted ? '#94a3b8' : '#0f172a',
                                  textDecoration: isCompleted ? 'line-through' : 'none',
                                  lineHeight: 1.4,
                                  wordBreak: 'break-word'
                                }}>
                                  {note.content}
                                </div>
                                <div style={{
                                  fontSize: '0.70rem',
                                  color: '#64748b',
                                  marginTop: '5px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px'
                                }}>
                                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Clock size={11} color="#94a3b8" />
                                    <span>{formatTime(note.created_at)}</span>
                                  </span>
                                  {note.is_pinned && (
                                    <span style={{ fontSize: '0.66rem', fontWeight: 800, color: '#0f172a', background: '#f1f5f9', padding: '1px 5px', borderRadius: '4px' }}>
                                      Angepinnt
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Aktionen: Pin & Löschen */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <button
                                type="button"
                                onClick={() => onTogglePin(note.id)}
                                title={note.is_pinned ? "Pin lösen" : "Notiz anpinnen"}
                                style={{
                                  border: 'none',
                                  background: 'transparent',
                                  color: note.is_pinned ? '#0f172a' : '#94a3b8',
                                  cursor: 'pointer',
                                  padding: '4px'
                                }}
                              >
                                <Pin size={13} fill={note.is_pinned ? '#0f172a' : 'none'} />
                              </button>
                              <button
                                type="button"
                                onClick={() => onDeleteNote(note.id)}
                                title="Notiz löschen"
                                style={{
                                  border: 'none',
                                  background: 'transparent',
                                  color: '#94a3b8',
                                  cursor: 'pointer',
                                  padding: '4px'
                                }}
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </>
              ) : (
                <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                  Wähle links einen Schüler aus, um seine Akte zu öffnen.
                </div>
              )}
            </main>
          </div>
        )}

        {/* ── TAB 2: MEIN SCHREIBTISCH & TO-DOS ────────────────────────────── */}
        {activeTab === 'desk' && (
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            maxWidth: '900px',
            width: '100%',
            margin: '0 auto',
            boxSizing: 'border-box'
          }} className="custom-scrollbar">
            {/* Eingabezeile für Schreibtisch-To-Dos */}
            <form onSubmit={handleCreateCurrentNote}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '12px',
                padding: '8px 14px',
                boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
              }}>
                <input
                  ref={inputRef}
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Aufgabe oder To-Do notieren (Enter zum Speichern)..."
                  style={{
                    flex: 1,
                    border: 'none',
                    outline: 'none',
                    background: 'transparent',
                    fontSize: '0.86rem',
                    color: '#0f172a',
                    minWidth: 0
                  }}
                />

                {isSpeechSupported && (
                  <button
                    type="button"
                    onClick={() => isListening ? stopListening() : startListening()}
                    title={isListening ? "Diktat stoppen" : "Diktieren"}
                    style={{
                      border: 'none',
                      background: isListening ? '#ef4444' : 'transparent',
                      color: isListening ? '#ffffff' : '#64748b',
                      width: '28px',
                      height: '28px',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    <Mic size={14} />
                  </button>
                )}

                <button
                  type="submit"
                  disabled={!inputText.trim() || isSubmitting}
                  title="Speichern"
                  style={{
                    border: 'none',
                    background: inputText.trim() ? '#0f172a' : '#e2e8f0',
                    color: inputText.trim() ? '#ffffff' : '#94a3b8',
                    width: '30px',
                    height: '30px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: inputText.trim() ? 'pointer' : 'default'
                  }}
                >
                  <Send size={13} />
                </button>
              </div>
            </form>

            {/* Sektion 1: Offene Aufgaben */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{
                fontSize: '0.80rem',
                fontWeight: 800,
                color: '#475569',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 4px'
              }}>
                <span>Offene Aufgaben ({openDeskTodos.length})</span>
              </div>

              {openDeskTodos.length === 0 ? (
                <div style={{
                  padding: '24px',
                  background: '#ffffff',
                  borderRadius: '12px',
                  border: '1px dashed #cbd5e1',
                  textAlign: 'center',
                  fontSize: '0.80rem',
                  color: '#64748b'
                }}>
                  Keine offenen Aufgaben auf deinem Schreibtisch. Alles erledigt!
                </div>
              ) : (
                openDeskTodos.map(todo => (
                  <div
                    key={todo.id}
                    style={{
                      background: '#ffffff',
                      border: todo.is_pinned ? '1.5px solid #0f172a' : '1px solid #e2e8f0',
                      borderRadius: '12px',
                      padding: '12px 16px',
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      gap: '12px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', flex: 1, minWidth: 0 }}>
                      <button
                        type="button"
                        onClick={() => onToggleCompleteTodo(todo.id)}
                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 0, marginTop: '2px' }}
                      >
                        <Circle size={17} color="#94a3b8" />
                      </button>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.84rem', fontWeight: 650, color: '#0f172a', lineHeight: 1.4 }}>
                          {todo.content}
                        </div>
                        <div style={{ fontSize: '0.70rem', color: '#64748b', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Clock size={11} color="#94a3b8" />
                          <span>{formatTime(todo.created_at)}</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <button
                        type="button"
                        onClick={() => onTogglePin(todo.id)}
                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '4px' }}
                      >
                        <Pin size={13} fill={todo.is_pinned ? '#0f172a' : 'none'} color={todo.is_pinned ? '#0f172a' : '#94a3b8'} />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteNote(todo.id)}
                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '4px', color: '#94a3b8' }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Sektion 2: Erledigt & Archiv */}
            {completedDeskTodos.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
                <div style={{ fontSize: '0.80rem', fontWeight: 800, color: '#64748b', padding: '0 4px' }}>
                  Erledigt & Archiv ({completedDeskTodos.length})
                </div>
                {completedDeskTodos.map(todo => (
                  <div
                    key={todo.id}
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      padding: '10px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '10px',
                      opacity: 0.8
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                      <button
                        type="button"
                        onClick={() => onToggleCompleteTodo(todo.id)}
                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 0 }}
                      >
                        <CheckCircle2 size={16} color="#16a34a" />
                      </button>
                      <div style={{
                        fontSize: '0.80rem',
                        color: '#64748b',
                        textDecoration: 'line-through',
                        flex: 1,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {todo.content}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onDeleteNote(todo.id)}
                      style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '2px', color: '#94a3b8' }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TAB 3: GEMELDETE RAUMMÄNGEL ──────────────────────────────────── */}
        {activeTab === 'defects' && (
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            maxWidth: '900px',
            width: '100%',
            margin: '0 auto',
            boxSizing: 'border-box'
          }} className="custom-scrollbar">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 850, color: '#0f172a' }}>
                  Gemeldete Raummängel ({defectNotes.length})
                </h2>
                <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                  Übersicht aller von dir übermittelten Defekte an Schulleitung und Hausmeister
                </div>
              </div>
            </div>

            {defectNotes.length === 0 ? (
              <div style={{
                padding: '48px 24px',
                background: '#ffffff',
                borderRadius: '16px',
                border: '1px dashed #cbd5e1',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                color: '#64748b'
              }}>
                <DoorClosed size={24} color="#94a3b8" />
                <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#0f172a' }}>
                  Keine offenen Mängel gemeldet
                </div>
                <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                  In deinen Unterrichtsräumen liegen aktuell keine gemeldeten Defekte vor.
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {defectNotes.map(def => {
                  const isResolved = def.is_completed || def.is_archived;
                  return (
                    <div
                      key={def.id}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        padding: '14px 16px',
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        gap: '14px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flex: 1, minWidth: 0 }}>
                        <span style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          background: '#f1f5f9',
                          border: '1px solid #e2e8f0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          <DoorClosed size={16} color="#0f172a" />
                        </span>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.82rem', fontWeight: 850, color: '#0f172a' }}>
                              {def.room_id || 'Unterrichtsraum'}
                            </span>
                            <span style={{
                              fontSize: '0.68rem',
                              fontWeight: 800,
                              padding: '2px 8px',
                              borderRadius: '100px',
                              background: isResolved ? '#f0fdf4' : '#fefce8',
                              color: isResolved ? '#15803d' : '#854d0e',
                              border: isResolved ? '1px solid #bbf7d0' : '1px solid #fef08a'
                            }}>
                              {isResolved ? 'Behoben ✓' : 'In Bearbeitung'}
                            </span>
                          </div>

                          <div style={{
                            fontSize: '0.82rem',
                            color: '#334155',
                            marginTop: '6px',
                            lineHeight: 1.4,
                            wordBreak: 'break-word'
                          }}>
                            {def.content}
                          </div>

                          <div style={{
                            fontSize: '0.70rem',
                            color: '#64748b',
                            marginTop: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <Clock size={11} color="#94a3b8" />
                            <span>Gemeldet am {formatTime(def.created_at)}</span>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {onResolveRoomIssue && !isResolved && (
                          <button
                            type="button"
                            onClick={() => onResolveRoomIssue(def.id, 'teacher')}
                            title="Als behoben markieren"
                            style={{
                              border: '1px solid #bbf7d0',
                              background: '#f0fdf4',
                              color: '#15803d',
                              fontSize: '0.72rem',
                              fontWeight: 750,
                              padding: '4px 8px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <Check size={12} />
                            <span>Behoben</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => onDeleteNote(def.id)}
                          title="Eintrag entfernen"
                          style={{
                            border: 'none',
                            background: 'transparent',
                            color: '#94a3b8',
                            cursor: 'pointer',
                            padding: '4px'
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
