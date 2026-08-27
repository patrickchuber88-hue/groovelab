import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  X,
  Plus,
  Search,
  Mic,
  Pin,
  Check,
  CheckCheck,
  Circle,
  CheckCircle2,
  Calendar,
  User,
  Trash2,
  Layers,
  ArrowUpRight,
  BookOpen,
  DoorOpen,
  Hash,
  AlertTriangle,
  Play,
  Pause,
  Square,
  Zap,
  SlidersHorizontal,
  ChevronDown,
  Sparkles,
  Inbox,
  Clock,
  Archive,
  CheckSquare,
  Edit3,
  Activity,
  Volume2,
  Music,
  Building2,
  GraduationCap,
  Lightbulb,
  RotateCcw,
  Command,
  Send
} from 'lucide-react';
import { UserNote, maskStudentName } from '../../services/notesService';
import { useVoiceToText } from '../../hooks/useVoiceToText';

export interface TagDefinition {
  key: string;
  tag: string;
  label: string;
  desc: string;
  color: string;
  bg: string;
  border: string;
  iconName: string;
}

export const STUDENT_SKILL_TAGS: TagDefinition[] = [
  { key: 'technik', tag: '#Technik', label: 'Technik', desc: 'Motorik & Handhaltung', color: '#1e40af', bg: '#eff6ff', border: '#bfdbfe', iconName: 'zap' },
  { key: 'rhythmus', tag: '#Rhythmus', label: 'Rhythmus', desc: 'Timing & Metronom', color: '#4338ca', bg: '#e0e7ff', border: '#c7d2fe', iconName: 'activity' },
  { key: 'klang', tag: '#Klang', label: 'Klang', desc: 'Intonation & Tonkultur', color: '#166534', bg: '#e6f4ea', border: '#bbf7d0', iconName: 'volume' },
  { key: 'ausdruck', tag: '#Ausdruck', label: 'Ausdruck', desc: 'Dynamik & Phrasierung', color: '#6b21a8', bg: '#f3e8ff', border: '#e9d5ff', iconName: 'sparkles' },
  { key: 'repertoire', tag: '#Repertoire', label: 'Repertoire', desc: 'Songs & Stücke', color: '#854d0e', bg: '#fef9c3', border: '#fef08a', iconName: 'music' },
  { key: 'hausaufgabe', tag: '#Hausaufgabe', label: 'Hausaufgabe', desc: 'Wochenauftrag', color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0', iconName: 'book' },
];

export const TEACHER_ORGANIZATION_TAGS: TagDefinition[] = [
  { key: 'todo', tag: '#To-Do', label: 'To-Do', desc: 'Aufgabe & Erledigung', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', iconName: 'check-square' },
  { key: 'verwaltung', tag: '#Verwaltung', label: 'Verwaltung', desc: 'Sekretariat & Orga', color: '#b45309', bg: '#fef3c7', border: '#fde68a', iconName: 'building' },
  { key: 'raum', tag: '#Raum', label: 'Raum', desc: 'Equipment & Defekte', color: '#dc2626', bg: '#fee2e2', border: '#fecaca', iconName: 'door' },
  { key: 'konzert', tag: '#Konzert', label: 'Konzert', desc: 'Vorspiel & Bühne', color: '#9a3412', bg: '#ffedd5', border: '#fed7aa', iconName: 'graduation' },
  { key: 'idee', tag: '#Idee', label: 'Idee', desc: 'Methode & Material', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', iconName: 'lightbulb' },
  { key: 'wichtig', tag: '#Wichtig', label: 'Wichtig', desc: 'Dringender Hinweis', color: '#9f1239', bg: '#ffe4e6', border: '#fecdd3', iconName: 'pin' },
];

export const renderMonochromeTagIcon = (iconName: string, size = 11, color = 'currentColor') => {
  switch (iconName) {
    case 'zap': return <Zap size={size} color={color} />;
    case 'activity': return <Activity size={size} color={color} />;
    case 'volume': return <Volume2 size={size} color={color} />;
    case 'sparkles': return <Sparkles size={size} color={color} />;
    case 'music': return <Music size={size} color={color} />;
    case 'book': return <BookOpen size={size} color={color} />;
    case 'check-square': return <CheckSquare size={size} color={color} />;
    case 'building': return <Building2 size={size} color={color} />;
    case 'door': return <DoorOpen size={size} color={color} />;
    case 'graduation': return <GraduationCap size={size} color={color} />;
    case 'lightbulb': return <Lightbulb size={size} color={color} />;
    case 'pin': return <Pin size={size} color={color} />;
    default: return <Hash size={size} color={color} />;
  }
};

export const getAllTagStyle = (tagStr: string) => {
  const clean = tagStr.replace(/^#/, '').toLowerCase();
  const all = [...STUDENT_SKILL_TAGS, ...TEACHER_ORGANIZATION_TAGS];
  const found = all.find(t => t.key === clean || t.tag.toLowerCase() === `#${clean}` || t.label.toLowerCase() === clean);
  if (found) return found;
  return { key: clean, tag: `#${clean}`, label: clean, color: '#475569', bg: '#f1f5f9', border: '#e2e8f0', iconName: 'hash' };
};

// Clean Natural Language Note Content for Typography (Strips redundant @Name, - , !Room)
export const formatCleanNoteContent = (content: string, studentName?: string | null): string => {
  if (!content) return '';
  let cleaned = content.trim();

  // Strip leading @Student or @Name
  if (studentName) {
    const fName = studentName.split(/\s+/)[0];
    const regexExact = new RegExp(`^@${fName}\\s*`, 'i');
    cleaned = cleaned.replace(regexExact, '');
  }
  cleaned = cleaned.replace(/^@[A-Za-z0-9äöüÄÖÜß\.\s]+?(?=[\s,;!#]|$)\s*/i, '');

  // Strip leading - or // or [ ] or todo:
  if (cleaned.startsWith('- ')) {
    cleaned = cleaned.slice(2).trim();
  } else if (cleaned.startsWith('// ')) {
    cleaned = cleaned.slice(3).trim();
  } else if (cleaned.startsWith('[ ] ')) {
    cleaned = cleaned.slice(4).trim();
  } else if (/^todo:\s*/i.test(cleaned)) {
    cleaned = cleaned.replace(/^todo:\s*/i, '');
  }

  // Strip leading !Room (e.g. !Raum 4, !Raum 4:, !Konzertsaal, !Groovelab Nebenraum)
  cleaned = cleaned.replace(/^![A-Za-z0-9äöüÄÖÜß_-]+(?:\s+(?:\d+|Nebenraum|Studio|Saal))?(?=[\s,;!#:]|$)\s*:?\s*/i, '');
  // Strip leading Mangel-Phrases if user used snippet
  cleaned = cleaned.replace(/^(?:Mangel melden|Mangel|Defekt|Reparatur)\s*:?\s*/i, '');

  if (!cleaned) return content;
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
};

interface TeacherNotesBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  notes: UserNote[];
  allStudents?: any[];
  todayStudents?: any[];
  user: any;
  onCreateNote: (content: string, options?: any) => Promise<any>;
  onUpdateNote: (id: string, updates: Partial<UserNote>) => Promise<any>;
  onDeleteNote: (id: string) => Promise<any>;
  onTogglePin: (id: string) => Promise<any>;
  onToggleCompleteTodo: (id: string) => Promise<any>;
  onToggleArchive: (id: string) => Promise<any>;
  onSyncToHomeworkBook?: (note: UserNote) => Promise<any>;
  onOpenHomeworkModal?: (student: any) => void;
  onOpenCommandPalette?: () => void;
}

export const TeacherNotesBoardModal: React.FC<TeacherNotesBoardModalProps> = ({
  isOpen,
  onClose,
  notes,
  allStudents = [],
  todayStudents = [],
  user,
  onCreateNote,
  onUpdateNote,
  onDeleteNote,
  onTogglePin,
  onToggleCompleteTodo,
  onToggleArchive,
  onSyncToHomeworkBook,
  onOpenHomeworkModal,
  onOpenCommandPalette
}) => {
  const [viewMode, setViewMode] = useState<'kanban' | 'list' | 'students'>('kanban');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(null);
  const [activeTagPickerNoteId, setActiveTagPickerNoteId] = useState<string | null>(null);
  const [showUniversalAdd, setShowUniversalAdd] = useState(false);
  const [universalInputContent, setUniversalInputContent] = useState('');
  const quickInputRef = useRef<HTMLInputElement | null>(null);

  // Drag and Drop state & Card Reordering
  const [draggingNoteId, setDraggingNoteId] = useState<string | null>(null);
  const [dragOverColId, setDragOverColId] = useState<string | null>(null);
  const [dragOverCardTarget, setDragOverCardTarget] = useState<{ noteId: string; position: 'above' | 'below' } | null>(null);
  const [customNotesOrder, setCustomNotesOrder] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('campus_notes_custom_order');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Keyboard navigation state
  const [focusedNoteIndex, setFocusedNoteIndex] = useState<number>(0);

  // Undo Snackbar State (5s Window + ⌘Z)
  const [deletedNoteUndo, setDeletedNoteUndo] = useState<{ note: UserNote; expiresAt: number } | null>(null);

  // Filter notes by search & tag
  const filteredNotes = useMemo(() => {
    return notes.filter(note => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const contentMatch = (note.content || '').toLowerCase().includes(q);
        const studentMatch = (note.student_name || '').toLowerCase().includes(q);
        const tagMatch = (note.tags || []).some(t => t.toLowerCase().includes(q));
        if (!contentMatch && !studentMatch && !tagMatch) return false;
      }
      if (selectedTagFilter) {
        const cleanFilter = selectedTagFilter.replace(/^#/, '').toLowerCase();
        const hasTag = (note.tags || []).some(t => t.replace(/^#/, '').toLowerCase() === cleanFilter);
        if (!hasTag) return false;
      }
      return true;
    });
  }, [notes, searchQuery, selectedTagFilter]);

  // Undo Timer countdown
  useEffect(() => {
    if (!deletedNoteUndo) return;
    const interval = setInterval(() => {
      if (Date.now() >= deletedNoteUndo.expiresAt) {
        setDeletedNoteUndo(null);
      }
    }, 500);
    return () => clearInterval(interval);
  }, [deletedNoteUndo]);

  const handleRestoreUndo = async () => {
    if (!deletedNoteUndo) return;
    const note = deletedNoteUndo.note;
    await onCreateNote(note.content, {
      student_id: note.student_id,
      student_name: note.student_name,
      tags: note.tags,
      note_type: note.note_type,
      is_pinned: note.is_pinned,
      due_date: note.due_date
    });
    setDeletedNoteUndo(null);
  };

  const handleDeleteWithUndo = async (note: UserNote) => {
    setDeletedNoteUndo({
      note,
      expiresAt: Date.now() + 5000
    });
    await onDeleteNote(note.id);
  };

  // Close on Escape / Keyboard shortcuts (J, K, X, T, 1, 2, 3, ⌘N, ⌘Z, ⌘K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInputActive = ['INPUT', 'TEXTAREA'].includes((document.activeElement?.tagName || ''));

      // ⌘Z for Undo
      if ((e.metaKey || e.ctrlKey) && (e.key === 'z' || e.key === 'Z') && !isInputActive) {
        if (deletedNoteUndo) {
          e.preventDefault();
          handleRestoreUndo();
          return;
        }
      }

      // ⌘K for Command Palette
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        if (onOpenCommandPalette) {
          e.preventDefault();
          onOpenCommandPalette();
          return;
        }
      }

      if (e.key === 'Escape') {
        if (activeTagPickerNoteId) {
          setActiveTagPickerNoteId(null);
        } else if (showUniversalAdd) {
          setShowUniversalAdd(false);
        } else if (isOpen) {
          onClose();
        }
      }

      if ((e.metaKey || e.ctrlKey) && (e.key === 'n' || e.key === 'N') && isOpen) {
        e.preventDefault();
        setShowUniversalAdd(true);
        setTimeout(() => quickInputRef.current?.focus(), 50);
        return;
      }

      if (!isInputActive && isOpen) {
        if (e.key === '1') setViewMode('kanban');
        if (e.key === '2') setViewMode('list');
        if (e.key === '3') setViewMode('students');

        if (filteredNotes.length > 0) {
          if (e.key === 'j' || e.key === 'ArrowDown') {
            e.preventDefault();
            setFocusedNoteIndex(prev => Math.min(filteredNotes.length - 1, prev + 1));
          }
          if (e.key === 'k' || e.key === 'ArrowUp') {
            e.preventDefault();
            setFocusedNoteIndex(prev => Math.max(0, prev - 1));
          }
          if (e.key === 'x' || e.key === ' ') {
            e.preventDefault();
            const current = filteredNotes[focusedNoteIndex];
            if (current) onToggleCompleteTodo(current.id);
          }
          if (e.key === 't' || e.key === 'T') {
            e.preventDefault();
            const current = filteredNotes[focusedNoteIndex];
            if (current) setActiveTagPickerNoteId(prev => prev === current.id ? null : current.id);
          }
          if (e.key === 'Backspace' || e.key === 'Delete') {
            const current = filteredNotes[focusedNoteIndex];
            if (current) {
              e.preventDefault();
              handleDeleteWithUndo(current);
            }
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, activeTagPickerNoteId, showUniversalAdd, filteredNotes, focusedNoteIndex, deletedNoteUndo]);

  // Voice to Text
  const { isListening, startListening, stopListening, resetTranscript } = useVoiceToText({
    onResult: (text) => {
      setUniversalInputContent(prev => prev ? `${prev} ${text}` : text);
    }
  });

  // Categorize for Kanban
  const kanbanColumns = useMemo(() => {
    const inbox: UserNote[] = [];
    const students: UserNote[] = [];
    const todos: UserNote[] = [];
    const orga: UserNote[] = [];
    const completed: UserNote[] = [];

    filteredNotes.forEach(note => {
      if (note.is_completed || note.is_archived) {
        completed.push(note);
      } else if (note.student_id || note.student_name || note.note_type === 'student_note' || (note.tags || []).some(t => STUDENT_SKILL_TAGS.some(st => st.key === t.replace(/^#/, '').toLowerCase()))) {
        students.push(note);
      } else if (note.note_type === 'todo' || (note.content || '').startsWith('- ') || (note.tags || []).includes('todo') || (note.tags || []).includes('#To-Do')) {
        todos.push(note);
      } else if (note.room_id || (note.tags || []).some(t => ['raum', 'verwaltung', 'konzert'].includes(t.replace(/^#/, '').toLowerCase()))) {
        orga.push(note);
      } else {
        inbox.push(note);
      }
    });

    const sortByOrder = (itemsList: UserNote[]) => {
      return [...itemsList].sort((a, b) => {
        if (a.is_pinned && !b.is_pinned) return -1;
        if (!a.is_pinned && b.is_pinned) return 1;
        const indexA = customNotesOrder.indexOf(a.id);
        const indexB = customNotesOrder.indexOf(b.id);
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        return new Date(b.created_at || b.updated_at || 0).getTime() - new Date(a.created_at || a.updated_at || 0).getTime();
      });
    };

    return [
      { id: 'inbox', title: 'Inbox & Gedanken', icon: Inbox, count: inbox.length, items: sortByOrder(inbox), color: '#475569', bg: '#f1f5f9', border: '#e2e8f0', emptyHint: 'Gedanken ohne Schüler-Zuordnung landen hier als persönlicher Zettel' },
      { id: 'students', title: 'Schüler & Hausaufgaben', icon: User, count: students.length, items: sortByOrder(students), color: '#166534', bg: '#e6f4ea', border: '#bbf7d0', emptyHint: 'Schüler-Notizen und Hausaufgaben erscheinen hier' },
      { id: 'todos', title: 'Wochen-To-Dos', icon: CheckSquare, count: todos.length, items: sortByOrder(todos), color: '#1e40af', bg: '#eff6ff', border: '#bfdbfe', emptyHint: 'Alle Wochen-Aufgaben erledigt' },
      { id: 'orga', title: 'Raum & Verwaltung', icon: DoorOpen, count: orga.length, items: sortByOrder(orga), color: '#991b1b', bg: '#fee2e2', border: '#fecaca', emptyHint: 'Keine Raum-Mängel oder Orga-Meldungen offen' },
      { id: 'completed', title: 'Erledigt & Archiv', icon: Archive, count: completed.length, items: sortByOrder(completed), color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0', emptyHint: 'Erledigte und archivierte Notizen' }
    ];
  }, [filteredNotes, customNotesOrder]);

  // Categorize by Student for Student Pivot View
  const studentGroups = useMemo(() => {
    const pool = todayStudents.length > 0 ? todayStudents : allStudents;
    const map = new Map<string, { student: any; items: UserNote[] }>();

    pool.forEach(s => {
      const id = String(s.id);
      map.set(id, { student: s, items: [] });
    });

    const unassigned: UserNote[] = [];

    filteredNotes.forEach(note => {
      if (note.student_id && map.has(String(note.student_id))) {
        map.get(String(note.student_id))!.items.push(note);
      } else if (note.student_name) {
        const found = pool.find(s => (s.first_name || s.name || '').toLowerCase() === note.student_name?.toLowerCase());
        if (found && map.has(String(found.id))) {
          map.get(String(found.id))!.items.push(note);
        } else {
          unassigned.push(note);
        }
      } else {
        unassigned.push(note);
      }
    });

    return {
      studentsWithNotes: Array.from(map.values()),
      unassigned
    };
  }, [filteredNotes, todayStudents, allStudents]);

  const handleUniversalCreateNote = async () => {
    if (!universalInputContent.trim()) {
      setShowUniversalAdd(false);
      return;
    }
    await onCreateNote(universalInputContent.trim());
    setUniversalInputContent('');
    setShowUniversalAdd(false);
  };

  const handleSetNoteTag = async (note: UserNote, tagKey: string) => {
    const existing = note.tags || [];
    const cleanTag = tagKey.startsWith('#') ? tagKey : `#${tagKey}`;
    const nextTags = existing.includes(cleanTag) 
      ? existing.filter(t => t !== cleanTag)
      : [cleanTag];
    await onUpdateNote(note.id, { tags: nextTags });
    setActiveTagPickerNoteId(null);
  };

  // Drag and Drop Handler for Column Drop
  const handleDropOnColumn = async (columnId: string) => {
    if (!draggingNoteId) return;
    const note = notes.find(n => n.id === draggingNoteId);
    if (!note) return;

    if (columnId === 'completed') {
      if (!note.is_completed) onToggleCompleteTodo(note.id);
    } else if (columnId === 'todos') {
      await onUpdateNote(note.id, {
        note_type: 'todo',
        is_completed: false,
        tags: Array.from(new Set([...(note.tags || []), '#To-Do']))
      });
    } else if (columnId === 'orga') {
      await onUpdateNote(note.id, {
        is_completed: false,
        tags: Array.from(new Set([...(note.tags || []), '#Raum']))
      });
    } else if (columnId === 'inbox') {
      await onUpdateNote(note.id, {
        is_completed: false,
        is_archived: false,
        note_type: 'scratchpad'
      });
    }
    setDraggingNoteId(null);
    setDragOverColId(null);
    setDragOverCardTarget(null);
  };

  // Card Reordering Drop Handler (Drag & Drop Reorder)
  const handleDropOnNote = async (targetNoteId: string, position: 'above' | 'below', columnId: string) => {
    if (!draggingNoteId || draggingNoteId === targetNoteId) {
      setDragOverCardTarget(null);
      setDraggingNoteId(null);
      setDragOverColId(null);
      return;
    }

    // 1. If moving across column types, update the note's category/tags
    const note = notes.find(n => n.id === draggingNoteId);
    if (note) {
      if (columnId === 'completed' && !note.is_completed) {
        onToggleCompleteTodo(note.id);
      } else if (columnId === 'todos') {
        await onUpdateNote(note.id, {
          note_type: 'todo',
          is_completed: false,
          tags: Array.from(new Set([...(note.tags || []), '#To-Do']))
        });
      } else if (columnId === 'orga') {
        await onUpdateNote(note.id, {
          is_completed: false,
          tags: Array.from(new Set([...(note.tags || []), '#Raum']))
        });
      } else if (columnId === 'inbox') {
        await onUpdateNote(note.id, {
          is_completed: false,
          is_archived: false,
          note_type: 'scratchpad'
        });
      }
    }

    // 2. Reorder in customNotesOrder array
    const currentIds = notes.map(n => n.id);
    let orderBase = customNotesOrder.filter((id: string) => currentIds.includes(id));
    currentIds.forEach((id: string) => {
      if (!orderBase.includes(id)) orderBase.push(id);
    });

    orderBase = orderBase.filter((id: string) => id !== draggingNoteId);
    const targetIndex = orderBase.indexOf(targetNoteId);
    const insertIndex = position === 'above' ? Math.max(0, targetIndex) : targetIndex + 1;
    orderBase.splice(insertIndex, 0, draggingNoteId);

    setCustomNotesOrder(orderBase);
    try {
      localStorage.setItem('campus_notes_custom_order', JSON.stringify(orderBase));
    } catch (e) {}

    setDragOverCardTarget(null);
    setDraggingNoteId(null);
    setDragOverColId(null);
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.2s ease-out'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '1380px',
          height: '92vh',
          backgroundColor: '#f8fafc',
          borderRadius: '24px',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.6) inset',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'scaleUp 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
          position: 'relative'
        }}
        onClick={() => {
          if (activeTagPickerNoteId) setActiveTagPickerNoteId(null);
        }}
      >
        {/* ========================================================================= */}
        {/* 1. MASTER HEADER                                                         */}
        {/* ========================================================================= */}
        <div style={{
          padding: '16px 24px',
          background: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          flexWrap: 'wrap',
          boxShadow: '0 1px 0 rgba(255, 255, 255, 0.8) inset'
        }}>
          {/* Left: Title & Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #0f172a 0%, #334155 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 4px 12px rgba(15, 23, 42, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.3)'
            }}>
              <Layers size={18} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em' }}>
                  Notizen-Board
                </h2>
                <span style={{
                  background: '#f1f5f9',
                  color: '#475569',
                  padding: '2px 8px',
                  borderRadius: '100px',
                  fontSize: '0.68rem',
                  fontWeight: 800
                }}>
                  {notes.length} Notizen
                </span>
              </div>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
                Zentrale Unterrichtsorganisation &amp; Didaktik-Board
              </p>
            </div>
          </div>

          {/* Center: Tri-View Switcher (Kanban / List / Students) */}
          <div style={{
            display: 'flex',
            background: '#f1f5f9',
            padding: '3px',
            borderRadius: '12px',
            gap: '3px'
          }}>
            <button
              type="button"
              onClick={() => setViewMode('kanban')}
              style={{
                border: 'none',
                background: viewMode === 'kanban' ? '#ffffff' : 'transparent',
                color: viewMode === 'kanban' ? '#0f172a' : '#64748b',
                fontWeight: viewMode === 'kanban' ? 800 : 600,
                fontSize: '0.74rem',
                padding: '6px 14px',
                borderRadius: '9px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: viewMode === 'kanban' ? '0 1px 4px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255, 255, 255, 0.8)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <Layers size={13} />
              <span>Kanban-Board</span>
              <kbd style={{ opacity: 0.5, fontSize: '0.62rem', fontFamily: 'monospace' }}>1</kbd>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('list')}
              style={{
                border: 'none',
                background: viewMode === 'list' ? '#ffffff' : 'transparent',
                color: viewMode === 'list' ? '#0f172a' : '#64748b',
                fontWeight: viewMode === 'list' ? 800 : 600,
                fontSize: '0.74rem',
                padding: '6px 14px',
                borderRadius: '9px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: viewMode === 'list' ? '0 1px 4px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255, 255, 255, 0.8)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <SlidersHorizontal size={13} />
              <span>Dichte Liste</span>
              <kbd style={{ opacity: 0.5, fontSize: '0.62rem', fontFamily: 'monospace' }}>2</kbd>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('students')}
              style={{
                border: 'none',
                background: viewMode === 'students' ? '#ffffff' : 'transparent',
                color: viewMode === 'students' ? '#0f172a' : '#64748b',
                fontWeight: viewMode === 'students' ? 800 : 600,
                fontSize: '0.74rem',
                padding: '6px 14px',
                borderRadius: '9px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: viewMode === 'students' ? '0 1px 4px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255, 255, 255, 0.8)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <User size={13} />
              <span>Nach Schülern</span>
              <kbd style={{ opacity: 0.5, fontSize: '0.62rem', fontFamily: 'monospace' }}>3</kbd>
            </button>
          </div>

          {/* Right: + Notiz Button + Search + Close */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={() => {
                setShowUniversalAdd(prev => !prev);
                setTimeout(() => quickInputRef.current?.focus(), 50);
              }}
              style={{
                background: '#0f172a',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                padding: '6px 14px',
                fontSize: '0.76rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 6px rgba(15, 23, 42, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
                transition: 'all 0.15s ease'
              }}
              className="hover-scale"
            >
              <Plus size={13} strokeWidth={2.5} />
              <span>Notiz erfassen</span>
              <kbd style={{ background: 'rgba(255,255,255,0.2)', padding: '1px 4px', borderRadius: '4px', fontSize: '0.62rem', fontFamily: 'monospace' }}>⌘N</kbd>
            </button>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '6px 10px',
              gap: '6px',
              minWidth: '180px'
            }}>
              <Search size={13} color="#94a3b8" />
              <input
                type="text"
                placeholder="Notizen suchen... (J/K)"
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
                  style={{ border: 'none', background: 'transparent', color: '#94a3b8', cursor: 'pointer', padding: 0 }}
                >
                  <X size={12} />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              title="Board schließen (Esc)"
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                background: '#ffffff',
                color: '#64748b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              className="hover-scale"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Universal Quick Add Banner (When ⌘N or + Notiz clicked) */}
        {showUniversalAdd && (
          <div style={{
            padding: '12px 24px',
            background: '#f1f5f9',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            animation: 'slideDown 0.15s ease-out'
          }}>
            <input
              ref={quickInputRef}
              type="text"
              placeholder="Gedanke, @Schüler, - Checkbox, !Raum oder BPM eingeben..."
              value={universalInputContent}
              onChange={(e) => setUniversalInputContent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleUniversalCreateNote();
                }
              }}
              style={{
                flex: 1,
                padding: '8px 14px',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '10px',
                fontSize: '0.82rem',
                fontWeight: 600,
                outline: 'none'
              }}
            />
            <button
              type="button"
              onClick={handleUniversalCreateNote}
              style={{
                background: '#0f172a',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                padding: '8px 16px',
                fontSize: '0.76rem',
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              Speichern
            </button>
            <button
              type="button"
              onClick={() => setShowUniversalAdd(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#64748b',
                fontSize: '0.76rem',
                cursor: 'pointer',
                padding: '8px'
              }}
            >
              Abbrechen
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 2. TAG FILTER BAR (Didaktik & Orga Filter)                                */}
        {/* ========================================================================= */}
        <div style={{
          padding: '8px 24px',
          background: '#ffffff',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          overflowX: 'auto',
          scrollbarWidth: 'none'
        }} className="hide-scrollbar">
          <button
            type="button"
            onClick={() => setSelectedTagFilter(null)}
            style={{
              border: !selectedTagFilter ? '1px solid #0f172a' : '1px solid #e2e8f0',
              background: !selectedTagFilter ? '#0f172a' : '#ffffff',
              color: !selectedTagFilter ? '#ffffff' : '#64748b',
              fontSize: '0.68rem',
              fontWeight: 800,
              padding: '4px 10px',
              borderRadius: '100px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s ease'
            }}
          >
            Alle ({notes.length})
          </button>

          <span style={{ width: '1px', height: '16px', background: '#e2e8f0', margin: '0 4px' }} />
          <span style={{ fontSize: '0.64rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Schüler-Didaktik:</span>

          {STUDENT_SKILL_TAGS.map(t => {
            const isSelected = selectedTagFilter === t.tag;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setSelectedTagFilter(prev => prev === t.tag ? null : t.tag)}
                style={{
                  border: isSelected ? `1.5px solid ${t.color}` : `1.5px solid ${t.border}`,
                  background: isSelected ? t.color : t.bg,
                  color: isSelected ? '#ffffff' : t.color,
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  padding: '3px 10px',
                  borderRadius: '100px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  whiteSpace: 'nowrap',
                  boxShadow: isSelected ? `0 2px 8px ${t.color}35` : '0 1px 2px rgba(0,0,0,0.02)',
                  transition: 'all 0.15s cubic-bezier(0.16, 1, 0.3, 1)'
                }}
              >
                <span>{renderMonochromeTagIcon(t.iconName, 10, isSelected ? '#ffffff' : t.color)}</span>
                <span>{t.label}</span>
              </button>
            );
          })}

          <span style={{ width: '1px', height: '16px', background: '#e2e8f0', margin: '0 4px' }} />
          <span style={{ fontSize: '0.64rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Organisation:</span>

          {TEACHER_ORGANIZATION_TAGS.map(t => {
            const isSelected = selectedTagFilter === t.tag;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setSelectedTagFilter(prev => prev === t.tag ? null : t.tag)}
                style={{
                  border: isSelected ? `1.5px solid ${t.color}` : `1.5px solid ${t.border}`,
                  background: isSelected ? t.color : t.bg,
                  color: isSelected ? '#ffffff' : t.color,
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  padding: '3px 10px',
                  borderRadius: '100px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  whiteSpace: 'nowrap',
                  boxShadow: isSelected ? `0 2px 8px ${t.color}35` : '0 1px 2px rgba(0,0,0,0.02)',
                  transition: 'all 0.15s cubic-bezier(0.16, 1, 0.3, 1)'
                }}
              >
                <span>{renderMonochromeTagIcon(t.iconName, 10, isSelected ? '#ffffff' : t.color)}</span>
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* ========================================================================= */}
        {/* 3. MAIN WORKSPACE (Kanban / List / Students)                              */}
        {/* ========================================================================= */}
        <div style={{
          flex: 1,
          overflowX: 'auto',
          overflowY: 'hidden',
          padding: '16px 20px',
          display: 'flex',
          gap: '16px',
          position: 'relative'
        }}>
          {/* A. KANBAN BOARD VIEW */}
          {viewMode === 'kanban' && (
            <div style={{
              display: 'flex',
              gap: '14px',
              height: '100%',
              minWidth: '100%'
            }}>
              {kanbanColumns.map(col => {
                const isDragOver = dragOverColId === col.id;
                return (
                  <div
                    key={col.id}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOverColId(col.id);
                    }}
                    onDragLeave={() => setDragOverColId(null)}
                    onDrop={() => handleDropOnColumn(col.id)}
                    style={{
                      flex: '1 1 0%',
                      minWidth: '250px',
                      maxWidth: '300px',
                      height: '100%',
                      background: isDragOver ? '#eff6ff' : '#ffffff',
                      border: isDragOver ? '2px dashed #3b82f6' : '1px solid #e2e8f0',
                      borderRadius: '18px',
                      display: 'flex',
                      flexDirection: 'column',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.02), inset 0 1px 0 rgba(255, 255, 255, 0.7)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {/* Clean Column Header (Zero redundant + buttons) */}
                    <div style={{
                      padding: '12px 14px',
                      borderBottom: '1px solid #f1f5f9',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <col.icon size={14} style={{ color: col.color }} />
                        <span style={{ fontSize: '0.80rem', fontWeight: 850, color: '#0f172a' }}>
                          {col.title}
                        </span>
                      </div>

                      <span style={{
                        fontSize: '0.66rem',
                        fontWeight: 800,
                        background: col.bg,
                        color: col.color,
                        border: `1.5px solid ${col.border || '#e2e8f0'}`,
                        padding: '2px 8px',
                        borderRadius: '100px'
                      }}>
                        {col.count}
                      </span>
                    </div>

                    {/* Column Cards Stream */}
                    <div style={{
                      flex: 1,
                      overflowY: 'auto',
                      padding: '10px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px'
                    }} className="custom-scrollbar">
                      {col.items.length === 0 ? (
                        /* Sleek Ghost Card Empty State */
                        <div style={{
                          padding: '26px 14px',
                          border: '1.5px dashed #e2e8f0',
                          borderRadius: '14px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          textAlign: 'center',
                          gap: '8px',
                          background: '#fafbfc'
                        }}>
                          <div style={{
                            width: '34px',
                            height: '34px',
                            borderRadius: '10px',
                            background: col.bg,
                            border: `1px solid ${col.border || '#e2e8f0'}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <col.icon size={16} color={col.color} />
                          </div>
                          <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 650, maxWidth: '180px', lineHeight: 1.35 }}>
                            {col.emptyHint}
                          </span>
                        </div>
                      ) : (
                        col.items.map(note => {
                          const isFocused = filteredNotes[focusedNoteIndex]?.id === note.id;
                          return (
                            <NoteCardItem
                              key={note.id}
                              note={note}
                              columnId={col.id}
                              allStudents={allStudents}
                              isFocused={isFocused}
                              isDragging={draggingNoteId === note.id}
                              onDragStart={() => setDraggingNoteId(note.id)}
                              onDragEnd={() => {
                                setDraggingNoteId(null);
                                setDragOverCardTarget(null);
                              }}
                              onDragOverCard={(e, pos) => {
                                setDragOverCardTarget({ noteId: note.id, position: pos });
                              }}
                              onDropOnCard={(e, pos) => {
                                handleDropOnNote(note.id, pos, col.id);
                              }}
                              dragOverIndicator={dragOverCardTarget?.noteId === note.id ? dragOverCardTarget.position : null}
                              activeTagPickerNoteId={activeTagPickerNoteId}
                              onOpenTagPicker={(id) => setActiveTagPickerNoteId(id)}
                              onSelectTag={(tag) => handleSetNoteTag(note, tag)}
                              onUpdateContent={(content) => onUpdateNote(note.id, { content })}
                              onToggleComplete={() => onToggleCompleteTodo(note.id)}
                              onTogglePin={() => onTogglePin(note.id)}
                              onDelete={() => handleDeleteWithUndo(note)}
                              onSyncToHomework={onSyncToHomeworkBook ? () => onSyncToHomeworkBook(note) : undefined}
                              onOpenHomeworkModal={onOpenHomeworkModal}
                            />
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* B. DICHTE LISTE (Linear / Notion Tabellenstandard) */}
          {viewMode === 'list' && (
            <div style={{
              flex: 1,
              height: '100%',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '18px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 2px 8px rgba(0,0,0,0.02), inset 0 1px 0 rgba(255, 255, 255, 0.7)'
            }} className="custom-scrollbar">
              {/* Structured Linear Table Header */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '40px 1fr 180px 180px 120px 100px',
                padding: '10px 16px',
                background: '#f8fafc',
                borderBottom: '1px solid #e2e8f0',
                fontSize: '0.64rem',
                fontWeight: 800,
                color: '#64748b',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                alignItems: 'center'
              }}>
                <div>Status</div>
                <div>Notiz / Aufgabe</div>
                <div>Schüler / Kontext</div>
                <div>Themen-Tag</div>
                <div>Fälligkeit</div>
                <div style={{ textAlign: 'right' }}>Aktionen</div>
              </div>

              {/* Table Rows */}
              {filteredNotes.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 10px', color: '#94a3b8', fontSize: '0.78rem' }}>
                  Keine Notizen gefunden
                </div>
              ) : (
                filteredNotes.map(note => {
                  const isFocused = filteredNotes[focusedNoteIndex]?.id === note.id;
                  return (
                    <NoteListTableRow
                      key={note.id}
                      note={note}
                      allStudents={allStudents}
                      isFocused={isFocused}
                      activeTagPickerNoteId={activeTagPickerNoteId}
                      onOpenTagPicker={(id) => setActiveTagPickerNoteId(id)}
                      onSelectTag={(tag) => handleSetNoteTag(note, tag)}
                      onUpdateContent={(content) => onUpdateNote(note.id, { content })}
                      onToggleComplete={() => onToggleCompleteTodo(note.id)}
                      onTogglePin={() => onTogglePin(note.id)}
                      onDelete={() => handleDeleteWithUndo(note)}
                      onSyncToHomework={onSyncToHomeworkBook ? () => onSyncToHomeworkBook(note) : undefined}
                      onOpenHomeworkModal={onOpenHomeworkModal}
                    />
                  );
                })
              )}
            </div>
          )}

          {/* C. STUDENT PIVOT VIEW (Nach Schülern) */}
          {viewMode === 'students' && (
            <div style={{
              display: 'flex',
              gap: '14px',
              height: '100%',
              minWidth: '100%'
            }}>
              {studentGroups.studentsWithNotes.map(group => (
                <div
                  key={group.student.id}
                  style={{
                    flex: '1 1 0%',
                    minWidth: '270px',
                    maxWidth: '320px',
                    height: '100%',
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '18px',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.02), inset 0 1px 0 rgba(255, 255, 255, 0.7)'
                  }}
                >
                  <div style={{
                    padding: '12px 14px',
                    borderBottom: '1px solid #f1f5f9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '50%',
                        background: '#e6f4ea',
                        color: '#166534',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.70rem',
                        fontWeight: 800
                      }}>
                        {group.student.first_name?.[0] || 'S'}
                      </div>
                      <div>
                        <div style={{ fontSize: '0.80rem', fontWeight: 850, color: '#0f172a' }}>
                          {maskStudentName(group.student.first_name || group.student.name)}
                        </div>
                        <div style={{ fontSize: '0.64rem', color: '#64748b', fontWeight: 600 }}>
                          {group.student.instrument || 'Gitarre'}
                        </div>
                      </div>
                    </div>

                    {onOpenHomeworkModal && (
                      <button
                        type="button"
                        onClick={() => onOpenHomeworkModal(group.student)}
                        title="Schüler-Protokoll öffnen"
                        style={{
                          border: 'none',
                          background: '#f0fdf4',
                          color: '#166534',
                          fontSize: '0.66rem',
                          fontWeight: 800,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          cursor: 'pointer'
                        }}
                      >
                        Heft ➔
                      </button>
                    )}
                  </div>

                  <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '10px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }} className="custom-scrollbar">
                    {group.items.length === 0 ? (
                      <div style={{
                        padding: '24px 12px',
                        border: '1px dashed #e2e8f0',
                        borderRadius: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textAlign: 'center',
                        gap: '6px',
                        background: '#fcfcfd'
                      }}>
                        <User size={18} color="#cbd5e1" />
                        <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 650 }}>
                          Keine Notizen für {maskStudentName(group.student.first_name || group.student.name)}
                        </span>
                      </div>
                    ) : (
                      group.items.map(note => {
                        const isFocused = filteredNotes[focusedNoteIndex]?.id === note.id;
                        return (
                          <NoteCardItem
                            key={note.id}
                            note={note}
                            allStudents={allStudents}
                            isFocused={isFocused}
                            isDragging={draggingNoteId === note.id}
                            onDragStart={() => setDraggingNoteId(note.id)}
                            onDragEnd={() => setDraggingNoteId(null)}
                            activeTagPickerNoteId={activeTagPickerNoteId}
                            onOpenTagPicker={(id) => setActiveTagPickerNoteId(id)}
                            onSelectTag={(tag) => handleSetNoteTag(note, tag)}
                            onUpdateContent={(content) => onUpdateNote(note.id, { content })}
                            onToggleComplete={() => onToggleCompleteTodo(note.id)}
                            onTogglePin={() => onTogglePin(note.id)}
                            onDelete={() => handleDeleteWithUndo(note)}
                            onSyncToHomework={onSyncToHomeworkBook ? () => onSyncToHomeworkBook(note) : undefined}
                            onOpenHomeworkModal={onOpenHomeworkModal}
                          />
                        );
                      })
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 5-Sekunden Floating Undo Snackbar (Apple Dark Squircle Toast) */}
          {deletedNoteUndo && (
            <div style={{
              position: 'absolute',
              bottom: '20px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: '#0f172a',
              color: '#ffffff',
              borderRadius: '100px',
              padding: '8px 18px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              boxShadow: '0 12px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.2)',
              zIndex: 99999,
              animation: 'slideUp 0.18s ease-out',
              fontSize: '0.78rem',
              fontWeight: 650
            }}>
              <span>Notiz gelöscht</span>
              <button
                type="button"
                onClick={handleRestoreUndo}
                style={{
                  border: 'none',
                  background: 'rgba(255,255,255,0.2)',
                  color: '#ffffff',
                  padding: '3px 10px',
                  borderRadius: '100px',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <RotateCcw size={11} />
                <span>Rückgängig</span>
                <kbd style={{ opacity: 0.6, fontSize: '0.62rem', fontFamily: 'monospace' }}>⌘Z</kbd>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// =========================================================================
// SUB-COMPONENT: 2-Spalten Apple Popover Category Tag Picker
// =========================================================================
interface CategoryTagPickerPopoverProps {
  note: UserNote;
  columnId?: string;
  onSelectTag: (tag: string) => void;
  onClose: () => void;
}

export const CategoryTagPickerPopover: React.FC<CategoryTagPickerPopoverProps> = ({
  note,
  columnId,
  onSelectTag,
  onClose
}) => {
  const currentTags = note.tags || [];

  // Determine context
  const isStudentContext = columnId === 'students' || !!(note.student_id || note.student_name || note.note_type === 'student_note');
  const isTodoOrgaContext = columnId === 'todos' || columnId === 'orga' || note.note_type === 'todo';

  // Neutral state: Allow tab toggle if not explicitly student or todo
  const [activeTab, setActiveTab] = useState<'didaktik' | 'orga'>(
    isStudentContext ? 'didaktik' : 'orga'
  );

  const showSegmentTabs = !isStudentContext && !isTodoOrgaContext;
  const tagsToShow = (isStudentContext || (showSegmentTabs && activeTab === 'didaktik'))
    ? STUDENT_SKILL_TAGS
    : TEACHER_ORGANIZATION_TAGS;

  return (
    <div
      style={{
        position: 'absolute',
        top: '100%',
        left: 0,
        marginTop: '6px',
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '6px',
        boxShadow: '0 12px 32px -4px rgba(15, 23, 42, 0.18), 0 0 0 1px rgba(0, 0, 0, 0.05)',
        zIndex: 10000,
        width: '210px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        animation: 'scaleUp 0.14s cubic-bezier(0.16, 1, 0.3, 1)'
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header / Segmented Switcher */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '2px 4px 4px 4px',
        borderBottom: '1px solid #f1f5f9'
      }}>
        {showSegmentTabs ? (
          <div style={{ display: 'flex', background: '#f1f5f9', padding: '2px', borderRadius: '6px', gap: '2px' }}>
            <button
              type="button"
              onClick={() => setActiveTab('orga')}
              style={{
                border: 'none',
                background: activeTab === 'orga' ? '#ffffff' : 'transparent',
                color: activeTab === 'orga' ? '#0f172a' : '#64748b',
                fontWeight: activeTab === 'orga' ? 800 : 600,
                fontSize: '0.62rem',
                padding: '2px 6px',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Organisation
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('didaktik')}
              style={{
                border: 'none',
                background: activeTab === 'didaktik' ? '#ffffff' : 'transparent',
                color: activeTab === 'didaktik' ? '#0f172a' : '#64748b',
                fontWeight: activeTab === 'didaktik' ? 800 : 600,
                fontSize: '0.62rem',
                padding: '2px 6px',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Didaktik
            </button>
          </div>
        ) : (
          <span style={{ fontSize: '0.60rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {isStudentContext ? 'Didaktik-Thema' : 'Organisations-Tag'}
          </span>
        )}

        <button
          type="button"
          onClick={onClose}
          style={{ border: 'none', background: 'transparent', color: '#94a3b8', cursor: 'pointer', padding: 0 }}
        >
          <X size={12} />
        </button>
      </div>

      {/* Luminous Apple macOS Tag Items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {tagsToShow.map(t => {
          const isSelected = currentTags.includes(t.tag);
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => onSelectTag(t.tag)}
              style={{
                border: isSelected ? `1.5px solid ${t.color}` : `1px solid ${t.border}`,
                background: isSelected ? t.color : t.bg,
                color: isSelected ? '#ffffff' : t.color,
                padding: '6px 10px',
                borderRadius: '8px',
                fontSize: '0.72rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: isSelected ? `0 2px 8px ${t.color}35` : '0 1px 2px rgba(0,0,0,0.02)',
                transition: 'all 0.12s cubic-bezier(0.16, 1, 0.3, 1)'
              }}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.filter = 'brightness(0.96)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.filter = 'none';
                }
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>{renderMonochromeTagIcon(t.iconName, 12, isSelected ? '#ffffff' : t.color)}</span>
                <span>{t.label}</span>
              </div>
              {isSelected ? (
                <Check size={12} color="#ffffff" strokeWidth={2.5} />
              ) : (
                <span style={{ fontSize: '0.60rem', color: t.color, opacity: 0.8, fontWeight: 700 }}>{t.desc}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Option to clear tags */}
      {currentTags.length > 0 && (
        <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '4px', marginTop: '2px' }}>
          <button
            type="button"
            onClick={() => onSelectTag(currentTags[0])}
            style={{
              border: 'none',
              background: 'transparent',
              color: '#94a3b8',
              padding: '4px 8px',
              borderRadius: '6px',
              fontSize: '0.64rem',
              fontWeight: 650,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              width: '100%'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#ef4444';
              e.currentTarget.style.background = '#fef2f2';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#94a3b8';
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <X size={10} />
            <span>Tag entfernen</span>
          </button>
        </div>
      )}
    </div>
  );
};

// =========================================================================
// SUB-COMPONENT: Single Note Card Item (Kanban Card with NLP Clean Text & Inline Edit)
// =========================================================================
interface NoteCardItemProps {
  note: UserNote;
  columnId?: string;
  allStudents?: any[];
  isFocused?: boolean;
  isDragging?: boolean;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  onDragOverCard?: (e: React.DragEvent, position: 'above' | 'below') => void;
  onDropOnCard?: (e: React.DragEvent, position: 'above' | 'below') => void;
  dragOverIndicator?: 'above' | 'below' | null;
  activeTagPickerNoteId: string | null;
  onOpenTagPicker: (id: string | null) => void;
  onSelectTag: (tag: string) => void;
  onUpdateContent: (content: string) => void;
  onToggleComplete: () => void;
  onTogglePin: () => void;
  onDelete: () => void;
  onSyncToHomework?: () => void;
  onOpenHomeworkModal?: (student: any) => void;
}

export const NoteCardItem: React.FC<NoteCardItemProps> = ({
  note,
  columnId,
  allStudents = [],
  isFocused = false,
  isDragging = false,
  onDragStart,
  onDragEnd,
  onDragOverCard,
  onDropOnCard,
  dragOverIndicator,
  activeTagPickerNoteId,
  onOpenTagPicker,
  onSelectTag,
  onUpdateContent,
  onToggleComplete,
  onTogglePin,
  onDelete,
  onSyncToHomework,
  onOpenHomeworkModal
}) => {
  const isPickerOpen = activeTagPickerNoteId === note.id;

  // Filter out redundant '#To-Do' tag if inside To-Do column unless it has other tags
  const visibleTags = (note.tags || []).filter(t => columnId === 'todos' ? t.toLowerCase() !== '#to-do' : true);
  const primaryTag = visibleTags.length > 0 ? visibleTags[0] : null;
  const tagStyle = primaryTag ? getAllTagStyle(primaryTag) : null;

  // Inline edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editDraft, setEditDraft] = useState(note.content);

  const cleanDisplayContent = formatCleanNoteContent(note.content, note.student_name);

  const handleSaveEdit = () => {
    if (editDraft.trim() && editDraft !== note.content) {
      onUpdateContent(editDraft.trim());
    }
    setIsEditing(false);
  };

  return (
    <div
      draggable={!isEditing}
      onDragStart={() => onDragStart && onDragStart()}
      onDragEnd={() => onDragEnd && onDragEnd()}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const rect = e.currentTarget.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        const pos = e.clientY < midY ? 'above' : 'below';
        if (onDragOverCard) onDragOverCard(e, pos);
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const rect = e.currentTarget.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        const pos = e.clientY < midY ? 'above' : 'below';
        if (onDropOnCard) onDropOnCard(e, pos);
      }}
      style={{
        background: '#ffffff',
        border: isFocused ? '1.5px solid #0f172a' : '1px solid rgba(226, 232, 240, 0.85)',
        borderRadius: '14px',
        padding: '10px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        boxShadow: isFocused
          ? '0 0 0 2px #0f172a, 0 8px 24px -4px rgba(15, 23, 42, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.9)'
          : isDragging 
            ? '0 14px 30px -4px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255, 255, 255, 0.9)'
            : '0 2px 8px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255, 255, 255, 0.95)',
        position: 'relative',
        zIndex: isPickerOpen ? 9999 : 1, // CRITICAL FIX: Elevate stacking context when dropdown is open
        opacity: isDragging ? 0.5 : 1,
        transform: isDragging ? 'scale(1.02) rotate(-1deg)' : 'none',
        cursor: isEditing ? 'default' : 'grab',
        transition: 'all 0.15s cubic-bezier(0.16, 1, 0.3, 1)'
      }}
      className="hover-scale-mini"
    >
      {/* Insert Indicator Bar */}
      {dragOverIndicator === 'above' && (
        <div style={{
          position: 'absolute',
          top: '-5px',
          left: '4px',
          right: '4px',
          height: '3px',
          background: '#0f172a',
          borderRadius: '100px',
          boxShadow: '0 0 8px rgba(15, 23, 42, 0.4)',
          zIndex: 100
        }} />
      )}
      {dragOverIndicator === 'below' && (
        <div style={{
          position: 'absolute',
          bottom: '-5px',
          left: '4px',
          right: '4px',
          height: '3px',
          background: '#0f172a',
          borderRadius: '100px',
          boxShadow: '0 0 8px rgba(15, 23, 42, 0.4)',
          zIndex: 100
        }} />
      )}
      {/* Top / Main Meta row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', flex: 1, minWidth: 0 }}>
        {/* Checkbox toggle with Spring Bounce */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleComplete();
          }}
          style={{
            border: 'none',
            background: 'transparent',
            color: note.is_completed ? '#16a34a' : '#cbd5e1',
            cursor: 'pointer',
            padding: 0,
            marginTop: '2px',
            display: 'flex',
            flexShrink: 0,
            transition: 'transform 0.18s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
          }}
          className="hover-scale"
        >
          {note.is_completed ? <CheckCircle2 size={15} /> : <Circle size={15} />}
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Student badge */}
          {note.student_name && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '3px' }}>
              <span style={{
                fontSize: '0.64rem',
                fontWeight: 800,
                color: '#166534',
                background: '#e6f4ea',
                border: '1px solid #bbf7d0',
                padding: '1px 6px',
                borderRadius: '100px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
              }}>
                <User size={9} />
                <span>{maskStudentName(note.student_name)}</span>
              </span>
            </div>
          )}

          {/* Text Content (Clean NLP typography + 1-Click Inline Edit) */}
          {isEditing ? (
            <input
              autoFocus
              type="text"
              value={editDraft}
              onChange={(e) => setEditDraft(e.target.value)}
              onBlur={handleSaveEdit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveEdit();
                if (e.key === 'Escape') {
                  setEditDraft(note.content);
                  setIsEditing(false);
                }
              }}
              style={{
                width: '100%',
                fontSize: '0.78rem',
                fontWeight: 550,
                border: '1px solid #3b82f6',
                borderRadius: '4px',
                padding: '2px 4px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          ) : (
            <div
              onClick={() => {
                setEditDraft(note.content);
                setIsEditing(true);
              }}
              title="Klicken zum Bearbeiten"
              style={{
                fontSize: '0.78rem',
                color: note.is_completed ? '#94a3b8' : '#0f172a',
                textDecoration: note.is_completed ? 'line-through' : 'none',
                fontWeight: 550,
                lineHeight: 1.45,
                wordBreak: 'break-word',
                cursor: 'text'
              }}
            >
              {cleanDisplayContent}
            </div>
          )}

          {/* Metadata badges: Student, Room, Defect status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap', marginTop: '4px' }}>
            {note.student_name && (
              <span style={{ fontSize: '0.64rem', color: '#64748b', fontWeight: 650, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                <User size={10} />
                {maskStudentName(note.student_name)}
              </span>
            )}
            {(note.room_id || note.note_type === 'room_issue') && (
              <span style={{ 
                fontSize: '0.64rem', 
                color: '#991b1b', 
                background: '#fee2e2', 
                border: '1px solid #fecaca', 
                borderRadius: '5px', 
                padding: '1px 5px', 
                fontWeight: 750, 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '3px' 
              }}>
                <DoorOpen size={9} color="#dc2626" />
                {note.room_id || 'Raum'}
              </span>
            )}
            {note.note_type === 'room_issue' && (
              note.is_completed || note.is_acknowledged ? (
                <span style={{ 
                  fontSize: '0.64rem', 
                  color: '#166534', 
                  background: '#dcfce7', 
                  border: '1px solid #86efac', 
                  borderRadius: '5px', 
                  padding: '1px 5px', 
                  fontWeight: 800, 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '3px' 
                }}>
                  <CheckCheck size={9} color="#16a34a" />
                  Vom Sekretariat behoben
                </span>
              ) : (
                <span style={{ 
                  fontSize: '0.64rem', 
                  color: '#991b1b', 
                  background: '#fee2e2', 
                  border: '1px solid #fca5a5', 
                  borderRadius: '5px', 
                  padding: '1px 5px', 
                  fontWeight: 800, 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '3px' 
                }}>
                  <Send size={9} color="#dc2626" />
                  An Sekretariat übermittelt
                </span>
              )
            )}
          </div>
        </div>
      </div>

      {/* Footer / Meta Actions */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: '2px',
        paddingTop: '6px',
        borderTop: '1px solid #f8fafc',
        gap: '6px',
        flexWrap: 'wrap'
      }}>
        {/* Left: Tag Button (+ Tag or Tag Pill with Colored Border) */}
        <div style={{ position: 'relative' }}>
          {tagStyle ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenTagPicker(isPickerOpen ? null : note.id);
              }}
              style={{
                border: `1.5px solid ${tagStyle.border}`,
                background: tagStyle.bg,
                color: tagStyle.color,
                padding: '2px 8px',
                borderRadius: '7px',
                fontSize: '0.66rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
              }}
            >
              <span>{renderMonochromeTagIcon(tagStyle.iconName, 10, tagStyle.color)}</span>
              <span>{tagStyle.label}</span>
              <ChevronDown size={9} opacity={0.7} />
            </button>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenTagPicker(isPickerOpen ? null : note.id);
              }}
              style={{
                border: '1px dashed #cbd5e1',
                background: '#ffffff',
                color: '#64748b',
                padding: '2px 8px',
                borderRadius: '8px',
                fontSize: '0.64rem',
                fontWeight: 750,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.02), inset 0 1px 0 #ffffff'
              }}
            >
              <Plus size={9} />
              <span>Tag</span>
            </button>
          )}

          {/* 2-Spalten Apple Popover Category Tag Picker */}
          {isPickerOpen && (
            <CategoryTagPickerPopover
              note={note}
              onSelectTag={onSelectTag}
              onClose={() => onOpenTagPicker(null)}
            />
          )}
        </div>

        {/* Right: Quick Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {note.student_id && onSyncToHomework && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSyncToHomework();
              }}
              title="Ins Aufgabenheft übertragen"
              style={{
                border: '1px solid #bbf7d0',
                background: '#ffffff',
                color: '#15803d',
                padding: '2px 6px',
                borderRadius: '6px',
                fontSize: '0.62rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
              }}
            >
              <BookOpen size={9} />
              <span>Ins Heft</span>
            </button>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onTogglePin();
            }}
            title={note.is_pinned ? 'Lösen' : 'Anpinnen'}
            style={{
              border: 'none',
              background: 'transparent',
              color: note.is_pinned ? '#0f172a' : '#cbd5e1',
              cursor: 'pointer',
              padding: '2px',
              display: 'flex'
            }}
          >
            <Pin size={11} />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            title="Löschen"
            style={{
              border: 'none',
              background: 'transparent',
              color: '#cbd5e1',
              cursor: 'pointer',
              padding: '2px',
              display: 'flex'
            }}
          >
            <Trash2 size={11} />
          </button>
        </div>
      </div>
    </div>
  );
};

// =========================================================================
// SUB-COMPONENT: Single Note List Table Row (Linear-Style Table Row)
// =========================================================================
export const NoteListTableRow: React.FC<NoteCardItemProps> = ({
  note,
  allStudents = [],
  isFocused = false,
  activeTagPickerNoteId,
  onOpenTagPicker,
  onSelectTag,
  onUpdateContent,
  onToggleComplete,
  onTogglePin,
  onDelete,
  onSyncToHomework,
  onOpenHomeworkModal
}) => {
  const isPickerOpen = activeTagPickerNoteId === note.id;

  const primaryTag = (note.tags && note.tags.length > 0) ? note.tags[0] : null;
  const tagStyle = primaryTag ? getAllTagStyle(primaryTag) : null;

  const [isEditing, setIsEditing] = useState(false);
  const [editDraft, setEditDraft] = useState(note.content);

  const cleanDisplayContent = formatCleanNoteContent(note.content, note.student_name);

  const handleSaveEdit = () => {
    if (editDraft.trim() && editDraft !== note.content) {
      onUpdateContent(editDraft.trim());
    }
    setIsEditing(false);
  };

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '40px 1fr 180px 180px 120px 100px',
        padding: '8px 16px',
        borderBottom: '1px solid #f1f5f9',
        alignItems: 'center',
        fontSize: '0.78rem',
        background: isFocused ? '#eff6ff' : 'transparent',
        boxShadow: isFocused ? 'inset 2px 0 0 #3b82f6' : 'none',
        position: 'relative',
        zIndex: isPickerOpen ? 9999 : 1,
        transition: 'background 0.12s ease'
      }}
      className="hover-bg-slate"
    >
      {/* 1. Status Checkbox */}
      <div>
        <button
          type="button"
          onClick={onToggleComplete}
          style={{
            border: 'none',
            background: 'transparent',
            color: note.is_completed ? '#16a34a' : '#cbd5e1',
            cursor: 'pointer',
            padding: 0,
            display: 'flex'
          }}
        >
          {note.is_completed ? <CheckCircle2 size={15} /> : <Circle size={15} />}
        </button>
      </div>

      {/* 2. Content (Clean NLP Text + Inline Edit) */}
      <div style={{ minWidth: 0, paddingRight: '12px' }}>
        {isEditing ? (
          <input
            autoFocus
            type="text"
            value={editDraft}
            onChange={(e) => setEditDraft(e.target.value)}
            onBlur={handleSaveEdit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveEdit();
              if (e.key === 'Escape') {
                setEditDraft(note.content);
                setIsEditing(false);
              }
            }}
            style={{
              width: '100%',
              fontSize: '0.78rem',
              fontWeight: 550,
              border: '1px solid #3b82f6',
              borderRadius: '4px',
              padding: '2px 4px',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
        ) : (
          <div
            onClick={() => {
              setEditDraft(note.content);
              setIsEditing(true);
            }}
            title="Klicken zum Bearbeiten"
            style={{
              color: note.is_completed ? '#94a3b8' : '#0f172a',
              textDecoration: note.is_completed ? 'line-through' : 'none',
              fontWeight: 550,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              cursor: 'text'
            }}
          >
            {cleanDisplayContent}
          </div>
        )}
      </div>

      {/* 3. Student / Context */}
      <div>
        {note.student_name ? (
          <span style={{
            fontSize: '0.66rem',
            fontWeight: 800,
            color: '#166534',
            background: '#e6f4ea',
            border: '1px solid #bbf7d0',
            padding: '2px 8px',
            borderRadius: '100px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
          }}>
            <User size={10} />
            <span>{maskStudentName(note.student_name)}</span>
          </span>
        ) : (
          <span style={{ fontSize: '0.70rem', color: '#94a3b8' }}>—</span>
        )}
      </div>

      {/* 4. Tag Button with Colored Border */}
      <div style={{ position: 'relative' }}>
        {tagStyle ? (
          <button
            type="button"
            onClick={() => onOpenTagPicker(isPickerOpen ? null : note.id)}
            style={{
              border: `1.5px solid ${tagStyle.border}`,
              background: tagStyle.bg,
              color: tagStyle.color,
              padding: '2px 8px',
              borderRadius: '7px',
              fontSize: '0.66rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
            }}
          >
            <span>{renderMonochromeTagIcon(tagStyle.iconName, 10, tagStyle.color)}</span>
            <span>{tagStyle.label}</span>
            <ChevronDown size={9} opacity={0.7} />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onOpenTagPicker(isPickerOpen ? null : note.id)}
            style={{
              border: '1px dashed #cbd5e1',
              background: '#ffffff',
              color: '#64748b',
              padding: '2px 7px',
              borderRadius: '8px',
              fontSize: '0.64rem',
              fontWeight: 750,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.02), inset 0 1px 0 #ffffff'
            }}
          >
            <Plus size={9} />
            <span>Tag</span>
          </button>
        )}

        {/* Apple macOS Context Menu Category Tag Picker */}
        {isPickerOpen && (
          <CategoryTagPickerPopover
            note={note}
            columnId={note.student_id || note.student_name ? 'students' : 'todos'}
            onSelectTag={onSelectTag}
            onClose={() => onOpenTagPicker(null)}
          />
        )}
      </div>

      {/* 5. Due Date */}
      <div>
        {note.due_date ? (
          <span style={{ fontSize: '0.68rem', color: '#475569', fontWeight: 650, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
            <Calendar size={10} color="#94a3b8" />
            <span>{note.due_date}</span>
          </span>
        ) : (
          <span style={{ fontSize: '0.70rem', color: '#94a3b8' }}>—</span>
        )}
      </div>

      {/* 6. Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
        {note.student_id && onSyncToHomework && (
          <button
            type="button"
            onClick={onSyncToHomework}
            title="Ins Aufgabenheft übertragen"
            style={{
              border: '1px solid #bbf7d0',
              background: '#ffffff',
              color: '#15803d',
              padding: '3px 6px',
              borderRadius: '6px',
              fontSize: '0.64rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
            }}
          >
            <BookOpen size={9} />
          </button>
        )}

        <button
          type="button"
          onClick={onTogglePin}
          title={note.is_pinned ? 'Lösen' : 'Anpinnen'}
          style={{
            border: 'none',
            background: 'transparent',
            color: note.is_pinned ? '#0f172a' : '#cbd5e1',
            cursor: 'pointer',
            padding: '3px',
            display: 'flex'
          }}
        >
          <Pin size={11} />
        </button>

        <button
          type="button"
          onClick={onDelete}
          title="Löschen"
          style={{
            border: 'none',
            background: 'transparent',
            color: '#cbd5e1',
            cursor: 'pointer',
            padding: '3px',
            display: 'flex'
          }}
        >
          <Trash2 size={11} />
        </button>
      </div>
    </div>
  );
};
