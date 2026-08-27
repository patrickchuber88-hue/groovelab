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
  Send,
  Printer,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Lock,
  Unlock,
  Users,
  Filter
} from 'lucide-react';
import { UserNote, maskStudentName } from '../../services/notesService';
import { useVoiceToText } from '../../hooks/useVoiceToText';
import { checkIsAudioTresorActive } from '../../domain/stickersAndTresor';
import {
  TagDefinition,
  STUDENT_SKILL_TAGS,
  TEACHER_ORGANIZATION_TAGS,
  renderMonochromeTagIcon,
  getAllTagStyle,
  formatCleanNoteContent,
  formatDueDateBadge
} from './notesConstants';

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
  onUnsyncFromHomeworkBook?: (note: UserNote) => Promise<any>;
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
  onUnsyncFromHomeworkBook,
  onOpenHomeworkModal,
  onOpenCommandPalette
}) => {
  const [viewMode, setViewMode] = useState<'kanban' | 'list' | 'students'>('kanban');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(null);
  const [activeTagPickerNoteId, setActiveTagPickerNoteId] = useState<string | null>(null);
  const [activeDueDatePickerNoteId, setActiveDueDatePickerNoteId] = useState<string | null>(null);
  const [activeStudentPickerNoteId, setActiveStudentPickerNoteId] = useState<string | null>(null);
  const [showUniversalAdd, setShowUniversalAdd] = useState(false);
  const [universalInputContent, setUniversalInputContent] = useState('');
  const quickInputRef = useRef<HTMLInputElement | null>(null);

  // ✨ Prominente Omni-Capture Top Stage State
  const [omniContent, setOmniContent] = useState('');
  const [omniStudentId, setOmniStudentId] = useState<string | null>(null);
  const [omniStudentName, setOmniStudentName] = useState<string | null>(null);
  const [omniSelectedTag, setOmniSelectedTag] = useState<string | null>(null);
  const [omniDueDate, setOmniDueDate] = useState<string | null>(null);
  const [omniIsSharedWithHomework, setOmniIsSharedWithHomework] = useState(false);
  const [showOmniStudentPicker, setShowOmniStudentPicker] = useState(false);
  const [showOmniTagPicker, setShowOmniTagPicker] = useState(false);
  const [showOmniDueDatePicker, setShowOmniDueDatePicker] = useState(false);
  const omniInputRef = useRef<HTMLInputElement | null>(null);

  // 🔍 Omni Typeahead Dropdown State (@Student, #Tag)
  const [omniTypeahead, setOmniTypeahead] = useState<{
    type: 'student' | 'tag' | null;
    query: string;
    startIndex: number;
    endIndex: number;
  }>({ type: null, query: '', startIndex: 0, endIndex: 0 });
  const [omniTypeaheadIndex, setOmniTypeaheadIndex] = useState<number>(0);

  // 🎙️ Voice to text for Omni Bar
  const { isListening: isOmniListening, startListening: startOmniListening, stopListening: stopOmniListening } = useVoiceToText({
    onResult: (text) => {
      setOmniContent(prev => prev ? `${prev} ${text}` : text);
    }
  });

  // 🎙️ Column-Specific Voice-to-Text State (Tab 3: Nach Schülern)
  const [activeDictatingStudentId, setActiveDictatingStudentId] = useState<string | null>(null);
  const {
    isListening: isColumnListening,
    startListening: startColumnListening,
    stopListening: stopColumnListening
  } = useVoiceToText({
    onResult: (text) => {
      if (activeDictatingStudentId) {
        setStudentQuickInput(prev => {
          const cur = prev[activeDictatingStudentId] || '';
          return { ...prev, [activeDictatingStudentId]: cur ? `${cur} ${text}` : text };
        });
      }
    }
  });

  const handleToggleColumnDictation = (studentId: string) => {
    if (activeDictatingStudentId === studentId && isColumnListening) {
      stopColumnListening();
      setActiveDictatingStudentId(null);
    } else {
      if (isColumnListening) stopColumnListening();
      if (isOmniListening) stopOmniListening();
      setActiveDictatingStudentId(studentId);
      startColumnListening();
    }
  };

  // 🎙️ Audio-Tresor Storage Add-on Detection & Player State
  const hasTresorStorage = useMemo(() => checkIsAudioTresorActive(user), [user]);
  const [playingAudioNoteId, setPlayingAudioNoteId] = useState<string | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  const handleTogglePlayAudio = (noteId: string, audioUrl: string) => {
    if (!hasTresorStorage || !audioUrl) return;
    if (playingAudioNoteId === noteId) {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
      setPlayingAudioNoteId(null);
    } else {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
      const audio = new Audio(audioUrl);
      audioPlayerRef.current = audio;
      audio.play().catch(() => setPlayingAudioNoteId(null));
      setPlayingAudioNoteId(noteId);
      audio.onended = () => setPlayingAudioNoteId(null);
      audio.onerror = () => setPlayingAudioNoteId(null);
    }
  };

  // 📋 Multi-Select & Sorting in Dichte Liste
  const [selectedNoteIds, setSelectedNoteIds] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<'content' | 'student' | 'tag' | 'due_date' | 'status' | 'created_at'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // ➕ Column Quick Add Input State
  const [colQuickInput, setColQuickInput] = useState<{ [colId: string]: string }>({});

  // 👥 Student View Filter & Quick Add State
  const [studentFilterScope, setStudentFilterScope] = useState<'today' | 'all'>('today');
  const [studentSearchQuery, setStudentSearchQuery] = useState<string>('');
  const [studentQuickInput, setStudentQuickInput] = useState<{ [studentId: string]: string }>({});

  // 🔍 Omni Typeahead Suggestions Calculation
  const omniSuggestions = useMemo(() => {
    if (!omniTypeahead.type) return [];

    if (omniTypeahead.type === 'student') {
      const q = omniTypeahead.query.toLowerCase().trim();
      const combined = [
        ...todayStudents.map(s => ({ ...s, isToday: true })),
        ...allStudents.filter(s => !todayStudents.some(t => String(t.id) === String(s.id))).map(s => ({ ...s, isToday: false }))
      ];
      if (!q) return combined.slice(0, 8);
      return combined.filter(s => {
        const name = (s.first_name || s.name || '').toLowerCase();
        const lName = (s.last_name || '').toLowerCase();
        const inst = (s.instrument || '').toLowerCase();
        return name.includes(q) || lName.includes(q) || inst.includes(q);
      }).slice(0, 8);
    }

    if (omniTypeahead.type === 'tag') {
      const q = omniTypeahead.query.toLowerCase().trim();
      const allTags = [...STUDENT_SKILL_TAGS, ...TEACHER_ORGANIZATION_TAGS];
      if (!q) return allTags.slice(0, 8);
      return allTags.filter(t => {
        return t.label.toLowerCase().includes(q) || t.tag.toLowerCase().includes(q) || t.desc.toLowerCase().includes(q);
      }).slice(0, 8);
    }

    return [];
  }, [omniTypeahead, todayStudents, allStudents]);

  const selectOmniStudent = (student: any) => {
    const sName = student.first_name || student.name?.split(' ')[0] || 'Schüler';
    const before = omniContent.slice(0, omniTypeahead.startIndex);
    const after = omniContent.slice(omniTypeahead.endIndex);
    const newContent = `${before}@${sName} ${after}`.replace(/\s+/g, ' ');
    setOmniContent(newContent);
    setOmniStudentId(String(student.id));
    setOmniStudentName(student.first_name || student.name);
    setOmniTypeahead({ type: null, query: '', startIndex: 0, endIndex: 0 });
    omniInputRef.current?.focus();
  };

  const selectOmniTag = (tag: TagDefinition) => {
    const before = omniContent.slice(0, omniTypeahead.startIndex);
    const after = omniContent.slice(omniTypeahead.endIndex);
    const newContent = `${before}${tag.tag} ${after}`.replace(/\s+/g, ' ');
    setOmniContent(newContent);
    setOmniSelectedTag(tag.tag);
    if (tag.tag.toLowerCase() === '#hausaufgabe') {
      setOmniIsSharedWithHomework(true);
    }
    setOmniTypeahead({ type: null, query: '', startIndex: 0, endIndex: 0 });
    omniInputRef.current?.focus();
  };

  const handleOmniInputChange = (val: string, cursorPosition: number) => {
    setOmniContent(val);

    const textBeforeCursor = val.slice(0, cursorPosition);
    const matchAt = textBeforeCursor.match(/@([A-Za-z0-9äöüÄÖÜß\s]*)$/);
    const matchHash = textBeforeCursor.match(/#([A-Za-z0-9äöüÄÖÜß_-]*)$/);

    if (matchAt) {
      const query = matchAt[1];
      const startIndex = textBeforeCursor.lastIndexOf('@');
      setOmniTypeahead({
        type: 'student',
        query,
        startIndex,
        endIndex: cursorPosition
      });
      setOmniTypeaheadIndex(0);
    } else if (matchHash) {
      const query = matchHash[1];
      const startIndex = textBeforeCursor.lastIndexOf('#');
      setOmniTypeahead({
        type: 'tag',
        query,
        startIndex,
        endIndex: cursorPosition
      });
      setOmniTypeaheadIndex(0);
    } else {
      setOmniTypeahead({ type: null, query: '', startIndex: 0, endIndex: 0 });
    }

    // Auto-detect #Hausaufgabe
    if (/#hausaufgabe/i.test(val)) {
      setOmniIsSharedWithHomework(true);
      setOmniSelectedTag('#Hausaufgabe');
    }
  };

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
    let pool = studentFilterScope === 'today' && todayStudents.length > 0 
      ? todayStudents 
      : allStudents;

    if (studentSearchQuery.trim()) {
      const q = studentSearchQuery.toLowerCase().trim();
      pool = pool.filter(s => {
        const name = (s.first_name || s.name || '').toLowerCase();
        const inst = (s.instrument || '').toLowerCase();
        return name.includes(q) || inst.includes(q);
      });
    }

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
  }, [filteredNotes, todayStudents, allStudents, studentFilterScope, studentSearchQuery]);

  // Sorted Notes List for Dichte Liste
  const sortedNotesList = useMemo(() => {
    return [...filteredNotes].sort((a, b) => {
      if (sortField === 'content') {
        const comp = (a.content || '').localeCompare(b.content || '');
        return sortOrder === 'asc' ? comp : -comp;
      }
      if (sortField === 'student') {
        const nameA = a.student_name || '';
        const nameB = b.student_name || '';
        const comp = nameA.localeCompare(nameB);
        return sortOrder === 'asc' ? comp : -comp;
      }
      if (sortField === 'tag') {
        const tagA = (a.tags && a.tags[0]) || '';
        const tagB = (b.tags && b.tags[0]) || '';
        const comp = tagA.localeCompare(tagB);
        return sortOrder === 'asc' ? comp : -comp;
      }
      if (sortField === 'due_date') {
        const dateA = a.due_date || '9999-99-99';
        const dateB = b.due_date || '9999-99-99';
        const comp = dateA.localeCompare(dateB);
        return sortOrder === 'asc' ? comp : -comp;
      }
      if (sortField === 'status') {
        const stA = a.is_completed ? 1 : 0;
        const stB = b.is_completed ? 1 : 0;
        return sortOrder === 'asc' ? stA - stB : stB - stA;
      }
      // default created_at
      const tA = new Date(a.created_at || 0).getTime();
      const tB = new Date(b.created_at || 0).getTime();
      return sortOrder === 'asc' ? tA - tB : tB - tA;
    });
  }, [filteredNotes, sortField, sortOrder]);

  const handleToggleSort = (field: 'content' | 'student' | 'tag' | 'due_date' | 'status' | 'created_at') => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Batch Operations in Dichte Liste
  const handleToggleSelectNote = (id: string) => {
    setSelectedNoteIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAllNotes = () => {
    if (selectedNoteIds.size === filteredNotes.length) {
      setSelectedNoteIds(new Set());
    } else {
      setSelectedNoteIds(new Set(filteredNotes.map(n => n.id)));
    }
  };

  const handleBatchComplete = async () => {
    for (const id of Array.from(selectedNoteIds)) {
      await onToggleCompleteTodo(id);
    }
    setSelectedNoteIds(new Set());
  };

  const handleBatchDelete = async () => {
    for (const id of Array.from(selectedNoteIds)) {
      await onDeleteNote(id);
    }
    setSelectedNoteIds(new Set());
  };

  // Column Quick Add Handler
  const handleQuickAddInColumn = async (colId: string) => {
    const text = (colQuickInput[colId] || '').trim();
    if (!text) return;
    if (colId === 'todos') {
      await onCreateNote(text, { note_type: 'todo', tags: ['#To-Do'] });
    } else if (colId === 'orga') {
      await onCreateNote(text, { note_type: 'room_issue', tags: ['#Raum'] });
    } else if (colId === 'students') {
      await onCreateNote(text, { note_type: 'student_note' });
    } else if (colId === 'completed') {
      await onCreateNote(text, { is_completed: true });
    } else {
      await onCreateNote(text, { note_type: 'scratchpad' });
    }
    setColQuickInput(prev => ({ ...prev, [colId]: '' }));
  };

  // Student Column Quick Add Handler
  const handleQuickAddForStudent = async (student: any) => {
    const sId = String(student.id);
    const text = (studentQuickInput[sId] || '').trim();
    if (!text) return;

    if (activeDictatingStudentId === sId && isColumnListening) {
      stopColumnListening();
      setActiveDictatingStudentId(null);
    }

    await onCreateNote(text, {
      studentId: student.id,
      student_id: student.id,
      studentName: student.first_name || student.name,
      student_name: student.first_name || student.name,
      noteType: 'student_note',
      note_type: 'student_note'
    });
    setStudentQuickInput(prev => ({ ...prev, [sId]: '' }));
  };

  // Drop on Student Column
  const handleDropOnStudentColumn = async (student: any) => {
    if (!draggingNoteId) return;
    await onUpdateNote(draggingNoteId, {
      student_id: student.id,
      student_name: student.first_name || student.name,
      note_type: 'student_note'
    });
    setDraggingNoteId(null);
    setDragOverColId(null);
  };

  // Clear Archive Handler
  const handleClearArchive = async () => {
    const completedNotes = notes.filter(n => n.is_completed || n.is_archived);
    for (const n of completedNotes) {
      await onDeleteNote(n.id);
    }
  };

  const handleUniversalCreateNote = async () => {
    if (!universalInputContent.trim()) {
      setShowUniversalAdd(false);
      return;
    }
    await onCreateNote(universalInputContent.trim());
    setUniversalInputContent('');
    setShowUniversalAdd(false);
  };

  const handleOmniCreateNote = async () => {
    if (!omniContent.trim()) return;

    let finalTags: string[] = omniSelectedTag ? [omniSelectedTag] : [];
    if (omniIsSharedWithHomework && !finalTags.includes('#Hausaufgabe')) {
      finalTags.push('#Hausaufgabe');
    }

    let noteType: 'student_note' | 'todo' | 'room_issue' | 'scratchpad' = 'scratchpad';
    if (omniStudentId || omniStudentName || omniIsSharedWithHomework) {
      noteType = 'student_note';
    } else if (omniSelectedTag === '#To-Do') {
      noteType = 'todo';
    } else if (omniSelectedTag === '#Raum') {
      noteType = 'room_issue';
    }

    const created = await onCreateNote(omniContent.trim(), {
      student_id: omniStudentId,
      student_name: omniStudentName,
      due_date: omniDueDate,
      tags: finalTags,
      note_type: noteType,
      visibility: omniIsSharedWithHomework ? 'student_shared' : 'private'
    });

    if (omniIsSharedWithHomework && created && onSyncToHomeworkBook) {
      await onSyncToHomeworkBook(created);
    }

    // Reset Omni Bar
    setOmniContent('');
    setOmniStudentId(null);
    setOmniStudentName(null);
    setOmniSelectedTag(null);
    setOmniDueDate(null);
    setOmniIsSharedWithHomework(false);
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
        {/* 2.5 ✨ PROMINENTE OMNI-CAPTURE TOP STAGE (Spotlight Quick Input Bank)      */}
        {/* ========================================================================= */}
        <div style={{
          padding: '10px 24px',
          background: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          position: 'relative'
        }}>
          {/* Main Input Row */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: '#f8fafc',
            border: omniTypeahead.type ? '1.5px solid #34a853' : '1.5px solid #cbd5e1',
            borderRadius: '14px',
            padding: '6px 12px',
            boxShadow: omniTypeahead.type ? '0 0 0 3px rgba(52, 168, 83, 0.12)' : 'inset 0 1px 2px rgba(0,0,0,0.02)',
            transition: 'all 0.15s ease'
          }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              background: '#0f172a',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <Plus size={16} />
            </div>

            <input
              ref={omniInputRef}
              type="text"
              placeholder="Notiz, Hausaufgabe oder Beobachtung blitzschnell erfassen... (@Schüler, #Tag)"
              value={omniContent}
              onChange={(e) => {
                const cursor = e.target.selectionStart || e.target.value.length;
                handleOmniInputChange(e.target.value, cursor);
              }}
              onKeyDown={(e) => {
                if (omniTypeahead.type && omniSuggestions.length > 0) {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setOmniTypeaheadIndex(i => Math.min(i + 1, omniSuggestions.length - 1));
                    return;
                  }
                  if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setOmniTypeaheadIndex(i => Math.max(i - 1, 0));
                    return;
                  }
                  if (e.key === 'Enter' || e.key === 'Tab') {
                    e.preventDefault();
                    const selected = omniSuggestions[omniTypeaheadIndex];
                    if (selected) {
                      if (omniTypeahead.type === 'student') selectOmniStudent(selected);
                      else if (omniTypeahead.type === 'tag') selectOmniTag(selected);
                    }
                    return;
                  }
                  if (e.key === 'Escape') {
                    setOmniTypeahead({ type: null, query: '', startIndex: 0, endIndex: 0 });
                    return;
                  }
                }

                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleOmniCreateNote();
                }
              }}
              style={{
                flex: 1,
                border: 'none',
                background: 'transparent',
                fontSize: '0.85rem',
                fontWeight: 600,
                color: '#0f172a',
                outline: 'none'
              }}
            />

            {/* Voice-to-Text Button */}
            <button
              type="button"
              onClick={isOmniListening ? stopOmniListening : startOmniListening}
              style={{
                border: isOmniListening ? '1.5px solid #ef4444' : '1px solid #e2e8f0',
                background: isOmniListening ? '#fef2f2' : '#ffffff',
                color: isOmniListening ? '#ef4444' : '#64748b',
                padding: '5px 8px',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.68rem',
                fontWeight: 750,
                flexShrink: 0
              }}
              title="Spracheingabe starten"
            >
              <Mic size={12} color={isOmniListening ? '#ef4444' : '#64748b'} />
              <span>{isOmniListening ? 'Zuhören...' : 'Diktieren'}</span>
            </button>

            {/* Save CTA */}
            <button
              type="button"
              onClick={handleOmniCreateNote}
              disabled={!omniContent.trim()}
              style={{
                border: 'none',
                background: omniContent.trim() ? '#0f172a' : '#cbd5e1',
                color: '#ffffff',
                padding: '6px 14px',
                borderRadius: '9px',
                fontSize: '0.74rem',
                fontWeight: 800,
                cursor: omniContent.trim() ? 'pointer' : 'default',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                flexShrink: 0,
                boxShadow: omniContent.trim() ? '0 2px 6px rgba(15, 23, 42, 0.2)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <span>Speichern</span>
              <kbd style={{ opacity: 0.6, fontSize: '0.60rem', fontFamily: 'monospace' }}>↵</kbd>
            </button>
          </div>

          {/* 🔍 Floating Typeahead Popover Dropdown (@Student, #Tag) */}
          {omniTypeahead.type && omniSuggestions.length > 0 && (
            <div
              style={{
                position: 'absolute',
                top: '56px',
                left: '60px',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '14px',
                boxShadow: '0 16px 36px -4px rgba(15, 23, 42, 0.22), 0 4px 12px rgba(0,0,0,0.06)',
                width: '320px',
                maxHeight: '260px',
                overflowY: 'auto',
                zIndex: 9999,
                padding: '6px',
                animation: 'scaleIn 0.12s ease-out'
              }}
            >
              <div style={{
                padding: '4px 8px 6px 8px',
                fontSize: '0.62rem',
                fontWeight: 800,
                color: '#94a3b8',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                borderBottom: '1px solid #f1f5f9',
                marginBottom: '4px'
              }}>
                {omniTypeahead.type === 'student' ? '👤 Schüler auswählen (@)' : '🏷️ Didaktik-Tag auswählen (#)'}
              </div>

              {omniTypeahead.type === 'student' && omniSuggestions.map((s: any, idx: number) => {
                const isSelected = idx === omniTypeaheadIndex;
                return (
                  <div
                    key={s.id}
                    onClick={() => selectOmniStudent(s)}
                    onMouseEnter={() => setOmniTypeaheadIndex(idx)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '7px 10px',
                      borderRadius: '10px',
                      background: isSelected ? '#f1f5f9' : 'transparent',
                      cursor: 'pointer',
                      transition: 'background 0.1s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: '#e6f4ea',
                        color: '#166534',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.68rem',
                        fontWeight: 800
                      }}>
                        {s.first_name?.[0] || 'S'}
                      </div>
                      <div>
                        <div style={{ fontSize: '0.78rem', fontWeight: 750, color: '#0f172a' }}>
                          {maskStudentName(s.first_name || s.name)}
                        </div>
                        <div style={{ fontSize: '0.64rem', color: '#64748b', fontWeight: 550 }}>
                          {s.instrument || 'Instrument'}
                        </div>
                      </div>
                    </div>
                    {s.isToday && (
                      <span style={{
                        fontSize: '0.60rem',
                        fontWeight: 800,
                        color: '#166534',
                        background: '#dcfce7',
                        padding: '2px 6px',
                        borderRadius: '6px'
                      }}>
                        Heute
                      </span>
                    )}
                  </div>
                );
              })}

              {omniTypeahead.type === 'tag' && omniSuggestions.map((t: TagDefinition, idx: number) => {
                const isSelected = idx === omniTypeaheadIndex;
                return (
                  <div
                    key={t.key}
                    onClick={() => selectOmniTag(t)}
                    onMouseEnter={() => setOmniTypeaheadIndex(idx)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '7px 10px',
                      borderRadius: '10px',
                      background: isSelected ? '#f1f5f9' : 'transparent',
                      cursor: 'pointer',
                      transition: 'background 0.1s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '22px',
                        height: '22px',
                        borderRadius: '6px',
                        background: t.bg,
                        color: t.color
                      }}>
                        {renderMonochromeTagIcon(t.iconName, 12, t.color)}
                      </span>
                      <div>
                        <div style={{ fontSize: '0.78rem', fontWeight: 750, color: '#0f172a' }}>
                          {t.tag}
                        </div>
                        <div style={{ fontSize: '0.64rem', color: '#64748b', fontWeight: 550 }}>
                          {t.desc}
                        </div>
                      </div>
                    </div>
                    <span style={{
                      fontSize: '0.62rem',
                      fontWeight: 700,
                      color: t.color,
                      background: t.bg,
                      border: `1px solid ${t.border}`,
                      padding: '2px 6px',
                      borderRadius: '6px'
                    }}>
                      {t.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Omni Context Meta Chips Row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {/* Student Chip */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setShowOmniStudentPicker(prev => !prev)}
                style={{
                  border: omniStudentName ? '1.5px solid #86efac' : '1px dashed #cbd5e1',
                  background: omniStudentName ? '#e6f4ea' : '#ffffff',
                  color: omniStudentName ? '#166534' : '#64748b',
                  padding: '3px 8px',
                  borderRadius: '8px',
                  fontSize: '0.68rem',
                  fontWeight: 750,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <User size={11} />
                <span>{omniStudentName ? maskStudentName(omniStudentName) : 'Schüler zuweisen'}</span>
                <ChevronDown size={9} opacity={0.6} />
              </button>

              {showOmniStudentPicker && (
                <InlineStudentPickerPopover
                  currentStudentId={omniStudentId}
                  students={allStudents}
                  onSelectStudent={(sId, sName) => {
                    setOmniStudentId(sId);
                    setOmniStudentName(sName);
                    setShowOmniStudentPicker(false);
                  }}
                  onClose={() => setShowOmniStudentPicker(false)}
                />
              )}
            </div>

            {/* Tag Chip */}
            <div style={{ position: 'relative' }}>
              {omniSelectedTag ? (
                (() => {
                  const tStyle = getAllTagStyle(omniSelectedTag);
                  return (
                    <button
                      type="button"
                      onClick={() => setShowOmniTagPicker(prev => !prev)}
                      style={{
                        border: `1.5px solid ${tStyle.border}`,
                        background: tStyle.bg,
                        color: tStyle.color,
                        padding: '3px 8px',
                        borderRadius: '8px',
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <span>{renderMonochromeTagIcon(tStyle.iconName, 11, tStyle.color)}</span>
                      <span>{tStyle.label}</span>
                      <ChevronDown size={9} opacity={0.7} />
                    </button>
                  );
                })()
              ) : (
                <button
                  type="button"
                  onClick={() => setShowOmniTagPicker(prev => !prev)}
                  style={{
                    border: '1px dashed #cbd5e1',
                    background: '#ffffff',
                    color: '#64748b',
                    padding: '3px 8px',
                    borderRadius: '8px',
                    fontSize: '0.68rem',
                    fontWeight: 750,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Hash size={11} />
                  <span>Themen-Tag</span>
                  <ChevronDown size={9} opacity={0.6} />
                </button>
              )}

              {showOmniTagPicker && (
                <CategoryTagPickerPopover
                  note={{ id: 'omni', content: '', tags: omniSelectedTag ? [omniSelectedTag] : [] } as any}
                  columnId={omniStudentId ? 'students' : 'todos'}
                  onSelectTag={(tag) => {
                    setOmniSelectedTag(tag);
                    if (tag.toLowerCase() === '#hausaufgabe') {
                      setOmniIsSharedWithHomework(true);
                    }
                    setShowOmniTagPicker(false);
                  }}
                  onClose={() => setShowOmniTagPicker(false)}
                />
              )}
            </div>

            {/* Due Date Chip */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setShowOmniDueDatePicker(prev => !prev)}
                style={{
                  border: omniDueDate ? '1.5px solid #93c5fd' : '1px dashed #cbd5e1',
                  background: omniDueDate ? '#eff6ff' : '#ffffff',
                  color: omniDueDate ? '#1e40af' : '#64748b',
                  padding: '3px 8px',
                  borderRadius: '8px',
                  fontSize: '0.68rem',
                  fontWeight: 750,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Calendar size={11} />
                <span>{omniDueDate ? formatDueDateBadge(omniDueDate).label : 'Fälligkeit'}</span>
                <ChevronDown size={9} opacity={0.6} />
              </button>

              {showOmniDueDatePicker && (
                <InlineDueDatePickerPopover
                  currentDueDate={omniDueDate}
                  onSelectDueDate={(date) => {
                    setOmniDueDate(date);
                    setShowOmniDueDatePicker(false);
                  }}
                  onClose={() => setShowOmniDueDatePicker(false)}
                />
              )}
            </div>

            {/* 1-Klick Sichtbarkeits-Toggle: 🔒 Privat ⇄ 📖 Im Aufgabenheft */}
            <button
              type="button"
              onClick={() => setOmniIsSharedWithHomework(prev => !prev)}
              style={{
                border: omniIsSharedWithHomework ? '1.5px solid #86efac' : '1px solid #e2e8f0',
                background: omniIsSharedWithHomework ? '#f0fdf4' : '#ffffff',
                color: omniIsSharedWithHomework ? '#166534' : '#64748b',
                padding: '3px 10px',
                borderRadius: '8px',
                fontSize: '0.68rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                transition: 'all 0.15s ease'
              }}
              title="Notiz-Sichtbarkeit für Schüler und Aufgabenheft steuern"
            >
              {omniIsSharedWithHomework ? (
                <>
                  <BookOpen size={11} color="#16a34a" />
                  <span>📖 Im Aufgabenheft aktiv (Geteilt)</span>
                </>
              ) : (
                <>
                  <Lock size={11} color="#64748b" />
                  <span>🔒 Lehrkraft-Notiz (Privat)</span>
                </>
              )}
            </button>
          </div>
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
                    {/* Clean Column Header with Color Badge & Archive Cleaner */}
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

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {col.id === 'completed' && col.count > 0 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm('Möchtest du alle erledigten Notizen endgültig aus dem Archiv entfernen?')) {
                                handleClearArchive();
                              }
                            }}
                            style={{
                              border: 'none',
                              background: '#f1f5f9',
                              color: '#64748b',
                              padding: '2px 6px',
                              borderRadius: '6px',
                              fontSize: '0.62rem',
                              fontWeight: 750,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px'
                            }}
                            title="Archiv leeren"
                          >
                            <Trash2 size={9} />
                            <span>Leeren</span>
                          </button>
                        )}
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
                    </div>

                    {/* Top-of-Column Quick Add Input */}
                    <div style={{
                      padding: '8px 10px',
                      borderBottom: '1px solid #f1f5f9',
                      background: '#fafbfc'
                    }}>
                      <input
                        type="text"
                        placeholder={`+ Notiz in "${col.title}"...`}
                        value={colQuickInput[col.id] || ''}
                        onChange={(e) => setColQuickInput(prev => ({ ...prev, [col.id]: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleQuickAddInColumn(col.id);
                          }
                        }}
                        style={{
                          width: '100%',
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          padding: '5px 8px',
                          outline: 'none',
                          boxSizing: 'border-box',
                          background: '#ffffff'
                        }}
                      />
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
                              hasTresorStorage={hasTresorStorage}
                              playingAudioNoteId={playingAudioNoteId}
                              onTogglePlayAudio={handleTogglePlayAudio}
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
                              activeDueDatePickerNoteId={activeDueDatePickerNoteId}
                              onOpenDueDatePicker={(id) => setActiveDueDatePickerNoteId(id)}
                              onSelectDueDate={(date) => onUpdateNote(note.id, { due_date: date })}
                              activeStudentPickerNoteId={activeStudentPickerNoteId}
                              onOpenStudentPicker={(id) => setActiveStudentPickerNoteId(id)}
                              onSelectStudent={(sId, sName) => onUpdateNote(note.id, { student_id: sId, student_name: sName, note_type: sId ? 'student_note' : note.note_type })}
                              onUpdateContent={(content) => onUpdateNote(note.id, { content })}
                              onToggleComplete={() => onToggleCompleteTodo(note.id)}
                              onTogglePin={() => onTogglePin(note.id)}
                              onDelete={() => handleDeleteWithUndo(note)}
                              onSyncToHomework={onSyncToHomeworkBook ? () => onSyncToHomeworkBook(note) : undefined}
                              onUnsyncFromHomework={onUnsyncFromHomeworkBook ? () => onUnsyncFromHomeworkBook(note) : undefined}
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

          {/* B. DICHTE LISTE (Linear / Notion Tabellenstandard mit Multi-Select & Sort) */}
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
              boxShadow: '0 2px 8px rgba(0,0,0,0.02), inset 0 1px 0 rgba(255, 255, 255, 0.7)',
              position: 'relative'
            }} className="custom-scrollbar">
              {/* Structured Linear Table Header with Sort & Multi-Select */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '32px 40px 1fr 180px 180px 140px 110px',
                padding: '10px 16px',
                background: '#f8fafc',
                borderBottom: '1px solid #e2e8f0',
                fontSize: '0.64rem',
                fontWeight: 800,
                color: '#64748b',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                alignItems: 'center',
                userSelect: 'none'
              }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <input
                    type="checkbox"
                    checked={filteredNotes.length > 0 && selectedNoteIds.size === filteredNotes.length}
                    onChange={handleSelectAllNotes}
                    style={{ cursor: 'pointer' }}
                  />
                </div>
                <div onClick={() => handleToggleSort('status')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <span>Status</span>
                  {sortField === 'status' && (sortOrder === 'asc' ? <ArrowUp size={10} /> : <ArrowDown size={10} />)}
                </div>
                <div onClick={() => handleToggleSort('content')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <span>Notiz / Aufgabe</span>
                  {sortField === 'content' && (sortOrder === 'asc' ? <ArrowUp size={10} /> : <ArrowDown size={10} />)}
                </div>
                <div onClick={() => handleToggleSort('student')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <span>Schüler / Kontext</span>
                  {sortField === 'student' && (sortOrder === 'asc' ? <ArrowUp size={10} /> : <ArrowDown size={10} />)}
                </div>
                <div onClick={() => handleToggleSort('tag')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <span>Themen-Tag</span>
                  {sortField === 'tag' && (sortOrder === 'asc' ? <ArrowUp size={10} /> : <ArrowDown size={10} />)}
                </div>
                <div onClick={() => handleToggleSort('due_date')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <span>Fälligkeit</span>
                  {sortField === 'due_date' && (sortOrder === 'asc' ? <ArrowUp size={10} /> : <ArrowDown size={10} />)}
                </div>
                <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      color: '#64748b',
                      cursor: 'pointer',
                      padding: '2px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px',
                      fontSize: '0.62rem',
                      fontWeight: 700
                    }}
                    title="Liste drucken"
                  >
                    <Printer size={11} />
                    <span>Drucken</span>
                  </button>
                </div>
              </div>

              {/* Table Rows */}
              {sortedNotesList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 10px', color: '#94a3b8', fontSize: '0.78rem' }}>
                  Keine Notizen gefunden
                </div>
              ) : (
                sortedNotesList.map(note => {
                  const isFocused = filteredNotes[focusedNoteIndex]?.id === note.id;
                  return (
                    <NoteListTableRow
                      key={note.id}
                      note={note}
                      allStudents={allStudents}
                      isFocused={isFocused}
                      hasTresorStorage={hasTresorStorage}
                      playingAudioNoteId={playingAudioNoteId}
                      onTogglePlayAudio={handleTogglePlayAudio}
                      isSelectedRow={selectedNoteIds.has(note.id)}
                      onToggleSelectRow={() => handleToggleSelectNote(note.id)}
                      activeTagPickerNoteId={activeTagPickerNoteId}
                      onOpenTagPicker={(id) => setActiveTagPickerNoteId(id)}
                      onSelectTag={(tag) => handleSetNoteTag(note, tag)}
                      activeDueDatePickerNoteId={activeDueDatePickerNoteId}
                      onOpenDueDatePicker={(id) => setActiveDueDatePickerNoteId(id)}
                      onSelectDueDate={(date) => onUpdateNote(note.id, { due_date: date })}
                      activeStudentPickerNoteId={activeStudentPickerNoteId}
                      onOpenStudentPicker={(id) => setActiveStudentPickerNoteId(id)}
                      onSelectStudent={(sId, sName) => onUpdateNote(note.id, { student_id: sId, student_name: sName, note_type: sId ? 'student_note' : note.note_type })}
                      onUpdateContent={(content) => onUpdateNote(note.id, { content })}
                      onToggleComplete={() => onToggleCompleteTodo(note.id)}
                      onTogglePin={() => onTogglePin(note.id)}
                      onDelete={() => handleDeleteWithUndo(note)}
                      onSyncToHomework={onSyncToHomeworkBook ? () => onSyncToHomeworkBook(note) : undefined}
                      onUnsyncFromHomework={onUnsyncFromHomeworkBook ? () => onUnsyncFromHomeworkBook(note) : undefined}
                      onOpenHomeworkModal={onOpenHomeworkModal}
                    />
                  );
                })
              )}

              {/* Floating Multi-Select Action Bar */}
              {selectedNoteIds.size > 0 && (
                <div style={{
                  position: 'absolute',
                  bottom: '24px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: '#0f172a',
                  color: '#ffffff',
                  borderRadius: '100px',
                  padding: '8px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  boxShadow: '0 16px 36px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.2)',
                  zIndex: 99999,
                  animation: 'slideUp 0.18s ease-out'
                }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 800 }}>
                    {selectedNoteIds.size} Notizen markiert
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={handleBatchComplete}
                      style={{
                        border: 'none',
                        background: '#16a34a',
                        color: '#ffffff',
                        padding: '4px 10px',
                        borderRadius: '100px',
                        fontSize: '0.70rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <CheckCircle2 size={12} />
                      <span>Erledigen</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleBatchDelete}
                      style={{
                        border: 'none',
                        background: 'rgba(239, 68, 68, 0.25)',
                        color: '#fca5a5',
                        padding: '4px 10px',
                        borderRadius: '100px',
                        fontSize: '0.70rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <Trash2 size={12} />
                      <span>Löschen</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedNoteIds(new Set())}
                      style={{
                        border: 'none',
                        background: 'rgba(255,255,255,0.15)',
                        color: '#ffffff',
                        padding: '4px 10px',
                        borderRadius: '100px',
                        fontSize: '0.70rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      Aufheben
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* C. STUDENT PIVOT VIEW (Nach Schülern mit Filter & Quick-Add) */}
          {viewMode === 'students' && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              height: '100%',
              minWidth: '100%'
            }}>
              {/* Student View Sub-Header (Scope Switcher & Search) */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                flexWrap: 'wrap'
              }}>
                <div style={{
                  display: 'flex',
                  background: '#ffffff',
                  padding: '3px',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  gap: '3px'
                }}>
                  <button
                    type="button"
                    onClick={() => setStudentFilterScope('today')}
                    style={{
                      border: 'none',
                      background: studentFilterScope === 'today' ? '#0f172a' : 'transparent',
                      color: studentFilterScope === 'today' ? '#ffffff' : '#64748b',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      padding: '4px 10px',
                      borderRadius: '7px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                  >
                    <Calendar size={11} />
                    <span>Heute unterrichtet ({todayStudents.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setStudentFilterScope('all')}
                    style={{
                      border: 'none',
                      background: studentFilterScope === 'all' ? '#0f172a' : 'transparent',
                      color: studentFilterScope === 'all' ? '#ffffff' : '#64748b',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      padding: '4px 10px',
                      borderRadius: '7px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                  >
                    <Users size={11} />
                    <span>Alle Schüler ({allStudents.length})</span>
                  </button>
                </div>

                {/* Instant Student Filter Search */}
                <div style={{ position: 'relative', width: '220px' }}>
                  <input
                    type="text"
                    placeholder="Schüler suchen..."
                    value={studentSearchQuery}
                    onChange={(e) => setStudentSearchQuery(e.target.value)}
                    style={{
                      width: '100%',
                      fontSize: '0.72rem',
                      padding: '5px 8px 5px 24px',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      background: '#ffffff',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                  <Search size={11} color="#94a3b8" style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)' }} />
                </div>
              </div>

              {/* Student Columns Container */}
              <div style={{
                display: 'flex',
                gap: '14px',
                flex: 1,
                overflowX: 'auto',
                overflowY: 'hidden',
                minWidth: '100%'
              }}>
                {studentGroups.studentsWithNotes.map(group => {
                  const sId = String(group.student.id);
                  const isDragOver = dragOverColId === `student-${sId}`;
                  return (
                    <div
                      key={sId}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOverColId(`student-${sId}`);
                      }}
                      onDragLeave={() => setDragOverColId(null)}
                      onDrop={() => handleDropOnStudentColumn(group.student)}
                      style={{
                        flex: '1 1 0%',
                        minWidth: '270px',
                        maxWidth: '320px',
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
                      {/* Student Column Header */}
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
                              {group.student.instrument || 'Instrument'}
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

                      {/* Top-of-Column Comfort Quick Add Input for Student with 🎙️ Dictation */}
                      <div style={{
                        padding: '8px 10px',
                        borderBottom: '1px solid #e2e8f0',
                        background: '#f8fafc'
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          background: '#ffffff',
                          border: activeDictatingStudentId === sId && isColumnListening ? '1.5px solid #ef4444' : '1.5px solid #cbd5e1',
                          borderRadius: '10px',
                          padding: '3px 8px',
                          boxShadow: activeDictatingStudentId === sId && isColumnListening ? '0 0 0 3px rgba(239, 68, 68, 0.12)' : '0 1px 2px rgba(0,0,0,0.02)',
                          transition: 'all 0.15s ease'
                        }}>
                          <input
                            type="text"
                            placeholder={activeDictatingStudentId === sId && isColumnListening ? '🎙️ Bitte sprechen...' : `+ Notiz für ${maskStudentName(group.student.first_name || group.student.name)}...`}
                            value={studentQuickInput[sId] || ''}
                            onChange={(e) => setStudentQuickInput(prev => ({ ...prev, [sId]: e.target.value }))}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleQuickAddForStudent(group.student);
                              }
                            }}
                            style={{
                              flex: 1,
                              fontSize: '0.78rem',
                              fontWeight: 600,
                              border: 'none',
                              outline: 'none',
                              padding: '5px 2px',
                              color: '#0f172a',
                              background: 'transparent'
                            }}
                          />

                          {/* 🎙️ Voice-to-Text Button */}
                          <button
                            type="button"
                            onClick={() => handleToggleColumnDictation(sId)}
                            title={activeDictatingStudentId === sId && isColumnListening ? 'Diktat beenden' : 'Notiz für diesen Schüler einsprechen'}
                            style={{
                              border: 'none',
                              background: activeDictatingStudentId === sId && isColumnListening ? '#fee2e2' : '#f1f5f9',
                              color: activeDictatingStudentId === sId && isColumnListening ? '#dc2626' : '#64748b',
                              padding: '5px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <Mic size={13} color={activeDictatingStudentId === sId && isColumnListening ? '#dc2626' : '#64748b'} />
                          </button>

                          {/* Quick Save Send Button */}
                          {(studentQuickInput[sId] || '').trim().length > 0 && (
                            <button
                              type="button"
                              onClick={() => handleQuickAddForStudent(group.student)}
                              title="Speichern (Enter)"
                              style={{
                                border: 'none',
                                background: '#0f172a',
                                color: '#ffffff',
                                padding: '4px 7px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '2px',
                                fontSize: '0.66rem',
                                fontWeight: 800
                              }}
                            >
                              <Send size={10} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Student Notes List */}
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
                                hideStudentBadge={true}
                                isFocused={isFocused}
                                isDragging={draggingNoteId === note.id}
                                hasTresorStorage={hasTresorStorage}
                                playingAudioNoteId={playingAudioNoteId}
                                onTogglePlayAudio={handleTogglePlayAudio}
                                onDragStart={() => setDraggingNoteId(note.id)}
                                onDragEnd={() => setDraggingNoteId(null)}
                                activeTagPickerNoteId={activeTagPickerNoteId}
                                onOpenTagPicker={(id) => setActiveTagPickerNoteId(id)}
                                onSelectTag={(tag) => handleSetNoteTag(note, tag)}
                                activeDueDatePickerNoteId={activeDueDatePickerNoteId}
                                onOpenDueDatePicker={(id) => setActiveDueDatePickerNoteId(id)}
                                onSelectDueDate={(date) => onUpdateNote(note.id, { due_date: date })}
                                activeStudentPickerNoteId={activeStudentPickerNoteId}
                                onOpenStudentPicker={(id) => setActiveStudentPickerNoteId(id)}
                                onSelectStudent={(studId, studName) => onUpdateNote(note.id, { student_id: studId, student_name: studName, note_type: studId ? 'student_note' : note.note_type })}
                                onUpdateContent={(content) => onUpdateNote(note.id, { content })}
                                onToggleComplete={() => onToggleCompleteTodo(note.id)}
                                onTogglePin={() => onTogglePin(note.id)}
                                onDelete={() => handleDeleteWithUndo(note)}
                                onSyncToHomework={onSyncToHomeworkBook ? () => onSyncToHomeworkBook(note) : undefined}
                                onUnsyncFromHomework={onUnsyncFromHomeworkBook ? () => onUnsyncFromHomeworkBook(note) : undefined}
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
// SUB-COMPONENT: Inline Due Date Quick-Picker Popover
// =========================================================================
interface InlineDueDatePickerPopoverProps {
  currentDueDate?: string | null;
  onSelectDueDate: (dateStr: string | null) => void;
  onClose: () => void;
}

export const InlineDueDatePickerPopover: React.FC<InlineDueDatePickerPopoverProps> = ({
  currentDueDate,
  onSelectDueDate,
  onClose
}) => {
  const getPresetDate = (type: 'today' | 'tomorrow' | 'friday' | 'next_week'): string => {
    const d = new Date();
    if (type === 'tomorrow') d.setDate(d.getDate() + 1);
    if (type === 'friday') {
      const day = d.getDay();
      const diff = (5 - day + 7) % 7 || 7;
      d.setDate(d.getDate() + diff);
    }
    if (type === 'next_week') d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  };

  const presets = [
    { label: 'Heute fällig', date: getPresetDate('today'), icon: Calendar, color: '#166534', bg: '#e6f4ea' },
    { label: 'Morgen', date: getPresetDate('tomorrow'), icon: Clock, color: '#1e40af', bg: '#eff6ff' },
    { label: 'Diesen Freitag', date: getPresetDate('friday'), icon: Calendar, color: '#6b21a8', bg: '#f3e8ff' },
    { label: 'Nächste Woche', date: getPresetDate('next_week'), icon: Calendar, color: '#b45309', bg: '#fef3c7' }
  ];

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
        width: '190px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        animation: 'scaleUp 0.14s cubic-bezier(0.16, 1, 0.3, 1)'
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '2px 4px 4px 4px',
        borderBottom: '1px solid #f1f5f9'
      }}>
        <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Fälligkeit wählen
        </span>
        <button
          type="button"
          onClick={onClose}
          style={{ border: 'none', background: 'transparent', color: '#94a3b8', cursor: 'pointer', padding: 0 }}
        >
          <X size={12} />
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
        {presets.map(p => {
          const isSelected = currentDueDate === p.date;
          return (
            <button
              key={p.label}
              type="button"
              onClick={() => {
                onSelectDueDate(p.date);
                onClose();
              }}
              style={{
                border: isSelected ? `1.5px solid ${p.color}` : '1px solid transparent',
                background: isSelected ? p.bg : 'transparent',
                color: isSelected ? p.color : '#0f172a',
                padding: '5px 8px',
                borderRadius: '7px',
                fontSize: '0.70rem',
                fontWeight: isSelected ? 800 : 650,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'all 0.12s ease'
              }}
              onMouseEnter={(e) => {
                if (!isSelected) e.currentTarget.style.background = '#f8fafc';
              }}
              onMouseLeave={(e) => {
                if (!isSelected) e.currentTarget.style.background = 'transparent';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <p.icon size={11} color={isSelected ? p.color : '#64748b'} />
                <span>{p.label}</span>
              </div>
              {isSelected && <Check size={11} color={p.color} strokeWidth={2.5} />}
            </button>
          );
        })}

        <div style={{ padding: '4px 6px', borderTop: '1px solid #f1f5f9', marginTop: '2px' }}>
          <input
            type="date"
            value={currentDueDate || ''}
            onChange={(e) => {
              if (e.target.value) {
                onSelectDueDate(e.target.value);
                onClose();
              }
            }}
            style={{
              width: '100%',
              fontSize: '0.68rem',
              fontWeight: 650,
              padding: '4px 6px',
              borderRadius: '6px',
              border: '1px solid #e2e8f0',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {currentDueDate && (
          <button
            type="button"
            onClick={() => {
              onSelectDueDate(null);
              onClose();
            }}
            style={{
              border: 'none',
              background: 'transparent',
              color: '#dc2626',
              padding: '4px 8px',
              borderRadius: '6px',
              fontSize: '0.66rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              justifyContent: 'center'
            }}
          >
            <Trash2 size={10} />
            <span>Datum entfernen</span>
          </button>
        )}
      </div>
    </div>
  );
};

// =========================================================================
// SUB-COMPONENT: Inline Student Assigner Popover
// =========================================================================
interface InlineStudentPickerPopoverProps {
  currentStudentId?: string | number | null;
  students: any[];
  onSelectStudent: (studentId: string | null, studentName: string | null) => void;
  onClose: () => void;
}

export const InlineStudentPickerPopover: React.FC<InlineStudentPickerPopoverProps> = ({
  currentStudentId,
  students,
  onSelectStudent,
  onClose
}) => {
  const [q, setQ] = useState('');
  const filtered = students.filter(s => {
    const name = (s.first_name || s.name || '').toLowerCase();
    const inst = (s.instrument || '').toLowerCase();
    return name.includes(q.toLowerCase()) || inst.includes(q.toLowerCase());
  });

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
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '2px 4px 4px 4px',
        borderBottom: '1px solid #f1f5f9'
      }}>
        <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Schüler zuweisen
        </span>
        <button
          type="button"
          onClick={onClose}
          style={{ border: 'none', background: 'transparent', color: '#94a3b8', cursor: 'pointer', padding: 0 }}
        >
          <X size={12} />
        </button>
      </div>

      <input
        autoFocus
        type="text"
        placeholder="Schüler suchen..."
        value={q}
        onChange={(e) => setQ(e.target.value)}
        style={{
          width: '100%',
          fontSize: '0.70rem',
          padding: '4px 6px',
          borderRadius: '6px',
          border: '1px solid #e2e8f0',
          outline: 'none',
          boxSizing: 'border-box'
        }}
      />

      <div style={{ maxHeight: '160px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }} className="custom-scrollbar">
        {filtered.map(s => {
          const isSelected = String(currentStudentId) === String(s.id);
          const fName = maskStudentName(s.first_name || s.name) || 'Schüler';
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                onSelectStudent(String(s.id), s.first_name || s.name);
                onClose();
              }}
              style={{
                border: isSelected ? '1.5px solid #166534' : '1px solid transparent',
                background: isSelected ? '#e6f4ea' : 'transparent',
                color: isSelected ? '#166534' : '#0f172a',
                padding: '4px 8px',
                borderRadius: '6px',
                fontSize: '0.70rem',
                fontWeight: isSelected ? 800 : 650,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                textAlign: 'left'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  background: isSelected ? '#166534' : '#f1f5f9',
                  color: isSelected ? '#ffffff' : '#64748b',
                  fontSize: '0.60rem',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {fName[0] || 'S'}
                </div>
                <span>{fName}</span>
              </div>
              <span style={{ fontSize: '0.60rem', color: '#94a3b8' }}>{s.instrument || ''}</span>
            </button>
          );
        })}
      </div>

      {currentStudentId && (
        <button
          type="button"
          onClick={() => {
            onSelectStudent(null, null);
            onClose();
          }}
          style={{
            border: 'none',
            background: 'transparent',
            color: '#dc2626',
            padding: '4px 8px',
            borderRadius: '6px',
            fontSize: '0.66rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            justifyContent: 'center',
            borderTop: '1px solid #f1f5f9',
            marginTop: '2px'
          }}
        >
          <X size={10} />
          <span>Zuweisung aufheben</span>
        </button>
      )}
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
// SUB-COMPONENT: Single Note Card Item (Kanban & Student Cards)
// =========================================================================
interface NoteCardItemProps {
  note: UserNote;
  columnId?: string;
  allStudents?: any[];
  hideStudentBadge?: boolean;
  isFocused?: boolean;
  isDragging?: boolean;
  hasTresorStorage?: boolean;
  playingAudioNoteId?: string | null;
  onTogglePlayAudio?: (noteId: string, audioUrl: string) => void;
  isSelectedRow?: boolean;
  onToggleSelectRow?: () => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  onDragOverCard?: (e: React.DragEvent, position: 'above' | 'below') => void;
  onDropOnCard?: (e: React.DragEvent, position: 'above' | 'below') => void;
  dragOverIndicator?: 'above' | 'below' | null;
  activeTagPickerNoteId: string | null;
  onOpenTagPicker: (id: string | null) => void;
  onSelectTag: (tag: string) => void;
  activeDueDatePickerNoteId?: string | null;
  onOpenDueDatePicker?: (id: string | null) => void;
  onSelectDueDate?: (dateStr: string | null) => void;
  activeStudentPickerNoteId?: string | null;
  onOpenStudentPicker?: (id: string | null) => void;
  onSelectStudent?: (studentId: string | null, studentName: string | null) => void;
  onUpdateContent: (content: string) => void;
  onToggleComplete: () => void;
  onTogglePin: () => void;
  onDelete: () => void;
  onSyncToHomework?: () => void;
  onUnsyncFromHomework?: () => void;
  onOpenHomeworkModal?: (student: any) => void;
}

export const NoteCardItem: React.FC<NoteCardItemProps> = ({
  note,
  columnId,
  allStudents = [],
  hideStudentBadge = false,
  isFocused = false,
  isDragging = false,
  hasTresorStorage = false,
  playingAudioNoteId,
  onTogglePlayAudio,
  onDragStart,
  onDragEnd,
  onDragOverCard,
  onDropOnCard,
  dragOverIndicator,
  activeTagPickerNoteId,
  onOpenTagPicker,
  onSelectTag,
  activeDueDatePickerNoteId,
  onOpenDueDatePicker,
  onSelectDueDate,
  activeStudentPickerNoteId,
  onOpenStudentPicker,
  onSelectStudent,
  onUpdateContent,
  onToggleComplete,
  onTogglePin,
  onDelete,
  onSyncToHomework,
  onUnsyncFromHomework,
  onOpenHomeworkModal
}) => {
  const isTagPickerOpen = activeTagPickerNoteId === note.id;
  const isDuePickerOpen = activeDueDatePickerNoteId === note.id;
  const isStudentPickerOpen = activeStudentPickerNoteId === note.id;

  // Filter out redundant '#To-Do' tag if inside To-Do column unless it has other tags
  const visibleTags = (note.tags || []).filter(t => columnId === 'todos' ? t.toLowerCase() !== '#to-do' : true);
  const primaryTag = visibleTags.length > 0 ? visibleTags[0] : null;
  const tagStyle = primaryTag ? getAllTagStyle(primaryTag) : null;

  // Overdue calculation
  const dueInfo = formatDueDateBadge(note.due_date);
  const isOverdue = dueInfo.isOverdue && !note.is_completed;

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

  const isSharedWithHomework = note.visibility === 'student_shared' || (note.tags || []).includes('#Hausaufgabe');
  const showStudentPill = (note.student_name || note.student_id) && !hideStudentBadge;
  const showHomeworkPill = isSharedWithHomework || showStudentPill;

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
        border: isFocused 
          ? '1.5px solid #0f172a' 
          : isOverdue 
            ? '1px solid #fca5a5' 
            : '1px solid rgba(226, 232, 240, 0.85)',
        borderLeft: isOverdue ? '3px solid #dc2626' : undefined,
        borderRadius: '12px',
        padding: '7px 9px',
        display: 'flex',
        flexDirection: 'column',
        gap: '3px',
        boxShadow: isFocused
          ? '0 0 0 2px #0f172a, 0 6px 18px -4px rgba(15, 23, 42, 0.12)'
          : isDragging 
            ? '0 10px 24px -4px rgba(0,0,0,0.16)'
            : '0 1px 3px rgba(0,0,0,0.02), inset 0 1px 0 rgba(255, 255, 255, 0.95)',
        position: 'relative',
        zIndex: (isTagPickerOpen || isDuePickerOpen || isStudentPickerOpen) ? 9999 : 1,
        opacity: isDragging ? 0.5 : 1,
        transform: isDragging ? 'scale(1.01) rotate(-0.5deg)' : 'none',
        cursor: isEditing ? 'default' : 'grab',
        transition: 'all 0.15s cubic-bezier(0.16, 1, 0.3, 1)'
      }}
      className="hover-scale-mini virtual-render-item"
    >
      {/* Insert Indicator Bar */}
      {dragOverIndicator === 'above' && (
        <div style={{
          position: 'absolute',
          top: '-4px',
          left: '4px',
          right: '4px',
          height: '2.5px',
          background: '#0f172a',
          borderRadius: '100px',
          boxShadow: '0 0 6px rgba(15, 23, 42, 0.35)',
          zIndex: 100
        }} />
      )}
      {dragOverIndicator === 'below' && (
        <div style={{
          position: 'absolute',
          bottom: '-4px',
          left: '4px',
          right: '4px',
          height: '2.5px',
          background: '#0f172a',
          borderRadius: '100px',
          boxShadow: '0 0 6px rgba(15, 23, 42, 0.35)',
          zIndex: 100
        }} />
      )}

      {/* Top / Main Meta row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', flex: 1, minWidth: 0 }}>
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
            marginTop: '1.5px',
            display: 'flex',
            flexShrink: 0,
            transition: 'transform 0.18s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
          }}
          className="hover-scale"
        >
          {note.is_completed ? <CheckCircle2 size={13.5} /> : <Circle size={13.5} />}
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Compact Student badge & 1-Klick Sichtbarkeits-Toggle */}
          {showHomeworkPill && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px', flexWrap: 'wrap' }}>
              {showStudentPill && (
                <span style={{
                  fontSize: '0.60rem',
                  fontWeight: 800,
                  color: '#166534',
                  background: '#e6f4ea',
                  border: '1px solid #bbf7d0',
                  padding: '0.5px 5px',
                  borderRadius: '6px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '2.5px'
                }}>
                  <User size={8.5} />
                  <span>{maskStudentName(note.student_name)}</span>
                </span>
              )}

              {/* 1-Klick Toggle */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (isSharedWithHomework) {
                    if (onUnsyncFromHomework) onUnsyncFromHomework();
                  } else {
                    if (onSyncToHomework) onSyncToHomework();
                  }
                }}
                title={
                  isSharedWithHomework
                    ? 'Im Aufgabenheft aktiv (Klicken für privat)'
                    : 'Privat für Lehrkraft (Klicken für Aufgabenheft)'
                }
                style={{
                  border: isSharedWithHomework ? '1px solid #86efac' : '1px solid #e2e8f0',
                  background: isSharedWithHomework ? '#f0fdf4' : '#ffffff',
                  color: isSharedWithHomework ? '#166534' : '#64748b',
                  padding: '0.5px 5px',
                  borderRadius: '6px',
                  fontSize: '0.58rem',
                  fontWeight: 750,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '2.5px',
                  transition: 'all 0.15s ease'
                }}
              >
                {isSharedWithHomework ? (
                  <>
                    <BookOpen size={8.5} color="#16a34a" />
                    <span>Im Heft</span>
                  </>
                ) : (
                  <>
                    <Lock size={8.5} color="#64748b" />
                    <span>Privat</span>
                  </>
                )}
              </button>
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
                fontSize: '0.76rem',
                fontWeight: 550,
                border: '1px solid #3b82f6',
                borderRadius: '4px',
                padding: '1px 4px',
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
                fontSize: '0.76rem',
                color: note.is_completed ? '#94a3b8' : '#0f172a',
                textDecoration: note.is_completed ? 'line-through' : 'none',
                fontWeight: 550,
                lineHeight: 1.35,
                wordBreak: 'break-word',
                cursor: 'text'
              }}
            >
              {cleanDisplayContent}
            </div>
          )}

          {/* 🎙️ Audio Waveform Player Badge (Audio-Tresor Gated) */}
          {hasTresorStorage && note.audio_url && (
            <div style={{ marginTop: '3px' }}>
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  if (onTogglePlayAudio) onTogglePlayAudio(note.id, note.audio_url!);
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  background: playingAudioNoteId === note.id ? '#f0fdf4' : '#f8fafc',
                  border: `1px solid ${playingAudioNoteId === note.id ? '#86efac' : '#e2e8f0'}`,
                  borderRadius: '16px',
                  padding: '1px 6px',
                  fontSize: '0.62rem',
                  fontWeight: 750,
                  color: playingAudioNoteId === note.id ? '#166534' : '#0f172a',
                  cursor: 'pointer',
                  width: 'fit-content'
                }}
                title="Sprachnotiz abspielen (Audio-Tresor)"
              >
                {playingAudioNoteId === note.id ? <Pause size={9} color="#166534" /> : <Play size={9} color="#0f172a" />}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5px', height: '9px' }}>
                  <div style={{ width: '1.5px', height: playingAudioNoteId === note.id ? '9px' : '4px', background: 'currentColor', borderRadius: '1px' }} />
                  <div style={{ width: '1.5px', height: playingAudioNoteId === note.id ? '5px' : '7px', background: 'currentColor', borderRadius: '1px' }} />
                  <div style={{ width: '1.5px', height: playingAudioNoteId === note.id ? '9px' : '4px', background: 'currentColor', borderRadius: '1px' }} />
                  <div style={{ width: '1.5px', height: playingAudioNoteId === note.id ? '6px' : '3px', background: 'currentColor', borderRadius: '1px' }} />
                </div>
                <span>{note.audio_duration_seconds ? `${Math.floor(note.audio_duration_seconds / 60)}:${(note.audio_duration_seconds % 60).toString().padStart(2, '0')}` : '0:15'}</span>
              </div>
            </div>
          )}

          {/* Metadata badges: Room, Defect status */}
          {(note.room_id || note.note_type === 'room_issue') && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap', marginTop: '2px' }}>
              <span style={{ 
                fontSize: '0.60rem', 
                color: '#991b1b', 
                background: '#fee2e2', 
                border: '1px solid #fecaca', 
                borderRadius: '4px', 
                padding: '0.5px 4px', 
                fontWeight: 750, 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '2px' 
              }}>
                <DoorOpen size={8} color="#dc2626" />
                {note.room_id || 'Raum'}
              </span>
              {note.note_type === 'room_issue' && (
                note.is_completed || note.is_acknowledged ? (
                  <span style={{ 
                    fontSize: '0.60rem', 
                    color: '#166534', 
                    background: '#dcfce7', 
                    border: '1px solid #86efac', 
                    borderRadius: '4px', 
                    padding: '0.5px 4px', 
                    fontWeight: 800, 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    gap: '2px' 
                  }}>
                    <CheckCheck size={8} color="#16a34a" />
                    Behoben
                  </span>
                ) : (
                  <span style={{ 
                    fontSize: '0.60rem', 
                    color: '#991b1b', 
                    background: '#fee2e2', 
                    border: '1px solid #fca5a5', 
                    borderRadius: '4px', 
                    padding: '0.5px 4px', 
                    fontWeight: 800, 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    gap: '2px' 
                  }}>
                    <Send size={8} color="#dc2626" />
                    An Sekretariat
                  </span>
                )
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer / Meta Actions (Micro Slim) */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: '1px',
        paddingTop: '3px',
        borderTop: '1px solid #f8fafc',
        gap: '4px'
      }}>
        {/* Left: Tag Button & Due Date Pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '3px', position: 'relative' }}>
          {tagStyle ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenTagPicker(isTagPickerOpen ? null : note.id);
              }}
              style={{
                border: `1px solid ${tagStyle.border}`,
                background: tagStyle.bg,
                color: tagStyle.color,
                padding: '1px 6px',
                borderRadius: '5px',
                fontSize: '0.60rem',
                fontWeight: 750,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px'
              }}
            >
              <span>{renderMonochromeTagIcon(tagStyle.iconName, 9, tagStyle.color)}</span>
              <span>{tagStyle.label}</span>
              <ChevronDown size={8} opacity={0.7} />
            </button>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenTagPicker(isTagPickerOpen ? null : note.id);
              }}
              style={{
                border: '1px dashed #cbd5e1',
                background: '#ffffff',
                color: '#94a3b8',
                padding: '1px 5px',
                borderRadius: '5px',
                fontSize: '0.58rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '2px'
              }}
            >
              <Plus size={8} />
              <span>Tag</span>
            </button>
          )}

          {/* Due date badge with popover trigger */}
          {note.due_date && (
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onOpenDueDatePicker) onOpenDueDatePicker(isDuePickerOpen ? null : note.id);
                }}
                style={{
                  border: 'none',
                  background: dueInfo.isOverdue ? '#fee2e2' : dueInfo.isToday ? '#fef3c7' : '#eff6ff',
                  color: dueInfo.isOverdue ? '#991b1b' : dueInfo.isToday ? '#92400e' : '#1e40af',
                  padding: '1px 5px',
                  borderRadius: '5px',
                  fontSize: '0.58rem',
                  fontWeight: 750,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '2px'
                }}
              >
                <Calendar size={7.5} />
                <span>{dueInfo.label}</span>
              </button>

              {isDuePickerOpen && onSelectDueDate && (
                <InlineDueDatePickerPopover
                  currentDueDate={note.due_date}
                  onSelectDueDate={onSelectDueDate}
                  onClose={() => onOpenDueDatePicker && onOpenDueDatePicker(null)}
                />
              )}
            </div>
          )}

          {/* 2-Spalten Apple Popover Category Tag Picker */}
          {isTagPickerOpen && (
            <CategoryTagPickerPopover
              note={note}
              onSelectTag={onSelectTag}
              onClose={() => onOpenTagPicker(null)}
            />
          )}
        </div>

        {/* Right: Quick Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
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
              padding: '1.5px',
              display: 'flex'
            }}
          >
            <Pin size={10} />
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
              padding: '1.5px',
              display: 'flex'
            }}
          >
            <Trash2 size={10} />
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
  hasTresorStorage = false,
  playingAudioNoteId,
  onTogglePlayAudio,
  isSelectedRow = false,
  onToggleSelectRow,
  activeTagPickerNoteId,
  onOpenTagPicker,
  onSelectTag,
  activeDueDatePickerNoteId,
  onOpenDueDatePicker,
  onSelectDueDate,
  activeStudentPickerNoteId,
  onOpenStudentPicker,
  onSelectStudent,
  onUpdateContent,
  onToggleComplete,
  onTogglePin,
  onDelete,
  onSyncToHomework,
  onUnsyncFromHomework,
  onOpenHomeworkModal
}) => {
  const isTagPickerOpen = activeTagPickerNoteId === note.id;
  const isDuePickerOpen = activeDueDatePickerNoteId === note.id;
  const isStudentPickerOpen = activeStudentPickerNoteId === note.id;

  const primaryTag = (note.tags && note.tags.length > 0) ? note.tags[0] : null;
  const tagStyle = primaryTag ? getAllTagStyle(primaryTag) : null;
  const dueInfo = formatDueDateBadge(note.due_date);

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
        gridTemplateColumns: '32px 40px 1fr 180px 180px 140px 110px',
        padding: '8px 16px',
        borderBottom: '1px solid #f1f5f9',
        alignItems: 'center',
        fontSize: '0.78rem',
        background: isSelectedRow ? '#eff6ff' : isFocused ? '#f8fafc' : 'transparent',
        boxShadow: isSelectedRow ? 'inset 2px 0 0 #3b82f6' : 'none',
        position: 'relative',
        zIndex: (isTagPickerOpen || isDuePickerOpen || isStudentPickerOpen) ? 9999 : 1,
        transition: 'background 0.12s ease'
      }}
      className="hover-bg-slate"
    >
      {/* 0. Row Selection Checkbox */}
      <div>
        <input
          type="checkbox"
          checked={isSelectedRow}
          onChange={onToggleSelectRow}
          style={{ cursor: 'pointer' }}
        />
      </div>

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

      {/* 2. Content (Clean NLP Text + Inline Edit + Audio-Memo Waveform) */}
      <div style={{ minWidth: 0, paddingRight: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
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
              cursor: 'text',
              flex: 1
            }}
          >
            {cleanDisplayContent}
          </div>
        )}

        {/* Audio-Tresor Waveform Badge */}
        {hasTresorStorage && note.audio_url && (
          <div
            onClick={(e) => {
              e.stopPropagation();
              if (onTogglePlayAudio) onTogglePlayAudio(note.id, note.audio_url!);
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              background: playingAudioNoteId === note.id ? '#f0fdf4' : '#f8fafc',
              border: `1px solid ${playingAudioNoteId === note.id ? '#86efac' : '#e2e8f0'}`,
              borderRadius: '12px',
              padding: '1px 6px',
              fontSize: '0.62rem',
              fontWeight: 750,
              color: playingAudioNoteId === note.id ? '#166534' : '#0f172a',
              cursor: 'pointer',
              flexShrink: 0
            }}
            title="Sprachnotiz abspielen"
          >
            {playingAudioNoteId === note.id ? <Pause size={9} color="#166534" /> : <Play size={9} color="#0f172a" />}
            <span>{note.audio_duration_seconds ? `${Math.floor(note.audio_duration_seconds / 60)}:${(note.audio_duration_seconds % 60).toString().padStart(2, '0')}` : '0:15'}</span>
          </div>
        )}
      </div>

      {/* 3. Student / Context & 1-Klick Sichtbarkeits-Toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', position: 'relative' }}>
        {note.student_name ? (
          <>
            <span
              onClick={() => onOpenStudentPicker && onOpenStudentPicker(isStudentPickerOpen ? null : note.id)}
              style={{
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
                boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                cursor: 'pointer'
              }}
              title="Schüler ändern / aufheben"
            >
              <User size={10} />
              <span>{maskStudentName(note.student_name)}</span>
            </span>

            {/* 1-Klick Toggle */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (note.visibility === 'student_shared' || (note.tags || []).includes('#Hausaufgabe')) {
                  if (onUnsyncFromHomework) onUnsyncFromHomework();
                } else {
                  if (onSyncToHomework) onSyncToHomework();
                }
              }}
              title={
                note.visibility === 'student_shared' || (note.tags || []).includes('#Hausaufgabe')
                  ? 'Im Aufgabenheft aktiv (Klicken für privat)'
                  : 'Privat für Lehrkraft (Klicken für Aufgabenheft)'
              }
              style={{
                border: (note.visibility === 'student_shared' || (note.tags || []).includes('#Hausaufgabe'))
                  ? '1px solid #86efac'
                  : '1px solid #cbd5e1',
                background: (note.visibility === 'student_shared' || (note.tags || []).includes('#Hausaufgabe'))
                  ? '#f0fdf4'
                  : '#ffffff',
                color: (note.visibility === 'student_shared' || (note.tags || []).includes('#Hausaufgabe'))
                  ? '#166534'
                  : '#64748b',
                padding: '2px 6px',
                borderRadius: '100px',
                fontSize: '0.60rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '2px'
              }}
            >
              {(note.visibility === 'student_shared' || (note.tags || []).includes('#Hausaufgabe')) ? (
                <BookOpen size={9} color="#16a34a" />
              ) : (
                <Lock size={9} color="#64748b" />
              )}
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => onOpenStudentPicker && onOpenStudentPicker(isStudentPickerOpen ? null : note.id)}
            style={{
              border: 'none',
              background: 'transparent',
              color: '#94a3b8',
              fontSize: '0.70rem',
              cursor: 'pointer',
              padding: '2px 4px',
              borderRadius: '4px'
            }}
            title="Schüler zuweisen"
          >
            + Zuweisen
          </button>
        )}

        {isStudentPickerOpen && onSelectStudent && (
          <InlineStudentPickerPopover
            currentStudentId={note.student_id}
            students={allStudents}
            onSelectStudent={onSelectStudent}
            onClose={() => onOpenStudentPicker && onOpenStudentPicker(null)}
          />
        )}
      </div>

      {/* 4. Tag Button with Colored Border */}
      <div style={{ position: 'relative' }}>
        {tagStyle ? (
          <button
            type="button"
            onClick={() => onOpenTagPicker(isTagPickerOpen ? null : note.id)}
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
            onClick={() => onOpenTagPicker(isTagPickerOpen ? null : note.id)}
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
        {isTagPickerOpen && (
          <CategoryTagPickerPopover
            note={note}
            columnId={note.student_id || note.student_name ? 'students' : 'todos'}
            onSelectTag={onSelectTag}
            onClose={() => onOpenTagPicker(null)}
          />
        )}
      </div>

      {/* 5. Due Date (Clickable Popover) */}
      <div style={{ position: 'relative' }}>
        {note.due_date ? (
          <button
            type="button"
            onClick={() => onOpenDueDatePicker && onOpenDueDatePicker(isDuePickerOpen ? null : note.id)}
            style={{
              border: 'none',
              background: dueInfo.isOverdue ? '#fee2e2' : dueInfo.isToday ? '#fef3c7' : '#f1f5f9',
              color: dueInfo.isOverdue ? '#991b1b' : dueInfo.isToday ? '#92400e' : '#475569',
              padding: '2px 6px',
              borderRadius: '6px',
              fontSize: '0.68rem',
              fontWeight: 750,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px'
            }}
          >
            <Calendar size={10} />
            <span>{dueInfo.label}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onOpenDueDatePicker && onOpenDueDatePicker(isDuePickerOpen ? null : note.id)}
            style={{
              border: 'none',
              background: 'transparent',
              color: '#94a3b8',
              fontSize: '0.70rem',
              cursor: 'pointer',
              padding: '2px 4px',
              borderRadius: '4px'
            }}
          >
            + Datum
          </button>
        )}

        {isDuePickerOpen && onSelectDueDate && (
          <InlineDueDatePickerPopover
            currentDueDate={note.due_date}
            onSelectDueDate={onSelectDueDate}
            onClose={() => onOpenDueDatePicker && onOpenDueDatePicker(null)}
          />
        )}
      </div>

      {/* 6. Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
        <button
          type="button"
          onClick={onTogglePin}
          title={note.is_pinned ? 'Lösen' : 'Anpinnen'}
          style={{
            border: 'none',
            background: 'transparent',
            color: note.is_pinned ? '#0f172a' : '#cbd5e1',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex'
          }}
        >
          <Pin size={12} />
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
            padding: '4px',
            display: 'flex'
          }}
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
};
