import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  User, 
  Check, 
  Trash2, 
  Mic, 
  Wrench, 
  Layers, 
  ArrowUpRight, 
  ChevronDown, 
  Clock, 
  Sparkles, 
  CheckCircle2, 
  Circle, 
  X, 
  Send,
  DoorClosed,
  Inbox,
  Zap
} from 'lucide-react';
import { UserNote, maskStudentName } from '../../../services/notesService';
import { useVoiceToText } from '../../../hooks/useVoiceToText';
import { capitalizeFirstLetter } from '../../../utils/nameHelper';

export interface TeacherNotesWidgetProps {
  user: any;
  schoolId?: number | string;
  activeStudent?: any;
  allStudents?: any[];
  todayStudents?: any[];
  rooms?: any[];
  currentRoom?: string;
  teacherTodayRooms?: string[];
  notes: UserNote[];
  onCreateNote: (content: string, options?: any) => Promise<any>;
  onDeleteNote: (id: string) => Promise<any>;
  onToggleCompleteTodo: (id: string) => Promise<any>;
  onOpenBoard: () => void;
  widgetState?: 'VORBEREITUNG' | 'ACTIVE' | 'FEIERABEND' | 'PAUSE' | 'WEEKEND' | string;
}

export const TeacherNotesWidget: React.FC<TeacherNotesWidgetProps> = ({
  user,
  schoolId,
  activeStudent,
  allStudents = [],
  todayStudents = [],
  rooms = [],
  currentRoom = '',
  teacherTodayRooms = [],
  notes = [],
  onCreateNote,
  onDeleteNote,
  onToggleCompleteTodo,
  onOpenBoard,
  widgetState = 'ACTIVE'
}) => {
  // 1. Natural Lifecycle Context Determination (Morgen -> Unterricht -> Feierabend)
  const isLessonActive = Boolean(activeStudent && widgetState === 'ACTIVE');
  const [activeTab, setActiveTab] = useState<'student' | 'desk'>(() => {
    return isLessonActive ? 'student' : 'desk';
  });

  // Track the student for the student-notes tab
  const [selectedStudent, setSelectedStudent] = useState<any>(activeStudent || todayStudents[0] || null);
  const [showStudentPicker, setShowStudentPicker] = useState<boolean>(false);
  const studentPickerRef = useRef<HTMLDivElement | null>(null);

  // When activeStudent changes via lesson schedule, naturally follow it
  useEffect(() => {
    if (activeStudent) {
      setSelectedStudent(activeStudent);
      setActiveTab('student');
    } else if (widgetState === 'FEIERABEND' || widgetState === 'VORBEREITUNG') {
      setActiveTab('desk');
    }
  }, [activeStudent?.id, widgetState]);

  // Close student picker on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (studentPickerRef.current && !studentPickerRef.current.contains(e.target as Node)) {
        setShowStudentPicker(false);
      }
    };
    if (showStudentPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showStudentPicker]);

  // Effective room for defects
  const effectiveRoom = currentRoom || teacherTodayRooms[0] || (rooms[0]?.name) || 'Raum 1';
  const [defectRoom, setDefectRoom] = useState<string>(effectiveRoom);
  const [showAllRoomsPicker, setShowAllRoomsPicker] = useState<boolean>(false);
  const [showDefectModal, setShowDefectModal] = useState<boolean>(false);
  const [defectText, setDefectText] = useState<string>('');
  const [isSubmittingDefect, setIsSubmittingDefect] = useState<boolean>(false);
  const [defectSuccess, setDefectSuccess] = useState<boolean>(false);
  const defectModalRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (effectiveRoom) {
      setDefectRoom(effectiveRoom);
    }
  }, [effectiveRoom]);

  // Text inputs & voice dictation
  const [inputText, setInputText] = useState<string>('');
  const [isSubmittingNote, setIsSubmittingNote] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Dictation for main note input
  const {
    isListening: isNoteListening,
    transcript: noteTranscript,
    startListening: startNoteListening,
    stopListening: stopNoteListening,
    isSupported: isSpeechSupported
  } = useVoiceToText();

  useEffect(() => {
    if (noteTranscript) {
      setInputText(prev => {
        const clean = prev.trim();
        const addition = capitalizeFirstLetter(noteTranscript);
        return clean ? `${clean} ${addition}` : addition;
      });
    }
  }, [noteTranscript]);

  const toggleNoteDictation = () => {
    if (isNoteListening) {
      stopNoteListening();
    } else {
      startNoteListening();
    }
  };

  // Student display info
  const studentFirstName = selectedStudent?.first_name || selectedStudent?.name?.split(' ')[0] || 'Schüler';
  const studentFullName = selectedStudent ? maskStudentName(selectedStudent.first_name || selectedStudent.name) : 'Schüler';
  const studentInstrument = selectedStudent?.instrument || 'Musik';
  const isAutoActive = Boolean(activeStudent && selectedStudent && (selectedStudent.id === activeStudent.id));

  // Filter notes for the active context
  const contextNotes = useMemo(() => {
    if (activeTab === 'student') {
      if (!selectedStudent) return [];
      const sId = selectedStudent.id;
      const sName = (selectedStudent.first_name || selectedStudent.name || '').toLowerCase();
      return notes.filter(n => {
        if (n.is_archived || n.note_type === 'room_issue') return false;
        if (n.student_id && sId && String(n.student_id) === String(sId)) return true;
        if (n.student_name && sName && n.student_name.toLowerCase().includes(sName)) return true;
        return false;
      });
    } else {
      // Desk / To-Dos (notes without student or general to-dos)
      return notes.filter(n => {
        if (n.is_archived || n.note_type === 'room_issue') return false;
        return !n.student_id && (!n.student_name || n.note_type === 'todo');
      });
    }
  }, [notes, activeTab, selectedStudent]);

  // Submission handler
  const handleCreateNote = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = inputText.trim();
    if (!clean || isSubmittingNote) return;

    setIsSubmittingNote(true);
    try {
      if (activeTab === 'student' && selectedStudent) {
        await onCreateNote(clean, {
          studentId: selectedStudent.id,
          studentName: selectedStudent.first_name || selectedStudent.name,
          noteType: 'student_note',
          visibility: 'private'
        });
      } else {
        await onCreateNote(clean, {
          noteType: 'todo',
          visibility: 'private'
        });
      }
      setInputText('');
    } catch (err) {
      console.error('[TeacherNotesWidget] Failed to create note:', err);
    } finally {
      setIsSubmittingNote(false);
      if (inputRef.current) inputRef.current.focus();
    }
  };

  // Defect submission handler
  const handleSendDefect = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = defectText.trim();
    if (!clean || isSubmittingDefect) return;

    setIsSubmittingDefect(true);
    try {
      await onCreateNote(clean, {
        roomId: defectRoom,
        noteType: 'room_issue',
        visibility: 'school_admin'
      });
      setDefectSuccess(true);
      setTimeout(() => {
        setShowDefectModal(false);
        setDefectSuccess(false);
        setDefectText('');
      }, 1200);
    } catch (err) {
      console.error('[TeacherNotesWidget] Failed to submit room issue:', err);
    } finally {
      setIsSubmittingDefect(false);
    }
  };

  const formatNoteTime = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      const now = new Date();
      const isToday = d.toDateString() === now.toDateString();
      if (isToday) {
        return `Heute, ${d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`;
      }
      return d.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' });
    } catch {
      return '';
    }
  };

  return (
    <div style={{
      width: '100%',
      background: '#ffffff',
      borderRadius: '24px',
      border: '1px solid #e2e8f0',
      boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.05)',
      padding: '20px',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      gap: '14px',
      position: 'relative'
    }}>
      {/* ── HEADER: TITEL & DISKRETE AKTIONEN ───────────────────────────── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h2 style={{
            margin: 0,
            fontSize: '1.05rem',
            fontWeight: 850,
            color: '#0f172a',
            letterSpacing: '-0.02em'
          }}>
            Notizen & To-Dos
          </h2>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* 1-TAP RAUMMANGEL TRIGGER (MONOCHROM & 100% ISOLIERT) */}
          <button
            type="button"
            onClick={() => {
              setDefectRoom(effectiveRoom);
              setShowAllRoomsPicker(false);
              setShowDefectModal(true);
            }}
            title={`${effectiveRoom} Mangel melden`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 10px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              background: '#f8fafc',
              color: '#334155',
              fontSize: '0.74rem',
              fontWeight: 750,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            className="hover-scale-mini"
          >
            <Wrench size={12} strokeWidth={2.2} color="#475569" />
            <span>{effectiveRoom} melden</span>
          </button>

          {/* NOTIZEN-BOARD BUTTON */}
          <button
            type="button"
            onClick={onOpenBoard}
            title="Großes Notizen-Board öffnen"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '5px 11px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              background: '#f8fafc',
              color: '#334155',
              fontSize: '0.74rem',
              fontWeight: 750,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            className="hover-scale-mini"
          >
            <Layers size={13} color="#475569" />
            <span>Notizen-Board</span>
            <ArrowUpRight size={11} color="#64748b" />
          </button>
        </div>
      </div>

      {/* ── SEGMENTED CONTROL: [ SCHÜLER ] VS [ MEIN SCHREIBTISCH ] ── */}
      <div style={{
        display: 'flex',
        background: '#f1f5f9',
        padding: '3px',
        borderRadius: '12px',
        gap: '4px',
        position: 'relative'
      }}>
        {/* TAB 1: SCHÜLER-NOTIZ */}
        <div ref={studentPickerRef} style={{ flex: 1, position: 'relative' }}>
          <button
            type="button"
            onClick={() => {
              if (activeTab === 'student') {
                setShowStudentPicker(prev => !prev);
              } else {
                setActiveTab('student');
                if (!selectedStudent && todayStudents.length > 0) {
                  setSelectedStudent(todayStudents[0]);
                }
              }
            }}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '7px 10px',
              borderRadius: '9px',
              border: 'none',
              background: activeTab === 'student' ? '#ffffff' : 'transparent',
              color: activeTab === 'student' ? '#0f172a' : '#64748b',
              fontWeight: activeTab === 'student' ? 850 : 650,
              fontSize: '0.80rem',
              cursor: 'pointer',
              boxShadow: activeTab === 'student' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {isAutoActive ? (
                <Zap size={13} color={activeTab === 'student' ? '#0f172a' : '#64748b'} />
              ) : (
                <User size={13} color={activeTab === 'student' ? '#0f172a' : '#64748b'} />
              )}
              <span>{studentFullName} ({studentInstrument})</span>
            </span>
            <ChevronDown size={12} color={activeTab === 'student' ? '#0f172a' : '#94a3b8'} />
          </button>

          {/* SCHÜLER AUSWAHL-DROPDOWN */}
          {showStudentPicker && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              left: 0,
              width: '260px',
              maxWidth: '90vw',
              background: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 10px 25px -4px rgba(15, 23, 42, 0.15)',
              padding: '6px',
              zIndex: 100,
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              maxHeight: '260px',
              overflowY: 'auto'
            }}>
              <div style={{
                fontSize: '0.68rem',
                fontWeight: 800,
                color: '#64748b',
                textTransform: 'uppercase',
                padding: '4px 8px',
                letterSpacing: '0.04em'
              }}>
                Heute im Stundenplan:
              </div>

              {todayStudents.length === 0 ? (
                <div style={{ padding: '8px', fontSize: '0.74rem', color: '#94a3b8', fontStyle: 'italic' }}>
                  Keine Schüler für heute geladen
                </div>
              ) : (
                todayStudents.map(st => {
                  const isCurrentActive = activeStudent && String(activeStudent.id) === String(st.id);
                  const isSelected = selectedStudent && String(selectedStudent.id) === String(st.id);
                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => {
                        setSelectedStudent(st);
                        setActiveTab('student');
                        setShowStudentPicker(false);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '6px 8px',
                        borderRadius: '6px',
                        border: 'none',
                        background: isSelected ? '#f1f5f9' : 'transparent',
                        color: isSelected ? '#0f172a' : '#334155',
                        fontWeight: isSelected ? 800 : 650,
                        fontSize: '0.76rem',
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {isCurrentActive ? (
                          <Zap size={11} color="#0f172a" />
                        ) : (
                          <User size={11} color="#94a3b8" />
                        )}
                        <span>{maskStudentName(st.first_name || st.name)}</span>
                      </span>
                      <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
                        {st.instrument || ''}
                      </span>
                    </button>
                  );
                })
              )}

              {allStudents.length > todayStudents.length && (
                <>
                  <div style={{ borderTop: '1px solid #f1f5f9', margin: '4px 0' }} />
                  <div style={{
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    color: '#64748b',
                    textTransform: 'uppercase',
                    padding: '4px 8px',
                    letterSpacing: '0.04em'
                  }}>
                    Weitere Schüler:
                  </div>
                  {allStudents
                    .filter(s => !todayStudents.some(t => String(t.id) === String(s.id)))
                    .slice(0, 10)
                    .map(st => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => {
                          setSelectedStudent(st);
                          setActiveTab('student');
                          setShowStudentPicker(false);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '6px 8px',
                          borderRadius: '6px',
                          border: 'none',
                          background: 'transparent',
                          color: '#334155',
                          fontSize: '0.74rem',
                          fontWeight: 650,
                          cursor: 'pointer',
                          textAlign: 'left'
                        }}
                      >
                        <span>{maskStudentName(st.first_name || st.name)}</span>
                        <span style={{ fontSize: '0.66rem', color: '#94a3b8' }}>{st.instrument || ''}</span>
                      </button>
                    ))}
                </>
              )}
            </div>
          )}
        </div>

        {/* TAB 2: MEIN SCHREIBTISCH */}
        <button
          type="button"
          onClick={() => setActiveTab('desk')}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: '7px 10px',
            borderRadius: '9px',
            border: 'none',
            background: activeTab === 'desk' ? '#ffffff' : 'transparent',
            color: activeTab === 'desk' ? '#0f172a' : '#64748b',
            fontWeight: activeTab === 'desk' ? 850 : 650,
            fontSize: '0.80rem',
            cursor: 'pointer',
            boxShadow: activeTab === 'desk' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
            transition: 'all 0.15s ease'
          }}
        >
          <Inbox size={13} color={activeTab === 'desk' ? '#0f172a' : '#64748b'} />
          <span>Mein Schreibtisch</span>
        </button>
      </div>

      {/* ── EINGABEZEILE (PURISTISCH & SCHNELL, ZERO CLUTTER) ──────────── */}
      <form onSubmit={handleCreateNote} style={{ width: '100%' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: '#f8fafc',
          border: '1px solid #cbd5e1',
          borderRadius: '12px',
          padding: '6px 12px',
          transition: 'all 0.15s ease'
        }}>
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              activeTab === 'student'
                ? `Notiz oder Beobachtung zu ${studentFirstName} schreiben...`
                : 'Aufgabe oder To-Do notieren (Enter zum Speichern)...'
            }
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

          {/* SPRACH-DIKTAT MIKROFON */}
          {isSpeechSupported && (
            <button
              type="button"
              onClick={toggleNoteDictation}
              title={isNoteListening ? "Diktat stoppen" : "Notiz sprechen (Diktat)"}
              style={{
                border: 'none',
                background: isNoteListening ? '#ef4444' : 'transparent',
                color: isNoteListening ? '#ffffff' : '#64748b',
                width: '30px',
                height: '30px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <Mic size={15} />
            </button>
          )}

          {/* ABSENDEN BUTTON */}
          <button
            type="submit"
            disabled={!inputText.trim() || isSubmittingNote}
            title="Notiz speichern (Enter)"
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
              cursor: inputText.trim() ? 'pointer' : 'default',
              transition: 'all 0.15s ease'
            }}
          >
            <Send size={13} />
          </button>
        </div>
      </form>

      {/* ── NOTIZEN-FEED (REDUZIERT & CHRONOLOGISCH) ────────────────────── */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        maxHeight: '260px',
        overflowY: 'auto'
      }} className="custom-scrollbar">
        {contextNotes.length === 0 ? (
          <div style={{
            padding: '24px 16px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '6px',
            color: '#64748b'
          }}>
            <Sparkles size={20} color="#94a3b8" />
            <div style={{ fontSize: '0.80rem', fontWeight: 650 }}>
              {activeTab === 'student'
                ? `Noch keine Notizen zu ${studentFirstName}.`
                : 'Keine offenen Aufgaben auf deinem Schreibtisch.'}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
              {activeTab === 'student'
                ? 'Tippe oben, um deine erste pädagogische Beobachtung festzuhalten.'
                : 'Schreibe oben To-Dos für deinen Unterrichtstag.'}
            </div>
          </div>
        ) : (
          contextNotes.slice(0, 15).map(note => {
            const isCompleted = note.is_completed;
            return (
              <div
                key={note.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: '10px',
                  padding: '9px 12px',
                  borderRadius: '10px',
                  background: isCompleted ? '#f8fafc' : '#ffffff',
                  border: '1px solid #e2e8f0',
                  transition: 'all 0.12s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '9px', flex: 1, minWidth: 0 }}>
                  {/* ABHAKEN-CIRCLE FÜR TO-DOS / SCHÜLERNOTIZEN */}
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
                    {isCompleted ? <CheckCircle2 size={16} color="#16a34a" /> : <Circle size={16} />}
                  </button>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: '0.80rem',
                      fontWeight: 650,
                      color: isCompleted ? '#94a3b8' : '#0f172a',
                      textDecoration: isCompleted ? 'line-through' : 'none',
                      lineHeight: 1.35,
                      wordBreak: 'break-word'
                    }}>
                      {note.content}
                    </div>
                    <div style={{
                      fontSize: '0.68rem',
                      color: '#64748b',
                      marginTop: '3px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <Clock size={10} color="#94a3b8" />
                      <span>{formatNoteTime(note.created_at)}</span>
                    </div>
                  </div>
                </div>

                {/* DISKRETER LÖSCHEN-BUTTON */}
                <button
                  type="button"
                  onClick={() => onDeleteNote(note.id)}
                  title="Notiz löschen"
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    padding: '2px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '4px'
                  }}
                  className="hover-opacity-full"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* ── FOOTER: STATUS & BOARD-LINK ─────────────────────────────────── */}
      {contextNotes.length > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderTop: '1px solid #f1f5f9',
          paddingTop: '8px',
          fontSize: '0.72rem',
          color: '#64748b'
        }}>
          <span>{contextNotes.length} Notizen {activeTab === 'student' ? `zu ${studentFirstName}` : 'auf Schreibtisch'}</span>
          <button
            type="button"
            onClick={onOpenBoard}
            style={{
              border: 'none',
              background: 'transparent',
              color: '#0f172a',
              fontWeight: 750,
              fontSize: '0.72rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px',
              padding: 0
            }}
          >
            <span>Alle im Notizen-Board öffnen</span>
            <ArrowUpRight size={11} />
          </button>
        </div>
      )}

      {/* ── 1-TAP RAUMMANGEL POPOVER / MODAL (100% DECOUPLED) ───────────── */}
      {showDefectModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(3px)',
          WebkitBackdropFilter: 'blur(3px)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}>
          <div
            ref={defectModalRef}
            role="dialog"
            aria-modal="true"
            aria-label="Raummangel melden"
            style={{
              width: '100%',
              maxWidth: '440px',
              background: '#ffffff',
              borderRadius: '20px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 20px 40px -8px rgba(15, 23, 42, 0.25)',
              padding: '20px',
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px'
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                <span style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '9px',
                  background: '#f1f5f9',
                  border: '1px solid #e2e8f0',
                  color: '#0f172a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Wrench size={15} color="#0f172a" />
                </span>
                <div>
                  <div style={{ fontSize: '0.94rem', fontWeight: 850, color: '#0f172a' }}>
                    Mangel melden
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                    Direkte Weiterleitung an Schulleitung & Hausmeister
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDefectModal(false)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Raum-Kontext: Ausschließlich der aktuelle Unterrichtsraum des Lehrers */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 12px',
              borderRadius: '10px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <DoorClosed size={15} color="#475569" />
                <span style={{ fontSize: '0.80rem', fontWeight: 800, color: '#0f172a' }}>
                  {defectRoom}
                </span>
                <span style={{ fontSize: '0.70rem', color: '#64748b', fontWeight: 650 }}>
                  • {isLessonActive ? 'Dein aktueller Unterrichtsraum' : 'Dein heutiger Raum'}
                </span>
              </div>

              {/* Optionaler Raumwechsler nur falls die Lehrkraft heute mehrere Räume hat */}
              {teacherTodayRooms.length > 1 && (
                <button
                  type="button"
                  onClick={() => setShowAllRoomsPicker(prev => !prev)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    fontSize: '0.70rem',
                    color: '#64748b',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    padding: '2px 4px'
                  }}
                >
                  {showAllRoomsPicker ? 'Schließen' : 'Anderer Raum'}
                </button>
              )}
            </div>

            {/* Aufgeklappte alternative Räume nur bei explizitem Klick */}
            {showAllRoomsPicker && teacherTodayRooms.length > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', padding: '2px 0' }}>
                {teacherTodayRooms.map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => {
                      setDefectRoom(r);
                      setShowAllRoomsPicker(false);
                    }}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      border: defectRoom === r ? '1px solid #0f172a' : '1px solid #cbd5e1',
                      background: defectRoom === r ? '#0f172a' : '#ffffff',
                      color: defectRoom === r ? '#ffffff' : '#334155',
                      fontSize: '0.72rem',
                      fontWeight: 750,
                      cursor: 'pointer'
                    }}
                  >
                    {r}
                  </button>
                ))}
              </div>
            )}

            {/* Textfeld */}
            <form onSubmit={handleSendDefect} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <textarea
                value={defectText}
                onChange={(e) => setDefectText(e.target.value)}
                placeholder={`Was ist in ${defectRoom} defekt oder fehlt? (z.B. Klavierbank wackelt, Gitarrenkabel brummt, Heizung kalt)...`}
                rows={3}
                autoFocus
                style={{
                  width: '100%',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  padding: '10px',
                  fontSize: '0.82rem',
                  color: '#0f172a',
                  outline: 'none',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit',
                  resize: 'none'
                }}
              />

              {defectSuccess ? (
                <div style={{
                  padding: '10px',
                  borderRadius: '10px',
                  background: '#f0fdf4',
                  border: '1px solid #86efac',
                  color: '#15803d',
                  fontSize: '0.80rem',
                  fontWeight: 800,
                  textAlign: 'center',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}>
                  <Check size={16} />
                  <span>Mangel an Schulleitung übermittelt!</span>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setShowDefectModal(false)}
                    style={{
                      padding: '7px 14px',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      background: '#ffffff',
                      color: '#475569',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Abbrechen
                  </button>
                  <button
                    type="submit"
                    disabled={!defectText.trim() || isSubmittingDefect}
                    style={{
                      padding: '7px 16px',
                      borderRadius: '8px',
                      border: 'none',
                      background: defectText.trim() ? '#0f172a' : '#e2e8f0',
                      color: defectText.trim() ? '#ffffff' : '#94a3b8',
                      fontSize: '0.78rem',
                      fontWeight: 800,
                      cursor: defectText.trim() ? 'pointer' : 'default',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <Send size={13} color={defectText.trim() ? '#ffffff' : '#94a3b8'} />
                    <span>Mangel absenden</span>
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
