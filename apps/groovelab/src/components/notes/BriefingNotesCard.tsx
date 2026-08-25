import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Edit3, 
  Mic, 
  Search, 
  Check, 
  CheckCheck, 
  Circle, 
  CheckCircle2, 
  BookOpen, 
  Send, 
  Trash2, 
  Pin, 
  SlidersHorizontal, 
  X, 
  ArrowUpRight, 
  Volume2, 
  Play, 
  Pause, 
  Lock, 
  User, 
  Sparkles,
  Calendar,
  Layers,
  Archive,
  Square
} from 'lucide-react';
import { useNotes } from '../../hooks/useNotes';
import { useVoiceToText } from '../../hooks/useVoiceToText';
import { checkIsAudioTresorActive } from '../../domain/stickersAndTresor';
import { UserNote } from '../../services/notesService';
import { supabase } from '../../lib/supabase';

interface BriefingNotesCardProps {
  user: any;
  schoolId?: number | string;
  activeStudent?: any;
  allStudents?: any[];
  onOpenDrawer?: () => void;
  onOpenHomeworkModal?: (student: any) => void;
}

export const BriefingNotesCard: React.FC<BriefingNotesCardProps> = ({
  user,
  schoolId,
  activeStudent,
  allStudents = [],
  onOpenDrawer,
  onOpenHomeworkModal
}) => {
  const {
    filteredNotes,
    searchQuery,
    setSearchQuery,
    createNote,
    deleteNote,
    togglePin,
    toggleCompleteTodo,
    toggleArchive,
    syncToHomeworkBook,
    saveStatus
  } = useNotes({ user, schoolId, activeStudent });

  const [inputContent, setInputContent] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [filterMode, setFilterMode] = useState<'all' | 'todos' | 'pinned' | 'student'>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [syncedIds, setSyncedIds] = useState<Set<string>>(new Set());

  // Audio Recording State
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [audioSeconds, setAudioSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [showTresorLockPrompt, setShowTresorLockPrompt] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  const hasTresor = checkIsAudioTresorActive(user);

  // Live Voice-to-Text (SpeechRecognition)
  const { isListening, startListening, stopListening, resetTranscript, isSupported: voiceSupported } = useVoiceToText({
    onResult: (text) => {
      setInputContent(prev => {
        const clean = prev.trim();
        return clean ? `${clean} ${text}` : text;
      });
    }
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Strict MediaStream Cleanup
  const stopHardwareStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => {
        try { t.stop(); } catch (e) {}
      });
      streamRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      stopHardwareStream();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // 1. Natural Language Entity Recognition (Apple Intelligence Style)
  const parsedIntent = useMemo(() => {
    const text = inputContent.trim();
    if (!text) return null;

    const lower = text.toLowerCase();

    // Student match (from active timeline student or roster)
    let detectedStudent = activeStudent || null;
    if (!detectedStudent && allStudents.length > 0) {
      for (const s of allStudents) {
        const fName = (s.first_name || s.name?.split(' ')[0] || '').toLowerCase();
        if (fName && fName.length > 2 && lower.includes(fName)) {
          detectedStudent = s;
          break;
        }
      }
    }

    // Homework detection
    const isHomework = lower.includes('hausaufgabe') || 
                       lower.includes('üben') || 
                       lower.includes('seite') || 
                       lower.includes('takt') || 
                       lower.includes('buch') || 
                       lower.includes('song') || 
                       text.includes('#');

    // Metronome / BPM detection
    const bpmMatch = text.match(/\b(?:bpm|tempo|metronom)\s*:?\s*(\d{2,3})\b/i) || text.match(/\b(\d{2,3})\s*bpm\b/i);
    const bpm = bpmMatch ? parseInt(bpmMatch[1], 10) : null;

    // Room / Repair detection
    const isRoomIssue = lower.includes('raum') || 
                        lower.includes('saite') || 
                        lower.includes('kabel') || 
                        lower.includes('defekt') || 
                        lower.includes('stimmen') || 
                        lower.includes('klavier');

    // ToDo detection
    const isTodo = text.startsWith('- ') || text.startsWith('//') || text.startsWith('[ ]') || lower.startsWith('todo');

    return {
      detectedStudent,
      isHomework,
      bpm,
      isRoomIssue,
      isTodo
    };
  }, [inputContent, activeStudent, allStudents]);

  // Handle Note Save
  const handleSave = async (extraAudioUrl?: string, duration?: number) => {
    const textToSave = inputContent.trim();
    if (!textToSave && !extraAudioUrl) return;

    const studentToLink = parsedIntent?.detectedStudent;

    await createNote(textToSave || 'Audio-Memo', {
      studentId: studentToLink?.id || null,
      studentName: studentToLink?.first_name ? `${studentToLink.first_name} ${studentToLink.last_name || ''}`.trim() : null,
      audioUrl: extraAudioUrl || null,
      audioDurationSeconds: duration || null,
      noteType: extraAudioUrl ? 'audio_memo' : parsedIntent?.isTodo ? 'todo' : parsedIntent?.isHomework ? 'student_note' : 'scratchpad'
    });

    setInputContent('');
    resetTranscript();
    setAudioBlob(null);
    setAudioUrl(null);
    showToast('Notiz gesichert');
  };

  // 1-Click Homework Transfer
  const handleDirectHomeworkTransfer = async () => {
    const student = parsedIntent?.detectedStudent || activeStudent;
    if (!student) {
      showToast('Kein Schüler zugeordnet');
      return;
    }

    const newNote = await createNote(inputContent.trim(), {
      studentId: student.id,
      studentName: student.first_name ? `${student.first_name} ${student.last_name || ''}`.trim() : student.name,
      noteType: 'student_note'
    });

    syncToHomeworkBook(newNote, student.id);
    setInputContent('');
    showToast(`Ins Hausaufgabenheft von ${student.first_name || student.name} übertragen`);
  };

  // Audio Recording (Audio-Tresor Gated)
  const startAudioMemo = async () => {
    if (!hasTresor) {
      setShowTresorLockPrompt(true);
      return;
    }
    setShowTresorLockPrompt(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        stopHardwareStream();
      };

      mediaRecorder.start(250);
      setIsRecordingAudio(true);
      setAudioSeconds(0);

      timerRef.current = setInterval(() => {
        setAudioSeconds(s => s + 1);
      }, 1000);
    } catch (e) {
      console.warn('Microphone error:', e);
    }
  };

  const stopAudioMemo = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecordingAudio(false);
  };

  const formatSecs = (s: number) => {
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${m}:${rem < 10 ? '0' : ''}${rem}`;
  };

  // Display notes filtered by clean mode
  const displayNotes = useMemo(() => {
    return filteredNotes.filter(n => {
      if (filterMode === 'todos') return n.note_type === 'todo' || n.tags.includes('todo');
      if (filterMode === 'pinned') return n.is_pinned;
      if (filterMode === 'student') return n.student_id || n.student_name;
      return true;
    });
  }, [filteredNotes, filterMode]);

  return (
    <div style={{
      background: '#ffffff',
      border: '1px solid rgba(226, 232, 240, 0.9)',
      borderRadius: '20px',
      padding: '20px 22px',
      boxShadow: '0 8px 24px -4px rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.9)',
      display: 'flex',
      flexDirection: 'column',
      gap: '14px',
      position: 'relative',
      fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif"
    }}>
      {/* Toast Overlay */}
      {toastMessage && (
        <div style={{
          position: 'absolute',
          top: '-12px',
          right: '18px',
          background: '#0f172a',
          color: '#ffffff',
          padding: '6px 14px',
          borderRadius: '100px',
          fontSize: '0.75rem',
          fontWeight: 700,
          boxShadow: '0 8px 20px rgba(0, 0, 0, 0.15)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          zIndex: 30
        }}>
          <Check size={12} strokeWidth={3} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. Calm Apple Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
            Notizen
          </span>
          {displayNotes.length > 0 && (
            <span style={{
              background: '#f1f5f9',
              color: '#64748b',
              borderRadius: '100px',
              padding: '2px 8px',
              fontSize: '0.68rem',
              fontWeight: 750
            }}>
              {displayNotes.length}
            </span>
          )}
        </div>

        {/* Minimalist Action Cluster (100% Monochrome Icons) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {/* Quick Filter Switcher */}
          <button
            onClick={() => setFilterMode(prev => prev === 'all' ? 'todos' : prev === 'todos' ? 'pinned' : 'all')}
            title="Filter umschalten (Alle / To-Dos / Angepinnt)"
            style={{
              background: filterMode !== 'all' ? '#f1f5f9' : 'transparent',
              border: 'none',
              borderRadius: '8px',
              padding: '6px',
              color: filterMode !== 'all' ? '#0f172a' : '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <SlidersHorizontal size={15} />
          </button>

          {/* Search Toggle */}
          <button
            onClick={() => setShowSearch(prev => !prev)}
            title="Suche öffnen"
            style={{
              background: showSearch ? '#f1f5f9' : 'transparent',
              border: 'none',
              borderRadius: '8px',
              padding: '6px',
              color: showSearch ? '#0f172a' : '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <Search size={15} />
          </button>

          {/* Live Voice Dictation Button */}
          <button
            onClick={() => isListening ? stopListening() : startListening()}
            title={isListening ? 'Diktat beenden' : 'Live Diktat (Sprache zu Text)'}
            style={{
              background: isListening ? '#0f172a' : 'transparent',
              color: isListening ? '#ffffff' : '#94a3b8',
              border: 'none',
              borderRadius: '8px',
              padding: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              transition: 'all 0.15s'
            }}
          >
            <Mic size={15} />
          </button>
        </div>
      </div>

      {/* Inline Search Bar (Progressive Disclosure) */}
      {showSearch && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          background: '#f8fafc',
          borderRadius: '10px',
          padding: '6px 10px',
          border: '1px solid #e2e8f0',
          gap: '8px'
        }}>
          <Search size={13} color="#94a3b8" />
          <input
            type="text"
            placeholder="Notizen durchsuchen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              background: 'none',
              border: 'none',
              outline: 'none',
              fontSize: '0.80rem',
              color: '#0f172a',
              width: '100%',
              fontFamily: 'inherit'
            }}
            autoFocus
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0 }}
            >
              <X size={13} />
            </button>
          )}
        </div>
      )}

      {/* 2. The Pure Paper Canvas (Zero Clutter Writing Surface) */}
      <div style={{
        background: '#f8fafc',
        borderRadius: '14px',
        padding: '12px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        border: '1px solid #f1f5f9',
        transition: 'border 0.2s, background 0.2s'
      }}>
        {/* Active lesson watermark clue if student is in room */}
        {activeStudent && !inputContent && (
          <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px' }}>
            <User size={11} color="#94a3b8" />
            <span>Unterricht mit {activeStudent.first_name || activeStudent.name}</span>
          </div>
        )}

        <textarea
          ref={textareaRef}
          value={inputContent}
          onChange={(e) => setInputContent(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
              e.preventDefault();
              handleSave();
            }
          }}
          placeholder={isListening ? 'Höre zu...' : 'Gedanke, Hausaufgabe oder To-Do notieren...'}
          rows={inputContent.includes('\n') ? 3 : 2}
          style={{
            width: '100%',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            resize: 'none',
            fontSize: '0.88rem',
            color: '#0f172a',
            fontWeight: 500,
            lineHeight: 1.45,
            fontFamily: 'inherit'
          }}
        />

        {/* Dynamic Voice Recording Waveform Bar */}
        {isListening && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: '#ffffff',
            padding: '6px 10px',
            borderRadius: '8px',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: '#0f172a',
              animation: 'pulse 1s infinite'
            }} />
            <span style={{ fontSize: '0.74rem', color: '#0f172a', fontWeight: 700 }}>
              Live Diktat aktiv • Spreche einfach frei
            </span>
          </div>
        )}

        {/* 3. Progressive Action Pill Bar (Only reveals when text is present) */}
        {inputContent.trim() && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: '6px',
            borderTop: '1px solid #e2e8f0',
            flexWrap: 'wrap',
            gap: '6px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              {/* Natural Homework Detection Pill */}
              {parsedIntent?.isHomework && (
                <button
                  onClick={handleDirectHomeworkTransfer}
                  style={{
                    background: '#0f172a',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '5px 10px',
                    fontSize: '0.72rem',
                    fontWeight: 750,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    transition: 'all 0.15s'
                  }}
                >
                  <BookOpen size={12} />
                  <span>Ins Hausaufgabenheft {parsedIntent.detectedStudent ? `(${parsedIntent.detectedStudent.first_name || parsedIntent.detectedStudent.name})` : ''} ➔</span>
                </button>
              )}

              {/* BPM / Tempo Pill */}
              {parsedIntent?.bpm && (
                <span style={{
                  background: '#f1f5f9',
                  color: '#0f172a',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '4px 8px',
                  fontSize: '0.72rem',
                  fontWeight: 750,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <Play size={10} />
                  <span>{parsedIntent.bpm} BPM</span>
                </span>
              )}

              {/* Room Issue Pill */}
              {parsedIntent?.isRoomIssue && (
                <button
                  onClick={() => {
                    handleSave();
                    showToast('An Schulleitung / Sekretariat weitergeleitet');
                  }}
                  style={{
                    background: '#f1f5f9',
                    color: '#334155',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    padding: '4px 8px',
                    fontSize: '0.72rem',
                    fontWeight: 750,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Send size={11} />
                  <span>Meldung an Sekretariat ➔</span>
                </button>
              )}
            </div>

            {/* Quick Save Button */}
            <button
              onClick={() => handleSave()}
              style={{
                background: '#0f172a',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '5px 12px',
                fontSize: '0.74rem',
                fontWeight: 750,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <Check size={13} />
              <span>Sichern</span>
            </button>
          </div>
        )}
      </div>

      {/* Audio-Tresor Storage Lock Notice (if triggered) */}
      {showTresorLockPrompt && (
        <div style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '10px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          fontSize: '0.74rem',
          color: '#64748b'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Lock size={13} color="#64748b" />
            <span>Audio-Memos sind im Zusatz-Speichervolumen <strong>Audio-Tresor</strong> verfügbar. Live-Diktat ist 100% inklusive.</span>
          </div>
          <button
            onClick={() => setShowTresorLockPrompt(false)}
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0 }}
          >
            <X size={13} />
          </button>
        </div>
      )}

      {/* 4. The Notes Stream (Clean Magazine-Typography) */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        maxHeight: '260px',
        overflowY: 'auto',
        paddingRight: '2px'
      }}>
        {displayNotes.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '18px 10px',
            color: '#94a3b8',
            fontSize: '0.78rem',
            fontWeight: 500
          }}>
            {searchQuery ? 'Keine Treffer.' : 'Alles erledigt. Schreibe eine Notiz oben.'}
          </div>
        ) : (
          displayNotes.map((note) => {
            const isTodo = note.note_type === 'todo' || note.tags.includes('todo') || note.content.startsWith('- ');
            const isSynced = syncedIds.has(note.id) || note.visibility === 'student_shared';

            return (
              <div
                key={note.id}
                style={{
                  padding: '9px 12px',
                  borderRadius: '10px',
                  background: note.is_pinned ? '#f8fafc' : 'transparent',
                  border: note.is_pinned ? '1px solid #e2e8f0' : '1px solid transparent',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: '10px',
                  transition: 'all 0.15s'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', flex: 1, minWidth: 0 }}>
                  {/* Monochrome ToDo Checkbox */}
                  {isTodo ? (
                    <button
                      onClick={() => toggleCompleteTodo(note.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: note.is_completed ? '#34a853' : '#94a3b8',
                        cursor: 'pointer',
                        padding: 0,
                        marginTop: '1px',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      {note.is_completed ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                    </button>
                  ) : (
                    <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#94a3b8', marginTop: '7px', flexShrink: 0 }} />
                  )}

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: '0.82rem',
                      color: note.is_completed ? '#94a3b8' : '#0f172a',
                      textDecoration: note.is_completed ? 'line-through' : 'none',
                      lineHeight: 1.4,
                      fontWeight: 500,
                      wordBreak: 'break-word'
                    }}>
                      {note.content}
                    </div>

                    {/* Meta info: Student, synced tag */}
                    {(note.student_name || isSynced) && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px' }}>
                        {note.student_name && (
                          <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 650, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            <User size={10} />
                            {note.student_name}
                          </span>
                        )}
                        {isSynced && (
                          <span style={{ fontSize: '0.68rem', color: '#34a853', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            <CheckCheck size={11} />
                            Im Hausaufgabenheft
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Quiet Item Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '3px', flexShrink: 0 }}>
                  <button
                    onClick={() => togglePin(note.id)}
                    title={note.is_pinned ? 'Lösen' : 'Anpinnen'}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: note.is_pinned ? '#0f172a' : '#cbd5e1',
                      cursor: 'pointer',
                      padding: '3px'
                    }}
                  >
                    <Pin size={12} />
                  </button>
                  <button
                    onClick={() => deleteNote(note.id)}
                    title="Löschen"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#cbd5e1',
                      cursor: 'pointer',
                      padding: '3px'
                    }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 5. Minimalist Footer */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: '8px',
        borderTop: '1px solid #f1f5f9',
        fontSize: '0.68rem',
        color: '#94a3b8',
        fontWeight: 600
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#34a853' }} />
          <span>Automatisch synchronisiert</span>
        </div>
        <div>
          Shortcut <kbd style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '1px 4px', fontFamily: 'monospace' }}>⌘J</kbd>
        </div>
      </div>
    </div>
  );
};
