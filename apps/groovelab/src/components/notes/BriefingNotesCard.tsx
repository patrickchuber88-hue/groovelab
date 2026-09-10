import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { 
  Edit3, 
  Mic, 
  Search, 
  Check, 
  CheckCheck, 
  Circle, 
  CheckCircle2, 
  Plus, 
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
  Square, 
  Lock, 
  User, 
  Sparkles, 
  Calendar, 
  Layers, 
  Archive, 
  Hash, 
  DoorOpen, 
  Music, 
  AlertTriangle, 
  Zap, 
  CheckSquare, 
  ChevronDown, 
  Clock 
} from 'lucide-react';
import { useNotes } from '../../hooks/useNotes';
import { useVoiceToText } from '../../hooks/useVoiceToText';
import { checkIsAudioTresorActive } from '../../domain/stickersAndTresor';
import { UserNote, maskStudentName } from '../../services/notesService';
import { supabase } from '../../lib/supabase';
import { acquireAudioStream, releaseAudioStream } from '../../services/audioPermissionService';
import {
  TagDefinition,
  STUDENT_SKILL_TAGS,
  TEACHER_ORGANIZATION_TAGS,
  COMMON_TAGS,
  QUICK_SNIPPETS,
  renderMonochromeTagIcon,
  getAllTagStyle,
  formatCleanNoteContent,
  formatDueDateBadge,
  resolveCleanInstrument,
  getQuickDate
} from './notesConstants';
import { 
  TeacherNotesBoardModal, 
  CategoryTagPickerPopover 
} from './TeacherNotesBoardModal';

const getTagBadgeStyle = (tag: string) => {
  return getAllTagStyle(tag);
};

export const INSTRUMENT_SYNONYMS: Record<string, string[]> = {
  klavier: ['klavier', 'piano', 'e-piano', 'flügel', 'fluegel', 'synth', 'tasten', 'digitalpiano', 'epiano', 'clavinova', 'keyboard', 'rhodes'],
  piano: ['klavier', 'piano', 'e-piano', 'flügel', 'fluegel', 'synth', 'tasten', 'digitalpiano', 'epiano', 'clavinova', 'keyboard', 'rhodes'],
  epiano: ['e-piano', 'epiano', 'digitalpiano', 'clavinova', 'stagepiano', 'keyboard', 'synthesizer'],
  fluegel: ['flügel', 'fluegel', 'konzertflügel', 'fluegel', 'steinway', 'yamaha'],
  flügel: ['flügel', 'fluegel', 'konzertflügel', 'fluegel', 'steinway', 'yamaha'],
  drum: ['drum', 'schlagzeug', 'e-drum', 'edrum', 'snare', 'becken', 'cajon', 'hihat', 'percussion', 'tom', 'kick', 'beckenset'],
  schlagzeug: ['drum', 'schlagzeug', 'e-drum', 'edrum', 'snare', 'becken', 'cajon', 'hihat', 'percussion', 'tom', 'kick', 'beckenset'],
  edrum: ['e-drum', 'edrum', 'roland drum', 'alesis', 'mesh', 'drum'],
  gitarre: ['gitarre', 'guitar', 'e-gitarre', 'westerngitarre', 'konzertgitarre', 'akustikgitarre', 'bass', 'e-bass', 'ukulele', 'strat'],
  guitar: ['gitarre', 'guitar', 'e-gitarre', 'westerngitarre', 'konzertgitarre', 'akustikgitarre', 'bass', 'e-bass', 'ukulele', 'strat'],
  bass: ['bass', 'e-bass', 'kontrabass', 'akustikbass', 'precision', 'jazzbass'],
  amp: ['amp', 'verstärker', 'verstaerker', 'box', 'combo', 'speaker', 'pa', 'mischpult', 'lautsprecher', 'marshall', 'fender', 'roland'],
  mic: ['mikrofon', 'mic', 'micro', 'shure', 'rode', 'funkmikro', 'gesangsmikro'],
  kabel: ['kabel', 'klinkenkabel', 'xlr', 'stromkabel', 'netzteil', 'adapter', 'patchkabel'],
  staender: ['ständer', 'staender', 'notenständer', 'gitarrenständer', 'mikrofonständer', 'keyboardständer'],
  ständer: ['ständer', 'staender', 'notenständer', 'gitarrenständer', 'mikrofonständer', 'keyboardständer']
};

interface BriefingNotesCardProps {
  user: any;
  schoolId?: number | string;
  activeStudent?: any;
  allStudents?: any[];
  todayStudents?: any[];
  rooms?: any[];
  onOpenDrawer?: () => void;
  onOpenHomeworkModal?: (student: any) => void;
}

export const BriefingNotesCard: React.FC<BriefingNotesCardProps> = ({
  user,
  schoolId,
  activeStudent,
  allStudents = [],
  todayStudents = [],
  rooms = [],
  onOpenDrawer,
  onOpenHomeworkModal
}) => {
  const {
    notes,
    filteredNotes,
    searchQuery,
    setSearchQuery,
    createNote,
    updateNote,
    acknowledgeNote,
    deleteNote,
    togglePin,
    toggleCompleteTodo,
    dismissRoomIssueForTeacher,
    resolveRoomIssue,
    toggleArchive,
    syncToHomeworkBook,
    unsyncFromHomeworkBook,
    dueAlerts,
    saveStatus
  } = useNotes({ user, schoolId, activeStudent });

  const [selectedRoomIssueNote, setSelectedRoomIssueNote] = useState<UserNote | null>(null);

  const [internalRooms, setInternalRooms] = useState<any[]>([]);
  const [internalEquipment, setInternalEquipment] = useState<any[]>([]);
  const [roomSegmentTab, setRoomSegmentTab] = useState<'all' | 'equipment' | 'rooms'>('all');

  useEffect(() => {
    const effectiveSchoolId = schoolId || user?.school_id || (user as any)?.schoolId;
    if (!effectiveSchoolId) return;

    let isMounted = true;
    const loadRoomsAndEquipment = async () => {
      try {
        const [roomsRes, eqRes] = await Promise.all([
          supabase
            .from('rooms')
            .select('id, name, floor, building_id, max_students, equipment, room_instruments, is_campus_active, is_groovelab_active')
            .eq('school_id', effectiveSchoolId)
            .order('sort_order', { ascending: true }),
          supabase
            .from('school_equipment')
            .select('*')
            .eq('school_id', effectiveSchoolId)
            .order('name', { ascending: true })
        ]);

        if (roomsRes.data && isMounted && roomsRes.data.length > 0) {
          setInternalRooms(roomsRes.data);
        }
        if (eqRes.data && isMounted && eqRes.data.length > 0) {
          setInternalEquipment(eqRes.data);
        }
      } catch (err) {
        console.warn('Could not load rooms or equipment for notes autocomplete:', err);
      }
    };
    loadRoomsAndEquipment();
    return () => { isMounted = false; };
  }, [schoolId, user]);

  // Resilient Session-backed state: stays open even across parent background data fetches & re-renders!
  const [showBoardModal, setShowBoardModalState] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('campus_notes_board_open') === 'true';
    }
    return false;
  });

  const setShowBoardModal = useCallback((open: boolean) => {
    setShowBoardModalState(open);
    if (typeof window !== 'undefined') {
      if (open) {
        sessionStorage.setItem('campus_notes_board_open', 'true');
      } else {
        sessionStorage.removeItem('campus_notes_board_open');
      }
    }
  }, []);

  useEffect(() => {
    const handleOpen = () => setShowBoardModal(true);
    const handleClose = () => setShowBoardModal(false);
    window.addEventListener('campus_open_notes_board', handleOpen);
    window.addEventListener('campus_close_notes_board', handleClose);
    return () => {
      window.removeEventListener('campus_open_notes_board', handleOpen);
      window.removeEventListener('campus_close_notes_board', handleClose);
    };
  }, [setShowBoardModal]);
  const [activeTagPickerNoteId, setActiveTagPickerNoteId] = useState<string | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteText, setEditingNoteText] = useState<string>('');
  const [inputContent, setInputContent] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [filterMode, setFilterMode] = useState<'all' | 'todos' | 'homework' | 'pinned' | 'archived'>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [syncedIds, setSyncedIds] = useState<Set<string>>(new Set());
  const [showQuickTemplates, setShowQuickTemplates] = useState(false);

  // 📅 Due Date State
  const [selectedDueDate, setSelectedDueDate] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);

  // ⏱️ WebAudio Precision Metronome State
  const [activeMetronomeBpm, setActiveMetronomeBpm] = useState<number | null>(null);
  const metronomeIntervalRef = useRef<any>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // 🔍 Typeahead / Autocomplete State (@, #, !, /)
  const [autocompleteType, setAutocompleteType] = useState<'student' | 'tag' | 'room' | 'macro' | null>(null);
  const [autocompleteQuery, setAutocompleteQuery] = useState<string>('');
  const [suggestionIndex, setSuggestionIndex] = useState<number>(0);

  // 🎙️ Audio Recording State
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [audioSeconds, setAudioSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [showTresorLockPrompt, setShowTresorLockPrompt] = useState(false);
  const [recentlyCompletedIds, setRecentlyCompletedIds] = useState<string[]>([]);
  const [showTodayQuickPeek, setShowTodayQuickPeek] = useState(false);

  const textareaRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const quickPeekRef = useRef<HTMLDivElement | null>(null);
  const templatesPopoverRef = useRef<HTMLDivElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const hasTresor = checkIsAudioTresorActive(user);

  // Close Quick-Peek on Click-Outside or Escape
  useEffect(() => {
    if (!showTodayQuickPeek) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (quickPeekRef.current && !quickPeekRef.current.contains(e.target as Node)) {
        setShowTodayQuickPeek(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowTodayQuickPeek(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showTodayQuickPeek]);

  // Close Quick-Templates Popover on Click-Outside or Escape
  useEffect(() => {
    if (!showQuickTemplates) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (templatesPopoverRef.current && !templatesPopoverRef.current.contains(e.target as Node)) {
        setShowQuickTemplates(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowQuickTemplates(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showQuickTemplates]);

  // Helper to insert smart syntax or preset templates into the input field
  const handleInsertSyntax = (prefix: string, templateType?: 'student' | 'tag' | 'room' | 'macro' | null, fullText?: string) => {
    if (fullText) {
      setInputContent(fullText);
      if (templateType) {
        setAutocompleteType(templateType);
        setAutocompleteQuery('');
      } else {
        setAutocompleteType(null);
      }
    } else {
      setInputContent(prev => {
        const trimmed = prev.trim();
        if (!trimmed) return prefix;
        if (trimmed.endsWith(prefix.trim())) return prev;
        return `${trimmed} ${prefix}`;
      });
      if (templateType) {
        setAutocompleteType(templateType);
        setAutocompleteQuery('');
      }
    }
    setShowQuickTemplates(false);
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }, 50);
  };

  // 1.5s Micro-Interaction for Checkbox completion
  const handleWidgetToggleComplete = (noteId: string, currentCompleted: boolean) => {
    if (!currentCompleted) {
      setRecentlyCompletedIds(prev => [...prev, noteId]);
      setTimeout(async () => {
        await toggleCompleteTodo(noteId);
        setRecentlyCompletedIds(prev => prev.filter(id => id !== noteId));
      }, 1500);
    } else {
      toggleCompleteTodo(noteId);
      setRecentlyCompletedIds(prev => prev.filter(id => id !== noteId));
    }
  };

  // WebAudio Metronome Control
  const toggleMetronome = (bpm: number) => {
    if (activeMetronomeBpm === bpm) {
      stopMetronome();
      return;
    }
    stopMetronome();
    setActiveMetronomeBpm(bpm);
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const playClick = (accent: boolean) => {
        try {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(accent ? 980 : 680, ctx.currentTime);
          gain.gain.setValueAtTime(0.25, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.09);
        } catch {}
      };

      let beat = 0;
      playClick(true);
      const intervalMs = (60 / bpm) * 1000;
      metronomeIntervalRef.current = setInterval(() => {
        beat = (beat + 1) % 4;
        playClick(beat === 0);
      }, intervalMs);
    } catch (e) {
      console.warn('Metronome error:', e);
    }
  };

  const stopMetronome = () => {
    if (metronomeIntervalRef.current) {
      clearInterval(metronomeIntervalRef.current);
      metronomeIntervalRef.current = null;
    }
    setActiveMetronomeBpm(null);
  };

  // Adjust Textarea Height Dynamically
  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.max(54, textareaRef.current.scrollHeight)}px`;
    }
  };

  // Snapshot of text before dictation starts to eliminate interim accumulation stuttering
  const initialTextBeforeVoiceRef = useRef<string>('');

  // Live Voice-to-Text (SpeechRecognition)
  const { isListening, startListening, stopListening, resetTranscript } = useVoiceToText({
    onResult: (liveFormattedText) => {
      const base = initialTextBeforeVoiceRef.current;
      const cleanSpoken = liveFormattedText.trim();
      const next = base ? `${base} ${cleanSpoken}` : cleanSpoken;
      setInputContent(next);
      setTimeout(adjustTextareaHeight, 10);
    }
  });

  const handleToggleVoiceDictation = () => {
    if (isListening) {
      stopListening();
      initialTextBeforeVoiceRef.current = '';
    } else {
      initialTextBeforeVoiceRef.current = inputContent.trim();
      resetTranscript();
      startListening();
      showToast('🎙️ Live Diktat aktiv • Sprich frei');
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Strict MediaStream Cleanup
  const stopHardwareStream = () => {
    if (streamRef.current) {
      releaseAudioStream(streamRef.current);
      streamRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      stopHardwareStream();
      stopMetronome();
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        try { audioCtxRef.current.close(); } catch {}
      }
    };
  }, []);

  // Keyboard shortcut: Cmd+J / Ctrl+J to focus
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'j' || e.key === 'J')) {
        e.preventDefault();
        textareaRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // 1. Natural Language Entity Recognition (Apple Intelligence Style)
  const parsedIntent = useMemo(() => {
    const text = inputContent.trim();
    if (!text) return null;

    const lower = text.toLowerCase();

    // Student match:
    // Only link a student if:
    // 1. Explicit @mention is typed (e.g. '@Jonah'), OR
    // 2. A specific student's name is explicitly written in the text (e.g. 'Jonah soll ...')
    // Otherwise, it remains a 100% NEUTRAL GENERAL NOTE.
    let detectedStudent: any = null;
    const mentionMatch = text.match(/@([A-Za-z0-9äöüÄÖÜß.\s]+?)(?=[\s,;!#]|$)/);
    const candidatePool = (todayStudents && todayStudents.length > 0) ? todayStudents.concat(allStudents || []) : (allStudents || []);

    if (mentionMatch) {
      const q = mentionMatch[1].trim().toLowerCase();
      const match = candidatePool.find(s => {
        const fName = (s.first_name || s.name || '').toLowerCase();
        return fName.includes(q) || q.includes(fName);
      });
      if (match) detectedStudent = match;
    } else if (candidatePool.length > 0) {
      // Check if a specific student's first name is explicitly typed as a word
      for (const s of candidatePool) {
        const fName = (s.first_name || s.name?.split(' ')[0] || '').toLowerCase().trim();
        if (fName && fName.length >= 3) {
          const regex = new RegExp(`\\b${fName}\\b`, 'i');
          if (regex.test(lower)) {
            detectedStudent = s;
            break;
          }
        }
      }
    }

    // Natural Language Due Date parsing
    let naturalDueDate: string | null = selectedDueDate || null;
    if (!naturalDueDate) {
      if (lower.includes('bis freitag') || lower.includes('am freitag')) naturalDueDate = getQuickDate('friday');
      else if (lower.includes('übermorgen')) {
        const d = new Date(); d.setDate(d.getDate() + 2); naturalDueDate = d.toISOString().split('T')[0];
      }
      else if (lower.includes('morgen')) naturalDueDate = getQuickDate('tomorrow');
      else if (lower.includes('bis heute') || lower.includes('heute')) naturalDueDate = getQuickDate('today');
      else if (lower.includes('nächste woche') || lower.includes('in 1 woche')) naturalDueDate = getQuickDate('next_week');
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

    // Instrument & Room / Repair detection & extraction
    let detectedEquipmentName: string | null = null;
    let detectedRoomName: string | null = null;

    // 1. Check for combined format: !Instrument (Raum) or !Instrument or !Raum
    const rawInstrumentRoomMatch = text.match(/!([A-Za-z0-9äöüÄÖÜß_-]+(?:\s+(?:\d+|Nebenraum|Studio|Saal|Keller|EG|OG\s*\d*))?)(?:\s*\(([^)]+)\))?/i);
    if (rawInstrumentRoomMatch) {
      const capturedName = rawInstrumentRoomMatch[1].trim();
      const capturedRoom = rawInstrumentRoomMatch[2] ? rawInstrumentRoomMatch[2].trim() : null;
      const cleanCap = capturedName.toLowerCase();
      const isRoomPrefix = cleanCap.startsWith('raum') || cleanCap.startsWith('saal') || cleanCap.startsWith('studio') || cleanCap.startsWith('keller') || cleanCap.startsWith('eg') || cleanCap.startsWith('og') || cleanCap.startsWith('konzertsaal');
      const isRoomMatch = isRoomPrefix || (internalRooms || []).some((r: any) => (r.name || '').toLowerCase() === cleanCap);
      
      if (isRoomMatch) {
        detectedRoomName = capturedName.charAt(0).toUpperCase() + capturedName.slice(1);
      } else {
        detectedEquipmentName = capturedName;
        if (capturedRoom) {
          detectedRoomName = capturedRoom;
        }
      }
    }

    // 2. Room fallback
    if (!detectedRoomName) {
      const allR = (internalRooms && internalRooms.length > 0) ? internalRooms : (rooms || []);
      for (const r of allR) {
        const rName = typeof r === 'string' ? r : (r.name || '');
        if (rName && rName.length >= 3 && new RegExp(`\\b${rName}\\b`, 'i').test(text)) {
          detectedRoomName = rName;
          break;
        }
      }
    }

    if (!detectedRoomName) {
      const genericRoomMatch = text.match(/\b(Raum\s*\d+|Saal\s*\d*|Studio\s*\d*|Konzertsaal|Bandraum|Keller|EG|OG\s*\d*)\b/i);
      if (genericRoomMatch) {
        detectedRoomName = genericRoomMatch[1].trim();
      }
    }

    // 3. Equipment fallback
    if (!detectedEquipmentName && internalEquipment.length > 0) {
      for (const eq of internalEquipment) {
        const eqName = eq.name || '';
        if (eqName && eqName.length >= 3 && new RegExp(`\\b${eqName}\\b`, 'i').test(text)) {
          detectedEquipmentName = eqName;
          break;
        }
      }
    }

    const isEquipmentIssue = !!detectedEquipmentName;
    const isRoomIssue = isEquipmentIssue || !!detectedRoomName || 
                        lower.includes('raum') || 
                        lower.includes('saite') || 
                        lower.includes('kabel') || 
                        lower.includes('notenständer') ||
                        lower.includes('kaputt') ||
                        lower.includes('defekt') || 
                        lower.includes('stimmen') || 
                        lower.includes('mangel');

    // ToDo detection
    const isTodo = text.startsWith('- ') || text.startsWith('//') || text.startsWith('[ ]') || lower.startsWith('todo');

    return {
      detectedStudent,
      detectedRoomName,
      detectedEquipmentName,
      isEquipmentIssue,
      isHomework,
      bpm,
      isRoomIssue,
      isTodo,
      naturalDueDate
    };
  }, [inputContent, allStudents, todayStudents, selectedDueDate, rooms, internalRooms, internalEquipment]);

  // Autocomplete Suggestions List (Prioritizes Tagesplan Students)
  const suggestions = useMemo(() => {
    if (!autocompleteType) return [];
    const q = autocompleteQuery.toLowerCase().trim();

    if (autocompleteType === 'student') {
      const teacherInst = user?.instrument || 'Gitarre';
      
      // 1. Process today's students from Tagesplan
      const todayList = (todayStudents && todayStudents.length > 0) ? todayStudents : [];
      const mappedToday = todayList.map(s => {
        const fName = s.first_name || (s.name ? s.name.split(' ')[0] : 'Schüler');
        const lName = s.last_name || (s.name ? s.name.split(' ').slice(1).join(' ') : '');
        const maskedLn = lName ? `${lName[0]}.` : '';
        const cleanInst = resolveCleanInstrument(s, teacherInst);
        const sub = s.timeSlot ? `${cleanInst} • ${s.timeSlot} Uhr` : cleanInst;
        return {
          type: 'student' as const,
          isToday: true,
          label: `${fName} ${maskedLn}`.trim(),
          sub,
          value: `@${fName}`,
          item: { ...s, first_name: fName, last_name: lName, instrument: cleanInst }
        };
      });

      // 2. Process other students in roster
      const todayKeys = new Set(todayList.map(s => String(s.id || s.name || s.first_name).toLowerCase()));
      const otherList = (allStudents || []).filter(s => {
        const sKey = String(s.id || s.name || s.first_name).toLowerCase();
        return !todayKeys.has(sKey);
      });

      const mappedOther = otherList.map(s => {
        const fName = s.first_name || (s.name ? s.name.split(' ')[0] : 'Schüler');
        const lName = s.last_name || (s.name ? s.name.split(' ').slice(1).join(' ') : '');
        const maskedLn = lName ? `${lName[0]}.` : '';
        const cleanInst = resolveCleanInstrument(s, teacherInst);
        return {
          type: 'student' as const,
          isToday: false,
          label: `${fName} ${maskedLn}`.trim(),
          sub: cleanInst,
          value: `@${fName}`,
          item: { ...s, first_name: fName, last_name: lName, instrument: cleanInst }
        };
      });

      if (!q) {
        // Default when typing '@': show all of today's Tagesplan students first!
        if (mappedToday.length > 0) {
          return mappedToday;
        }
        return mappedOther.slice(0, 6);
      }

      // Filter query against both
      const filteredToday = mappedToday.filter(s => 
        s.label.toLowerCase().includes(q) || 
        s.sub.toLowerCase().includes(q)
      );
      const filteredOther = mappedOther.filter(s => 
        s.label.toLowerCase().includes(q) || 
        s.sub.toLowerCase().includes(q)
      );

      return [...filteredToday, ...filteredOther].slice(0, 6);
    }

    if (autocompleteType === 'tag') {
      const isStudentLinked = !!(parsedIntent?.detectedStudent || activeStudent);
      const tagPool = isStudentLinked ? STUDENT_SKILL_TAGS : TEACHER_ORGANIZATION_TAGS;
      return tagPool
        .filter(t => t.label.toLowerCase().includes(q) || t.tag.toLowerCase().includes(q) || t.desc.toLowerCase().includes(q))
        .map(t => ({
          type: 'tag' as const,
          isToday: false,
          label: `${t.tag} (${t.label})`,
          sub: t.desc,
          value: t.tag,
          item: t.tag
        }));
    }

    if (autocompleteType === 'room') {
      // 1. Detect current teacher's room context for today
      let currentContextRoomName: string | null = null;
      if (activeStudent?.room) currentContextRoomName = String(activeStudent.room).trim();
      else if (activeStudent?.room_name) currentContextRoomName = String(activeStudent.room_name).trim();
      else if (todayStudents && todayStudents.length > 0) {
        for (const s of todayStudents) {
          const r = s.room || s.room_name;
          if (r && typeof r === 'string' && r.trim()) {
            currentContextRoomName = r.trim();
            break;
          }
        }
      }

      // 2. Build unified instruments map from rooms.room_instruments + internalEquipment
      const instrumentMap = new Map<string, { name: string; model: string; roomName: string | null; roomId: string | null; floor: string | null }>();

      // From rooms.room_instruments
      if (Array.isArray(internalRooms)) {
        internalRooms.forEach((r: any) => {
          const rName = r.name || 'Raum';
          const rFloor = r.floor && r.floor !== 'Allgemein' ? r.floor : 'EG';
          
          if (Array.isArray(r.room_instruments)) {
            r.room_instruments.forEach((inst: any) => {
              const instName = typeof inst === 'string' ? inst : (inst?.name || '');
              const instModel = typeof inst === 'object' && inst?.model ? inst.model : 'Standard';
              if (instName) {
                const key = `${instName}_${r.id}`.toLowerCase();
                instrumentMap.set(key, {
                  name: instName,
                  model: instModel,
                  roomName: rName,
                  roomId: r.id,
                  floor: rFloor
                });
              }
            });
          }

          if (Array.isArray(r.equipment)) {
            r.equipment.forEach((eqName: string) => {
              if (typeof eqName === 'string' && eqName.trim()) {
                const key = `${eqName}_${r.id}`.toLowerCase();
                if (!instrumentMap.has(key)) {
                  instrumentMap.set(key, {
                    name: eqName.trim(),
                    model: 'Ausstattung',
                    roomName: rName,
                    roomId: r.id,
                    floor: rFloor
                  });
                }
              }
            });
          }
        });
      }

      // From school_equipment (including unassigned pool instruments)
      if (Array.isArray(internalEquipment)) {
        internalEquipment.forEach((eq: any) => {
          const eqName = eq.name || '';
          if (eqName) {
            const alreadyAssigned = Array.from(instrumentMap.values()).some(i => i.name.toLowerCase() === eqName.toLowerCase());
            if (!alreadyAssigned) {
              instrumentMap.set(eqName.toLowerCase(), {
                name: eqName,
                model: eq.model || 'Standard',
                roomName: null,
                roomId: null,
                floor: null
              });
            }
          }
        });
      }

      const allInstruments = Array.from(instrumentMap.values());

      // 3. Build rooms list
      const uniqueRoomMap = new Map<string, any>();
      if (Array.isArray(internalRooms)) {
        internalRooms.forEach((r: any) => {
          const key = String(r.id || r.name || '').trim();
          if (key) uniqueRoomMap.set(key, r);
        });
      }
      if (Array.isArray(rooms)) {
        rooms.forEach((r: any) => {
          const key = String(r.id || r.name || '').trim();
          if (key && !uniqueRoomMap.has(key)) uniqueRoomMap.set(key, r);
        });
      }
      const allRooms = Array.from(uniqueRoomMap.values());

      const isExplicitInstrumentQuery = q === 'instrument' || q === 'ausstattung' || q === 'instrumente' || q === 'inst' || q === 'eq';
      const isExplicitRoomQuery = q === 'raum' || q === 'räume' || q === 'raeume' || q === 'zimmer' || q === 'saal';

      const matchedSynonyms: string[] = [];
      Object.entries(INSTRUMENT_SYNONYMS).forEach(([catKey, syns]) => {
        if (syns.some(s => q.includes(s) || s.includes(q))) {
          matchedSynonyms.push(...syns);
        }
      });

      let filteredInstruments = allInstruments;
      if (isExplicitInstrumentQuery) {
        filteredInstruments = allInstruments;
      } else if (isExplicitRoomQuery) {
        filteredInstruments = [];
      } else if (q) {
        filteredInstruments = allInstruments.filter(inst => {
          const fullText = `${inst.name} ${inst.model} ${inst.roomName || 'Pool Frei'}`.toLowerCase();
          const matchesDirect = fullText.includes(q);
          const matchesSynonym = matchedSynonyms.some(s => fullText.includes(s));
          return matchesDirect || matchesSynonym;
        });
      }

      let filteredRooms = allRooms;
      if (isExplicitInstrumentQuery) {
        filteredRooms = [];
      } else if (isExplicitRoomQuery) {
        filteredRooms = allRooms;
      } else if (q) {
        filteredRooms = allRooms.filter((r: any) => {
          const rName = typeof r === 'string' ? r : (r.name || '');
          const rFloor = typeof r === 'object' ? (r.floor || '') : '';
          const rDesc = typeof r === 'object' ? (r.description || '') : '';
          const fullText = `${rName} ${rFloor} ${rDesc}`.toLowerCase();
          return fullText.includes(q);
        });
      }

      const instrumentSuggestions = filteredInstruments.map(inst => {
        const isCurrent = currentContextRoomName && inst.roomName && (
          inst.roomName.toLowerCase() === currentContextRoomName.toLowerCase()
        );
        const roomBadge = isCurrent 
          ? '⭐ In deinem Raum' 
          : (inst.roomName ? `🏢 ${inst.roomName}` : '📦 Pool / Frei');
        return {
          type: 'equipment' as const,
          isToday: !!isCurrent,
          label: `!${inst.name}`,
          sub: `${roomBadge} • ${inst.model}`,
          value: `!${inst.name}${inst.roomName ? ` (${inst.roomName})` : ''}`,
          item: inst
        };
      });

      const roomSuggestions = filteredRooms.map((r: any) => {
        const name = typeof r === 'string' ? r : (r.name || 'Raum');
        const floor = typeof r === 'object' && r.floor && r.floor !== 'Allgemein' ? r.floor : 'EG';
        const capacity = typeof r === 'object' && r.max_students ? ` • max. ${r.max_students} Schüler` : '';
        const isCurrent = currentContextRoomName && (
          name.toLowerCase() === currentContextRoomName.toLowerCase()
        );
        return {
          type: 'room' as const,
          isToday: !!isCurrent,
          label: `!${name}`,
          sub: isCurrent ? `⭐ Dein Raum heute • ${floor}${capacity}` : `${floor}${capacity}`,
          value: `!${name}`,
          item: r
        };
      });

      // Sub-Prefix override: !r/!r4 -> 'rooms', !i/!inst/!eq -> 'equipment'
      const isSubPrefixRoom = (q.startsWith('r') || q.startsWith('rä') || q.startsWith('rae')) && !isExplicitInstrumentQuery;
      const isSubPrefixEquip = (q.startsWith('i') || q.startsWith('a') || q.startsWith('eq')) && !isExplicitRoomQuery;

      const effectiveTab = isExplicitRoomQuery || isSubPrefixRoom 
        ? 'rooms' 
        : isExplicitInstrumentQuery || isSubPrefixEquip 
          ? 'equipment' 
          : roomSegmentTab;

      let combined: any[] = [];
      if (effectiveTab === 'equipment') {
        combined = instrumentSuggestions;
      } else if (effectiveTab === 'rooms') {
        combined = roomSuggestions;
      } else {
        combined = [...instrumentSuggestions, ...roomSuggestions];
      }

      // Sort: current context items (isToday === true) always float to top!
      return combined
        .sort((a, b) => {
          if (a.isToday && !b.isToday) return -1;
          if (!a.isToday && b.isToday) return 1;
          return 0;
        })
        .slice(0, 8);
    }

    if (autocompleteType === 'macro') {
      return QUICK_SNIPPETS
        .filter(m => m.label.toLowerCase().includes(q) || m.id.toLowerCase().includes(q) || m.snippet.toLowerCase().includes(q))
        .map(m => ({
          type: 'macro' as const,
          isToday: false,
          label: `/${m.id} • ${m.label}`,
          sub: m.snippet,
          value: m.snippet,
          item: m
        }));
    }

    return [];
  }, [autocompleteType, autocompleteQuery, allStudents, todayStudents, user?.instrument, rooms, internalRooms, internalEquipment, roomSegmentTab, activeStudent]);

  // Insert Quick Snippet directly from macro chip
  const insertSnippet = (snippetText: string) => {
    setInputContent(snippetText);
    adjustTextareaHeight();
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(snippetText.length, snippetText.length);
      }
    }, 10);
  };

  // Handle Input Change with Autocomplete Detection
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInputContent(val);
    adjustTextareaHeight();

    const cursor = (e.target as any).selectionStart || 0;
    const textBeforeCursor = val.slice(0, cursor);
    const lastWord = textBeforeCursor.split(/\s/).pop() || '';

    if (lastWord.startsWith('@') && lastWord.length >= 1) {
      setAutocompleteType('student');
      setAutocompleteQuery(lastWord.slice(1));
      setSuggestionIndex(0);
    } else if (lastWord.startsWith('#') && lastWord.length >= 1) {
      setAutocompleteType('tag');
      setAutocompleteQuery(lastWord.slice(1));
      setSuggestionIndex(0);
    } else if (lastWord.startsWith('!') && lastWord.length >= 1) {
      setAutocompleteType('room');
      setAutocompleteQuery(lastWord.slice(1));
      setSuggestionIndex(0);
    } else if (lastWord.startsWith('/') && lastWord.length >= 1) {
      setAutocompleteType('macro');
      setAutocompleteQuery(lastWord.slice(1));
      setSuggestionIndex(0);
    } else {
      setAutocompleteType(null);
    }
  };

  // Apply Autocomplete Suggestion
  const applySuggestion = (suggestion: { value: string; label: string; item?: any }) => {
    if (!textareaRef.current) return;
    const val = inputContent;
    const cursor = textareaRef.current.selectionStart || val.length;
    const textBeforeCursor = val.slice(0, cursor);
    const textAfterCursor = val.slice(cursor);
    const words = textBeforeCursor.split(/\s/);
    words.pop(); // remove incomplete trigger word

    if (autocompleteType === 'macro') {
      const newBefore = words.length > 0 ? `${words.join(' ')} ${suggestion.value}` : suggestion.value;
      const newContent = `${newBefore}${textAfterCursor}`;
      setInputContent(newContent);
      setAutocompleteType(null);
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(newBefore.length, newBefore.length);
          adjustTextareaHeight();
        }
      }, 10);
      return;
    }

    const newBefore = words.length > 0 ? `${words.join(' ')} ${suggestion.value} ` : `${suggestion.value} `;
    const newContent = `${newBefore}${textAfterCursor}`;
    setInputContent(newContent);
    setAutocompleteType(null);
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newBefore.length, newBefore.length);
        adjustTextareaHeight();
      }
    }, 10);
  };

  // Handle Save
  const handleSave = async (extraAudioUrl?: string, duration?: number) => {
    if (isListening) {
      stopListening();
      initialTextBeforeVoiceRef.current = '';
    }

    const textToSave = inputContent.trim();
    if (!textToSave && !extraAudioUrl) return;

    const studentToLink = parsedIntent?.detectedStudent;
    const rawStudentName = studentToLink?.first_name ? `${studentToLink.first_name} ${studentToLink.last_name || ''}`.trim() : studentToLink?.name;
    const maskedStudentName = studentToLink ? (maskStudentName(rawStudentName) || rawStudentName) : null;

    const isEquipmentReport = parsedIntent?.isEquipmentIssue || !!parsedIntent?.detectedEquipmentName;
    const isRoomReport = isEquipmentReport || parsedIntent?.isRoomIssue || !!parsedIntent?.detectedRoomName;
    const authorFullName = `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || 'Lehrkraft';

    const finalRoom = parsedIntent?.detectedRoomName || (parsedIntent?.isRoomIssue ? 'Raum' : null);
    const roomTag = parsedIntent?.detectedRoomName ? [`#${parsedIntent.detectedRoomName}`] : [];

    await createNote(textToSave || 'Audio-Memo', {
      studentId: studentToLink?.id || null,
      studentName: maskedStudentName,
      roomId: finalRoom,
      authorName: authorFullName,
      audioUrl: extraAudioUrl || null,
      audioDurationSeconds: duration || null,
      dueDate: selectedDueDate || parsedIntent?.naturalDueDate || null,
      noteType: extraAudioUrl ? 'audio_memo' : isEquipmentReport ? 'room_issue' : isRoomReport ? 'room_issue' : parsedIntent?.isTodo ? 'todo' : studentToLink ? 'student_note' : 'scratchpad',
      visibility: isRoomReport ? 'school_admin' : 'private',
      tags: isEquipmentReport ? ['#Ausstattung', '#Mangel', ...roomTag] : roomTag.length > 0 ? roomTag : undefined
    });

    setInputContent('');
    setSelectedDueDate(null);
    setShowDatePicker(false);
    resetTranscript();
    setAudioBlob(null);
    setAudioUrl(null);
    setAutocompleteType(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = '54px';
    }
    
    const targetLabel = parsedIntent?.detectedEquipmentName 
      ? `${parsedIntent.detectedEquipmentName}${parsedIntent.detectedRoomName ? ` (${parsedIntent.detectedRoomName})` : ''}`
      : parsedIntent?.detectedRoomName || 'Raum';

    showToast(
      isRoomReport
        ? `✓ Mangel für ${targetLabel} an Sekretariat gemeldet`
        : studentToLink 
          ? `Notiz für ${studentToLink.first_name || studentToLink.name} gesichert` 
          : 'Allgemeine Notiz gesichert'
    );
  };

  // 1-Click Direct Homework Transfer
  const handleDirectHomeworkTransfer = async () => {
    if (isListening) {
      stopListening();
      initialTextBeforeVoiceRef.current = '';
    }

    const student = parsedIntent?.detectedStudent || activeStudent;
    if (!student) {
      showToast('Kein Schüler zugeordnet');
      return;
    }

    const rawName = student.first_name ? `${student.first_name} ${student.last_name || ''}`.trim() : student.name;
    const studentName = maskStudentName(rawName) || rawName;
    const newNote = await createNote(inputContent.trim(), {
      studentId: student.id,
      studentName,
      noteType: 'student_note'
    });

    await syncToHomeworkBook(newNote, student.id, studentName);
    setSyncedIds(prev => new Set([...Array.from(prev), newNote.id]));
    setInputContent('');
    if (textareaRef.current) {
      textareaRef.current.style.height = '54px';
    }
    showToast(`✓ Ins Hausaufgabenheft von ${student.first_name || studentName} übertragen`);
  };

  // Audio Recording (Audio-Tresor Gated)
  const startAudioMemo = async () => {
    if (!hasTresor) {
      setShowTresorLockPrompt(true);
      return;
    }
    setShowTresorLockPrompt(false);
    try {
      const stream = await acquireAudioStream({ audio: true });
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

  // Smart active notes & today calculation
  const todayNotes = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return notes.filter(n => {
      if (n.is_archived) return false;
      const createdToday = (n.created_at || '').startsWith(todayStr);
      const dueToday = n.due_date === todayStr;
      const isStudentToday = todayStudents.some(s => String(s.id) === String(n.student_id));
      return createdToday || dueToday || isStudentToday;
    });
  }, [notes, todayStudents]);

  const activeNotesCount = useMemo(() => {
    return notes.filter(n => !n.is_archived).length;
  }, [notes]);

  return (
    <div style={{
      background: '#ffffff',
      border: '1px solid rgba(226, 232, 240, 0.9)',
      borderRadius: '20px',
      padding: '12px 14px',
      boxShadow: '0 8px 24px -4px rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.9)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      gap: '8px',
      minHeight: '190px',
      boxSizing: 'border-box',
      position: 'relative',
      fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif"
    }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'absolute',
          top: '-10px',
          right: '14px',
          background: '#0f172a',
          color: '#ffffff',
          padding: '4px 10px',
          borderRadius: '100px',
          fontSize: '0.68rem',
          fontWeight: 700,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          zIndex: 40
        }}>
          <Check size={10} strokeWidth={3} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. HEADER (Titel, Zähler, Vorlagen-Button, Board-Modal Button)            */}
      {/* ========================================================================= */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '1.02rem', fontWeight: 850, color: '#0f172a', letterSpacing: '-0.02em' }}>
            Notizen
          </span>
          {activeMetronomeBpm && (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              background: '#e6f4ea',
              color: '#166534',
              padding: '2px 8px',
              borderRadius: '100px',
              fontSize: '0.72rem',
              fontWeight: 800
            }}>
              <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#34a853', animation: 'pulse 1s infinite' }} />
              <span>{activeMetronomeBpm} BPM</span>
              <button
                type="button"
                onClick={stopMetronome}
                style={{ background: 'none', border: 'none', color: '#166534', cursor: 'pointer', padding: 0, display: 'flex' }}
              >
                <X size={11} />
              </button>
            </div>
          )}
        </div>

        {/* Action Cluster (Vorlagen & Board) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {/* ✨ Vorlagen Button */}
          <button
            type="button"
            onClick={() => setShowQuickTemplates(prev => !prev)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: showQuickTemplates ? '#ecfdf5' : '#f8fafc',
              color: showQuickTemplates ? '#15803d' : '#0f172a',
              border: `1px solid ${showQuickTemplates ? '#86efac' : '#e2e8f0'}`,
              borderRadius: '9px',
              padding: '5px 10px',
              fontSize: '0.80rem',
              fontWeight: 750,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            className="hover-scale-mini"
            title="Vorlagen & smarte Notiz-Funktionen öffnen (!, @, #, -, /)"
          >
            <Zap size={13} color={showQuickTemplates ? '#16a34a' : '#d97706'} />
            <span>Vorlagen</span>
            <ChevronDown
              size={12}
              color={showQuickTemplates ? '#16a34a' : '#94a3b8'}
              style={{
                transform: showQuickTemplates ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.15s ease'
              }}
            />
          </button>

          {/* Notizen-Board Button */}
          <button
            type="button"
            onClick={() => setShowBoardModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: '#f8fafc',
              color: '#0f172a',
              border: '1px solid #e2e8f0',
              borderRadius: '9px',
              padding: '5px 10px',
              fontSize: '0.80rem',
              fontWeight: 750,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            className="hover-scale-mini"
            title="Notizen-Board öffnen (⌘J)"
          >
            <Layers size={13} color="#64748b" />
            <span>Notizen-Board</span>
            {activeNotesCount > 0 && (
              <span style={{
                background: '#ffffff',
                color: '#0f172a',
                borderRadius: '5px',
                padding: '1px 5px',
                fontSize: '0.70rem',
                fontWeight: 800,
                border: '1px solid #cbd5e1'
              }}>
                {activeNotesCount}
              </span>
            )}
            <ArrowUpRight size={11} color="#94a3b8" />
          </button>
        </div>

        {/* ========================================================================= */}
        {/* ✨ VORLAGEN & FUNKTIONEN POPOVER                                          */}
        {/* ========================================================================= */}
        {showQuickTemplates && (
          <div
            ref={templatesPopoverRef}
            style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              right: 0,
              width: '370px',
              maxWidth: '92vw',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              boxShadow: '0 16px 36px -4px rgba(15,23,42,0.16), 0 0 0 1px rgba(0,0,0,0.04)',
              zIndex: 70,
              padding: '14px',
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Zap size={16} color="#d97706" />
                <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a' }}>
                  Smarte Notiz-Funktionen & Vorlagen
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowQuickTemplates(false)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8', padding: '2px' }}
              >
                <X size={15} />
              </button>
            </div>

            {/* Funktion 1: ! Mängel melden */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Funktionen & Syntax
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '5px' }}>
                {/* ! Mangel */}
                <button
                  type="button"
                  onClick={() => handleInsertSyntax('!', 'room')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    borderRadius: '10px',
                    border: '1px solid #fee2e2',
                    background: '#fef2f2',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                  className="hover-scale-mini"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <AlertTriangle size={15} color="#dc2626" />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 750, color: '#991b1b' }}>! Mangel & Defekt melden</div>
                      <div style={{ fontSize: '0.72rem', color: '#b91c1c' }}>Raum-, Saiten- & Equipment-Meldung an Verwaltung</div>
                    </div>
                  </div>
                  <span style={{ fontSize: '0.74rem', fontWeight: 800, background: '#fee2e2', color: '#dc2626', padding: '2px 7px', borderRadius: '6px' }}>!Raum</span>
                </button>

                {/* @ Schüler */}
                <button
                  type="button"
                  onClick={() => handleInsertSyntax('@', 'student')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    borderRadius: '10px',
                    border: '1px solid #bbf7d0',
                    background: '#f0fdf4',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                  className="hover-scale-mini"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <User size={15} color="#166534" />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 750, color: '#166534' }}>@ Schüler verknüpfen</div>
                      <div style={{ fontSize: '0.72rem', color: '#15803d' }}>Notiz oder Hausaufgabe direkt an Schüler anheften</div>
                    </div>
                  </div>
                  <span style={{ fontSize: '0.74rem', fontWeight: 800, background: '#dcfce7', color: '#166534', padding: '2px 7px', borderRadius: '6px' }}>@Schüler</span>
                </button>

                {/* # Tag */}
                <button
                  type="button"
                  onClick={() => handleInsertSyntax('#', 'tag')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    borderRadius: '10px',
                    border: '1px solid #bfdbfe',
                    background: '#eff6ff',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                  className="hover-scale-mini"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Hash size={15} color="#1d4ed8" />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 750, color: '#1e40af' }}># Tag & Kategorie vergeben</div>
                      <div style={{ fontSize: '0.72rem', color: '#2563eb' }}>#Wichtig, #Material, #Eltern, #Noten, #Technik</div>
                    </div>
                  </div>
                  <span style={{ fontSize: '0.74rem', fontWeight: 800, background: '#dbeafe', color: '#1d4ed8', padding: '2px 7px', borderRadius: '6px' }}>#Tag</span>
                </button>

                {/* - To-Do */}
                <button
                  type="button"
                  onClick={() => handleInsertSyntax('- ')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0',
                    background: '#f8fafc',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                  className="hover-scale-mini"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <CheckSquare size={15} color="#475569" />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 750, color: '#334155' }}>- To-Do Checkliste anlegen</div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Interaktive Abhakkarten-Aufgabe mit Checkbox</div>
                    </div>
                  </div>
                  <span style={{ fontSize: '0.74rem', fontWeight: 800, background: '#e2e8f0', color: '#334155', padding: '2px 7px', borderRadius: '6px' }}>- To-Do</span>
                </button>

                {/* / Makros */}
                <button
                  type="button"
                  onClick={() => handleInsertSyntax('/', 'macro')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    borderRadius: '10px',
                    border: '1px solid #fef08a',
                    background: '#fefce8',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                  className="hover-scale-mini"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#fef9c3', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Sparkles size={15} color="#ca8a04" />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 750, color: '#854d0e' }}>/ Textbausteine & Makros</div>
                      <div style={{ fontSize: '0.72rem', color: '#a16207' }}>Schnelle Vorlagen für Übe-Aufträge & Orga</div>
                    </div>
                  </div>
                  <span style={{ fontSize: '0.74rem', fontWeight: 800, background: '#fef08a', color: '#854d0e', padding: '2px 7px', borderRadius: '6px' }}>/Baustein</span>
                </button>
              </div>
            </div>

            {/* Sektion 2: 1-Klick Schnellvorlagen */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                1-Klick Schnell-Vorlagen
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => handleInsertSyntax('!Raum 4: Mangel melden: ', 'room', '!Raum 4: Mangel melden: ')}
                  style={{
                    padding: '5px 9px',
                    borderRadius: '8px',
                    border: '1px solid #fecaca',
                    background: '#fef2f2',
                    color: '#dc2626',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                  className="hover-scale-mini"
                >
                  ! Mangel melden
                </button>

                <button
                  type="button"
                  onClick={() => handleInsertSyntax('- Noten kopieren für nächste Stunde', null, '- Noten kopieren für nächste Stunde')}
                  style={{
                    padding: '5px 9px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    background: '#f8fafc',
                    color: '#334155',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                  className="hover-scale-mini"
                >
                  - Noten kopieren
                </button>

                <button
                  type="button"
                  onClick={() => handleInsertSyntax('Takt 1-8 bei 80 BPM üben', null, 'Takt 1-8 bei 80 BPM üben')}
                  style={{
                    padding: '5px 9px',
                    borderRadius: '8px',
                    border: '1px solid #fef08a',
                    background: '#fefce8',
                    color: '#854d0e',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                  className="hover-scale-mini"
                >
                  ⚡ Takt & 80 BPM
                </button>

                <button
                  type="button"
                  onClick={() => handleInsertSyntax('Play-Along Track anhören und mitspielen', null, 'Play-Along Track anhören und mitspielen')}
                  style={{
                    padding: '5px 9px',
                    borderRadius: '8px',
                    border: '1px solid #bbf7d0',
                    background: '#f0fdf4',
                    color: '#166534',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                  className="hover-scale-mini"
                >
                  🎵 Play-Along
                </button>

                <button
                  type="button"
                  onClick={() => handleInsertSyntax('#Wichtig ', 'tag')}
                  style={{
                    padding: '5px 9px',
                    borderRadius: '8px',
                    border: '1px solid #fecdd3',
                    background: '#fff1f2',
                    color: '#9f1239',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                  className="hover-scale-mini"
                >
                  📌 #Wichtig
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 2. SÄULE 1: ERGONOMISCHER QUICK-CAPTURE INPUT (42px)                      */}
      {/* ========================================================================= */}
      <div style={{
        position: 'relative',
        background: '#f8fafc',
        borderRadius: '13px',
        border: autocompleteType ? '1.5px solid #34a853' : isListening ? '1.5px solid #dc2626' : '1px solid #e2e8f0',
        padding: '0 8px 0 12px',
        height: '42px',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        boxSizing: 'border-box',
        transition: 'all 0.15s ease'
      }}>
        {/* Floating Autocomplete */}
        {autocompleteType && suggestions.length > 0 && (
          <div style={{
            position: 'absolute',
            bottom: '100%',
            left: 0,
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            padding: '6px',
            boxShadow: '0 14px 32px -4px rgba(15,23,42,0.16)',
            zIndex: 60,
            minWidth: '280px',
            maxWidth: '360px',
            maxHeight: '240px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '3px',
            marginBottom: '6px'
          }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8', padding: '3px 6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {autocompleteType === 'student' ? 'Schüler wählen (@)' : autocompleteType === 'tag' ? 'Tag wählen (#)' : autocompleteType === 'room' ? 'Mangel / Raum wählen (!)' : 'Baustein (/)'}
            </div>
            {suggestions.map((s, idx) => (
              <button
                key={`sug-${idx}`}
                type="button"
                onClick={() => applySuggestion(s)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                  padding: '6px 8px',
                  borderRadius: '8px',
                  border: 'none',
                  background: idx === suggestionIndex ? '#f1f5f9' : 'transparent',
                  color: '#0f172a',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: '0.84rem',
                  fontWeight: 650
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {s.type === 'student' ? (
                    <User size={13} color="#166534" />
                  ) : s.type === 'room' ? (
                    <DoorOpen size={13} color="#dc2626" />
                  ) : (
                    <Hash size={13} color="#64748b" />
                  )}
                  <span>{s.label}</span>
                </div>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{s.sub}</span>
              </button>
            ))}
          </div>
        )}

        <input
          ref={textareaRef as any}
          type="text"
          value={inputContent}
          onChange={handleInputChange}
          onKeyDown={(e) => {
            if (autocompleteType && suggestions.length > 0) {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSuggestionIndex(prev => (prev + 1) % suggestions.length);
                return;
              }
              if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSuggestionIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
                return;
              }
              if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
                if (suggestions[suggestionIndex]) {
                  applySuggestion(suggestions[suggestionIndex]);
                  return;
                }
              }
              if (e.key === 'Escape') {
                e.preventDefault();
                setAutocompleteType(null);
                return;
              }
            }

            if (e.key === 'Enter') {
              e.preventDefault();
              handleSave();
            }
          }}
          placeholder={isListening ? '🎙️ Höre zu... Diktat aktiv...' : 'Notiz, @Schüler, !Mangel, #Tag oder - To-Do... (⌘J)'}
          style={{
            flex: 1,
            height: '100%',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            fontSize: '0.90rem',
            color: '#0f172a',
            fontWeight: 550,
            padding: 0
          }}
        />

        {/* Dezente Schnellauswahl-Icons (!, @, #, -, /) direkt im Eingabefeld */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
          {/* ! Mangel */}
          <button
            type="button"
            onClick={() => handleInsertSyntax('!', 'room')}
            title="! Mangel oder Raum-Defekt melden"
            style={{
              background: '#fee2e2',
              color: '#dc2626',
              border: '1px solid #fecaca',
              borderRadius: '7px',
              padding: '3px 7px',
              fontSize: '0.78rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.12s ease'
            }}
            className="hover-scale-mini"
          >
            !
          </button>

          {/* @ Schüler */}
          <button
            type="button"
            onClick={() => handleInsertSyntax('@', 'student')}
            title="@ Schüler zuordnen"
            style={{
              background: '#dcfce7',
              color: '#166534',
              border: '1px solid #bbf7d0',
              borderRadius: '7px',
              padding: '3px 7px',
              fontSize: '0.78rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.12s ease'
            }}
            className="hover-scale-mini"
          >
            @
          </button>

          {/* # Tag */}
          <button
            type="button"
            onClick={() => handleInsertSyntax('#', 'tag')}
            title="# Tag vergeben (#Wichtig, #Material...)"
            style={{
              background: '#dbeafe',
              color: '#1d4ed8',
              border: '1px solid #bfdbfe',
              borderRadius: '7px',
              padding: '3px 7px',
              fontSize: '0.78rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.12s ease'
            }}
            className="hover-scale-mini"
          >
            #
          </button>

          {/* - To-Do */}
          <button
            type="button"
            onClick={() => handleInsertSyntax('- ')}
            title="- To-Do Checkliste anlegen"
            style={{
              background: '#f1f5f9',
              color: '#334155',
              border: '1px solid #e2e8f0',
              borderRadius: '7px',
              padding: '3px 7px',
              fontSize: '0.78rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.12s ease'
            }}
            className="hover-scale-mini"
          >
            ✓
          </button>

          <div style={{ width: '1px', height: '18px', background: '#e2e8f0', margin: '0 2px' }} />

          {/* Integrated Apple Spotlight Dictation Microphone */}
          <button
            type="button"
            onClick={handleToggleVoiceDictation}
            title={isListening ? 'Diktat beenden' : 'Sprachnotiz diktieren'}
            style={{
              background: isListening ? '#dc2626' : 'transparent',
              color: isListening ? '#ffffff' : '#64748b',
              border: 'none',
              borderRadius: '7px',
              padding: '5px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              transition: 'all 0.15s ease'
            }}
            className="hover-scale-mini"
          >
            <Mic size={15} color={isListening ? '#ffffff' : '#64748b'} />
          </button>

          {inputContent.trim() && (
            <button
              type="button"
              onClick={() => handleSave()}
              style={{
                border: 'none',
                background: '#0f172a',
                color: '#ffffff',
                borderRadius: '8px',
                padding: '4px 10px',
                fontSize: '0.74rem',
                fontWeight: 800,
                cursor: 'pointer',
                flexShrink: 0
              }}
            >
              ↵
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. SÄULE 2 & 3: SMART-PRIORITY STACK (Max. 2 Karten & 1,5s Micro-Delay)   */}
      {/* ========================================================================= */}
      {(() => {
        const candidateNotes = notes.filter(n => !n.is_archived && (!n.is_completed || recentlyCompletedIds.includes(n.id)));

        // Smart-Priority Sorting:
        // 1. is_pinned (true first)
        // 2. due_date (overdue / today first)
        // 3. created_at (newest first)
        const sortedNotes = [...candidateNotes].sort((a, b) => {
          if (a.is_pinned && !b.is_pinned) return -1;
          if (!a.is_pinned && b.is_pinned) return 1;

          const aIsTodayOrOverdue = a.due_date && a.due_date <= new Date().toISOString().split('T')[0];
          const bIsTodayOrOverdue = b.due_date && b.due_date <= new Date().toISOString().split('T')[0];
          if (aIsTodayOrOverdue && !bIsTodayOrOverdue) return -1;
          if (!aIsTodayOrOverdue && bIsTodayOrOverdue) return 1;

          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
        });

        const visibleNotes = sortedNotes.slice(0, 2);
        const remainingCount = Math.max(0, candidateNotes.length - 2);

        if (visibleNotes.length === 0) {
          return (
            <div style={{
              background: '#f8fafc',
              borderRadius: '13px',
              padding: '16px 14px',
              textAlign: 'center',
              color: '#64748b',
              fontSize: '0.86rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              border: '1px dashed #cbd5e1'
            }}>
              <Sparkles size={16} color="#94a3b8" />
              <span>Keine offenen Notizen • Tippe oben eine Notiz, @Schüler oder klicke auf Vorlagen</span>
            </div>
          );
        }

        return (
          <>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
            {visibleNotes.map((note) => {
              const isRecentlyCompleted = recentlyCompletedIds.includes(note.id);
              const isDone = note.is_completed || isRecentlyCompleted;

              // Intelligent Room Display Calculation
              const detectedRoom = (() => {
                if (note.room_id && note.room_id.toLowerCase() !== 'raum') return note.room_id;
                const tagRoom = (note.tags || []).find(t => {
                  const clean = t.replace(/^#/, '').toLowerCase();
                  return clean.startsWith('raum') || clean.startsWith('saal') || clean.startsWith('studio') || clean.startsWith('keller') || clean.startsWith('eg') || clean.startsWith('og') || clean.startsWith('konzertsaal');
                });
                if (tagRoom) {
                  const cleanTag = tagRoom.replace(/^#/, '').trim();
                  if (cleanTag.toLowerCase() !== 'raum') return cleanTag.charAt(0).toUpperCase() + cleanTag.slice(1);
                }
                const match = note.content.match(/(?:!|#|\b)(Raum\s*\d+|Saal\s*\d*|Studio\s*\d*|Konzertsaal|Bandraum|Keller|EG|OG\s*\d*)\b/i);
                if (match) return match[1].trim();
                return note.room_id || (note.note_type === 'room_issue' ? 'Raum' : null);
              })();
              const isRoomItem = Boolean(detectedRoom || note.note_type === 'room_issue');
              const isDefectTag = note.tags?.some(t => {
                const c = t.toLowerCase();
                return c === '#mangel' || c === '#defekt' || c === 'mangel' || c === 'defekt';
              });
              const isDefectText = /mangel|defekt|kaputt|reparatur|stimmen|saite|notenständer/i.test(note.content);
              const isRoomIssue = note.note_type === 'room_issue' || note.visibility === 'school_admin' || (isRoomItem && (isDefectTag || isDefectText));
              const isRoomIssueOpen = isRoomIssue && !note.is_completed && !note.is_acknowledged;

              return (
                <div
                  key={note.id}
                  style={{
                    background: isDone ? 'rgba(248, 250, 252, 0.7)' : (note.is_pinned ? 'rgba(248, 250, 252, 0.9)' : '#ffffff'),
                    border: `1px solid ${isDone ? '#e2e8f0' : 'rgba(226, 232, 240, 0.9)'}`,
                    borderRadius: '13px',
                    padding: '9px 13px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px',
                    minHeight: '44px',
                    boxShadow: isDone ? 'none' : '0 2px 5px rgba(0, 0, 0, 0.02)',
                    opacity: isDone ? 0.6 : 1,
                    transition: 'all 0.2s ease'
                  }}
                  className="hover-scale-mini"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                    {/* Action Button: Raummangel Action vs 1-Tap Apple Checkbox */}
                    {isRoomIssueOpen ? (
                      <button
                        type="button"
                        onClick={() => setSelectedRoomIssueNote(note)}
                        style={{
                          background: '#fee2e2',
                          border: '1px solid #fca5a5',
                          borderRadius: '8px',
                          padding: '4px 6px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          color: '#dc2626',
                          flexShrink: 0,
                          boxShadow: '0 1px 3px rgba(220, 38, 38, 0.12)'
                        }}
                        title="Beim Sekretariat gemeldet – Klicken für Erledigungs-Optionen"
                        className="hover-scale-mini"
                      >
                        <DoorOpen size={14} color="#dc2626" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleWidgetToggleComplete(note.id, Boolean(note.is_completed))}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: isDone ? '#34a853' : '#94a3b8',
                          cursor: 'pointer',
                          padding: '2px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}
                        title={isDone ? 'Als offen markieren' : 'Abhaken'}
                      >
                        {isDone ? (
                          <CheckCircle2 size={18} color="#34a853" />
                        ) : (
                          <Circle size={18} color="#94a3b8" />
                        )}
                      </button>
                    )}

                    <span style={{
                      fontSize: '0.88rem',
                      color: isDone ? '#94a3b8' : '#0f172a',
                      textDecoration: isDone ? 'line-through' : 'none',
                      fontWeight: isDone ? 500 : (note.is_pinned ? 700 : 650),
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {formatCleanNoteContent(note.content, note.student_name)}
                    </span>

                    {/* Student Badge */}
                    {note.student_name && (
                      <span style={{
                        fontSize: '0.74rem',
                        color: '#166534',
                        fontWeight: 750,
                        background: '#e6f4ea',
                        border: '1px solid #bbf7d0',
                        padding: '3px 8px',
                        borderRadius: '7px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        flexShrink: 0
                      }}>
                        <User size={10} />
                        {maskStudentName(note.student_name)}
                      </span>
                    )}

                    {/* Room Badge */}
                    {isRoomItem && (
                      <span style={{
                        fontSize: '0.72rem',
                        fontWeight: 750,
                        padding: '3px 8px',
                        borderRadius: '7px',
                        background: '#fee2e2',
                        color: '#991b1b',
                        border: '1px solid #fecaca',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        flexShrink: 0
                      }}>
                        <DoorOpen size={10} color="#dc2626" />
                        <span>{detectedRoom || 'Raum'}</span>
                      </span>
                    )}

                    {/* Other Tags */}
                    {note.tags && note.tags.filter(t => {
                      const clean = t.replace(/^#/, '').toLowerCase();
                      if (clean === 'todo' || clean === 'to-do') return false;
                      if (isRoomItem && (clean === 'raum' || (detectedRoom && clean === detectedRoom.toLowerCase()))) return false;
                      return true;
                    }).slice(0, 1).map(tag => {
                      const style = getTagBadgeStyle(tag);
                      return (
                        <span
                          key={tag}
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 750,
                            padding: '3px 8px',
                            borderRadius: '7px',
                            background: style.bg,
                            color: style.color,
                            border: `1px solid ${style.border}`,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            flexShrink: 0
                          }}
                        >
                          {renderMonochromeTagIcon(style.iconName, 10, style.color)}
                          <span>{style.label || tag.replace(/^#/, '')}</span>
                        </span>
                      );
                    })}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '3px', flexShrink: 0 }}>
                    {note.is_pinned && (
                      <button
                        type="button"
                        onClick={() => togglePin(note.id)}
                        title="Lösen"
                        style={{
                          border: 'none',
                          background: 'transparent',
                          color: '#64748b',
                          cursor: 'pointer',
                          padding: '5px',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}
                        className="hover-scale-mini"
                      >
                        <Pin size={14} />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        deleteNote(note.id);
                        showToast('Notiz gelöscht');
                      }}
                      title="Löschen"
                      style={{
                        border: 'none',
                        background: 'transparent',
                        color: '#cbd5e1',
                        cursor: 'pointer',
                        padding: '5px',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        transition: 'color 0.15s ease'
                      }}
                      className="hover-scale-mini"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* SÄULE 4: Moderner Überlauf-Indikator mit Apple Quick-Peek Trigger */}
          {remainingCount > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', paddingTop: '4px' }}>
              <button
                type="button"
                onClick={() => setShowTodayQuickPeek(prev => !prev)}
                style={{
                  background: showTodayQuickPeek ? '#f1f5f9' : '#ffffff',
                  border: `1px solid ${showTodayQuickPeek ? '#cbd5e1' : 'rgba(226, 232, 240, 0.9)'}`,
                  color: showTodayQuickPeek ? '#0f172a' : '#475569',
                  borderRadius: '100px',
                  padding: '5px 14px',
                  fontSize: '0.78rem',
                  fontWeight: 650,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: showTodayQuickPeek ? 'none' : '0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02)',
                  transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)'
                }}
                className="hover-scale-mini"
                title={showTodayQuickPeek ? 'Vorschau schließen' : 'Tages-Fahrplan öffnen'}
              >
                <span style={{
                  background: showTodayQuickPeek ? '#e2e8f0' : '#f1f5f9',
                  color: '#0f172a',
                  borderRadius: '100px',
                  padding: '1px 7px',
                  fontSize: '0.72rem',
                  fontWeight: 750
                }}>
                  +{remainingCount}
                </span>
                <span>weitere</span>
                <ChevronDown
                  size={13}
                  color={showTodayQuickPeek ? '#0f172a' : '#94a3b8'}
                  style={{
                    transform: showTodayQuickPeek ? 'rotate(180deg)' : 'none',
                    transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                  }}
                />
              </button>
            </div>
          )}
        </>
      );
    })()}

      {/* ========================================================================= */}
      {/* 4. SÄULE 5: MINIMALISTISCHER FOOTER (Auto-Sync & ⌘J)                      */}
      {/* ========================================================================= */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: '6px',
        borderTop: '1px solid #f1f5f9',
        fontSize: '0.76rem',
        color: '#64748b',
        fontWeight: 600
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34a853' }} />
          <span>Auto-Sync</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span 
            onClick={() => setShowBoardModal(true)}
            style={{ color: '#334155', cursor: 'pointer', fontWeight: 750, fontSize: '0.78rem' }}
          >
            Alle {activeNotesCount} im Board ➔
          </span>
          <span style={{ fontSize: '0.74rem' }}>
            Shortcut <kbd style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '2px 5px', fontFamily: 'monospace', fontSize: '0.70rem' }}>⌘J</kbd>
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4.5 ✨ MASTER APPLE SPOTLIGHT QUICK-PEEK POPOVER (Apple HIG Goldstandard) */}
      {/* ========================================================================= */}
      {showTodayQuickPeek && (() => {
        const pool = todayNotes.length > 0 ? todayNotes : notes.filter(n => !n.is_archived);
        // Smart Apple Sorting: Open tasks first, completed tasks sorted at bottom with dimmed opacity
        const sortedPool = [...pool].sort((a, b) => {
          const aDone = a.is_completed || recentlyCompletedIds.includes(a.id);
          const bDone = b.is_completed || recentlyCompletedIds.includes(b.id);
          if (aDone && !bDone) return 1;
          if (!aDone && bDone) return -1;
          return 0;
        });
        const openCount = sortedPool.filter(n => !(n.is_completed || recentlyCompletedIds.includes(n.id))).length;
        const doneCount = sortedPool.length - openCount;

        return (
          <div
            ref={quickPeekRef}
            style={{
              position: 'absolute',
              bottom: 'calc(100% + 12px)',
              left: '-6px',
              right: '-6px',
              background: 'rgba(255, 255, 255, 0.94)',
              backdropFilter: 'blur(28px) saturate(190%)',
              WebkitBackdropFilter: 'blur(28px) saturate(190%)',
              border: '1px solid rgba(226, 232, 240, 0.85)',
              borderRadius: '22px',
              boxShadow: '0 25px 65px -12px rgba(15, 23, 42, 0.24), 0 0 0 1px rgba(255, 255, 255, 0.9) inset',
              zIndex: 1000,
              padding: '16px 18px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              animation: 'scaleUp 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
              maxHeight: '380px'
            }}
          >
            {/* Quick-Peek Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(241, 245, 249, 0.9)', paddingBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '10px',
                  background: '#e6f4ea',
                  color: '#166534',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 6px rgba(22, 101, 52, 0.1)'
                }}>
                  <Calendar size={16} />
                </div>
                <div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 850, color: '#0f172a', letterSpacing: '-0.01em' }}>
                    Tages-Fahrplan
                  </div>
                  <div style={{ fontSize: '0.70rem', color: '#64748b', fontWeight: 600 }}>
                    {openCount} offene Aufgabe{openCount === 1 ? '' : 'n'} {doneCount > 0 ? `• ${doneCount} erledigt` : ''}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowTodayQuickPeek(false);
                    setShowBoardModal(true);
                  }}
                  style={{
                    border: '1px solid #e2e8f0',
                    background: '#ffffff',
                    color: '#0f172a',
                    borderRadius: '100px',
                    padding: '6px 12px',
                    fontSize: '0.72rem',
                    fontWeight: 750,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    transition: 'all 0.15s ease'
                  }}
                  className="hover-scale-mini"
                >
                  <Layers size={12} color="#64748b" />
                  <span>Im Board öffnen ➔</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowTodayQuickPeek(false)}
                  style={{
                    border: '1px solid #e2e8f0',
                    background: '#ffffff',
                    color: '#64748b',
                    borderRadius: '50%',
                    width: '28px',
                    height: '28px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                    transition: 'all 0.15s ease'
                  }}
                  className="hover-scale-mini"
                  title="Schließen (Esc)"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Quick-Peek Items Stream (Apple HIG Standard 40px Touch-Rows) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', overflowY: 'auto', maxHeight: '250px', paddingRight: '2px' }} className="custom-scrollbar">
              {sortedPool.map(note => {
                const isRecentlyCompleted = recentlyCompletedIds.includes(note.id);
                const isDone = note.is_completed || isRecentlyCompleted;
                const isDefectTag = note.tags?.some(t => {
                  const c = t.toLowerCase();
                  return c === '#mangel' || c === '#defekt' || c === 'mangel' || c === 'defekt';
                });
                const isDefectText = /mangel|defekt|kaputt|reparatur|stimmen|saite|notenständer/i.test(note.content);
                const isRoomIssue = note.note_type === 'room_issue' || note.visibility === 'school_admin' || (isDefectTag || isDefectText);
                const isRoomIssueOpen = isRoomIssue && !note.is_completed && !note.is_acknowledged;

                return (
                  <div
                    key={`peek-${note.id}`}
                    style={{
                      background: isDone ? 'rgba(248, 250, 252, 0.7)' : '#ffffff',
                      border: `1px solid ${isDone ? '#e2e8f0' : 'rgba(226, 232, 240, 0.9)'}`,
                      borderRadius: '12px',
                      padding: '8px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '10px',
                      minHeight: '40px',
                      boxShadow: isDone ? 'none' : '0 2px 5px rgba(0, 0, 0, 0.02)',
                      opacity: isDone ? 0.6 : 1,
                      transition: 'all 0.2s ease'
                    }}
                    className="hover-scale-mini"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                      {/* Action Button: Raummangel vs 1-Tap Checkbox */}
                      {isRoomIssueOpen ? (
                        <button
                          type="button"
                          onClick={() => setSelectedRoomIssueNote(note)}
                          style={{
                            background: '#fee2e2',
                            border: '1px solid #fca5a5',
                            borderRadius: '8px',
                            padding: '3px 5px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            color: '#dc2626',
                            flexShrink: 0,
                            boxShadow: '0 1px 3px rgba(220, 38, 38, 0.12)'
                          }}
                          title="Beim Sekretariat gemeldet – Klicken für Erledigungs-Optionen"
                          className="hover-scale-mini"
                        >
                          <DoorOpen size={13} color="#dc2626" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleWidgetToggleComplete(note.id, Boolean(note.is_completed))}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: isDone ? '#34a853' : '#94a3b8',
                            cursor: 'pointer',
                            padding: '2px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}
                          title={isDone ? 'Als offen markieren' : 'Abhaken'}
                        >
                          {isDone ? <CheckCircle2 size={18} color="#34a853" /> : <Circle size={18} color="#94a3b8" />}
                        </button>
                      )}

                      {/* Content */}
                      <span style={{
                        fontSize: '0.84rem',
                        color: isDone ? '#94a3b8' : '#0f172a',
                        textDecoration: isDone ? 'line-through' : 'none',
                        fontWeight: isDone ? 500 : 650,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {formatCleanNoteContent(note.content, note.student_name)}
                      </span>

                      {/* Student Badge */}
                      {note.student_name && (
                        <span style={{
                          fontSize: '0.66rem',
                          color: '#166534',
                          fontWeight: 750,
                          background: '#e6f4ea',
                          border: '1px solid #bbf7d0',
                          padding: '2px 7px',
                          borderRadius: '6px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          flexShrink: 0
                        }}>
                          <User size={8} />
                          {maskStudentName(note.student_name)}
                        </span>
                      )}

                      {/* Room Badge */}
                      {(() => {
                        const popoverRoom = (() => {
                          if (note.room_id && note.room_id.toLowerCase() !== 'raum') return note.room_id;
                          const tagRoom = (note.tags || []).find(t => {
                            const clean = t.replace(/^#/, '').toLowerCase();
                            return clean.startsWith('raum') || clean.startsWith('saal') || clean.startsWith('studio') || clean.startsWith('keller') || clean.startsWith('eg') || clean.startsWith('og') || clean.startsWith('konzertsaal');
                          });
                          if (tagRoom) {
                            const cleanTag = tagRoom.replace(/^#/, '').trim();
                            if (cleanTag.toLowerCase() !== 'raum') return cleanTag.charAt(0).toUpperCase() + cleanTag.slice(1);
                          }
                          const match = note.content.match(/(?:!|#|\b)(Raum\s*\d+|Saal\s*\d*|Studio\s*\d*|Konzertsaal|Bandraum|Keller|EG|OG\s*\d*)\b/i);
                          if (match) return match[1].trim();
                          return note.room_id || (note.note_type === 'room_issue' ? 'Raum' : null);
                        })();
                        const isPopRoom = Boolean(popoverRoom || note.note_type === 'room_issue');

                        return (
                          <>
                            {isPopRoom && (
                              <span style={{
                                fontSize: '0.64rem',
                                fontWeight: 750,
                                padding: '2px 6px',
                                borderRadius: '6px',
                                background: '#fee2e2',
                                color: '#991b1b',
                                border: '1px solid #fecaca',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                flexShrink: 0
                              }}>
                                <DoorOpen size={8.5} color="#dc2626" />
                                <span>{popoverRoom || 'Raum'}</span>
                              </span>
                            )}

                            {note.tags && note.tags.filter(t => {
                              const clean = t.replace(/^#/, '').toLowerCase();
                              if (clean === 'todo' || clean === 'to-do') return false;
                              if (isPopRoom && (clean === 'raum' || (popoverRoom && clean === popoverRoom.toLowerCase()))) return false;
                              return true;
                            }).slice(0, 1).map(tag => {
                              const style = getTagBadgeStyle(tag);
                              return (
                                <span
                                  key={tag}
                                  style={{
                                    fontSize: '0.64rem',
                                    fontWeight: 750,
                                    padding: '2px 6px',
                                    borderRadius: '6px',
                                    background: style.bg,
                                    color: style.color,
                                    border: `1px solid ${style.border}`,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                    flexShrink: 0
                                  }}
                                >
                                  {renderMonochromeTagIcon(style.iconName, 8, style.color)}
                                  <span>{style.label || tag.replace(/^#/, '')}</span>
                                </span>
                              );
                            })}
                          </>
                        );
                      })()}
                    </div>

                    {/* Action button */}
                    <button
                      type="button"
                      onClick={() => { deleteNote(note.id); showToast('Notiz gelöscht'); }}
                      style={{
                        border: 'none',
                        background: 'transparent',
                        color: '#cbd5e1',
                        cursor: 'pointer',
                        padding: '4px',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        transition: 'color 0.15s ease'
                      }}
                      className="hover-scale-mini"
                      title="Löschen"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* 4b. RAUMMANGEL STATUS & RESOLVER MODAL (Apple HIG Action-Sheet)           */}
      {/* ========================================================================= */}
      {selectedRoomIssueNote && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.45)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '16px'
          }}
          onClick={() => setSelectedRoomIssueNote(null)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.08)',
              width: '100%',
              maxWidth: '440px',
              padding: '24px',
              animation: 'modalPop 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  background: '#fee2e2',
                  color: '#dc2626',
                  width: '38px',
                  height: '38px',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid #fecaca'
                }}>
                  <DoorOpen size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                    Raummangel Status
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.76rem', color: '#64748b' }}>
                    Gemeldet an Schulleitung & Sekretariat
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRoomIssueNote(null)}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '50%',
                  width: '30px',
                  height: '30px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#64748b',
                  cursor: 'pointer'
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Content Preview */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '12px 14px',
              marginBottom: '18px'
            }}>
              <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
                {formatCleanNoteContent(selectedRoomIssueNote.content, selectedRoomIssueNote.student_name)}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: '#dc2626', fontWeight: 650 }}>
                <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: '#dc2626' }} />
                <span>Aktiver Reparatur-Auftrag im Sekretariat</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Option 1: Selbst behoben */}
              <button
                type="button"
                onClick={async () => {
                  const nId = selectedRoomIssueNote.id;
                  setSelectedRoomIssueNote(null);
                  await resolveRoomIssue(nId, 'teacher');
                  setToastMessage('✅ Mangel als behoben gemeldet');
                  setTimeout(() => setToastMessage(null), 3000);
                }}
                style={{
                  background: '#16a34a',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  boxShadow: '0 4px 12px rgba(22, 163, 74, 0.25)',
                  transition: 'transform 0.15s ease'
                }}
                className="hover-scale-mini"
              >
                <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: '8px', padding: '6px', display: 'flex' }}>
                  <CheckCircle2 size={18} color="#ffffff" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.88rem', fontWeight: 800 }}>Selbst behoben / Entwarnung</div>
                  <div style={{ fontSize: '0.72rem', opacity: 0.9 }}>Mangel schulweit abschließen (z. B. Schraube festgezogen oder Ersatz geholt)</div>
                </div>
              </button>

              {/* Option 2: Nur für mich ausblenden */}
              <button
                type="button"
                onClick={async () => {
                  const nId = selectedRoomIssueNote.id;
                  setSelectedRoomIssueNote(null);
                  await dismissRoomIssueForTeacher(nId);
                  setToastMessage('👁️ Notiz ausgeblendet (Ticket bleibt im Sekretariat aktiv)');
                  setTimeout(() => setToastMessage(null), 3000);
                }}
                style={{
                  background: '#ffffff',
                  color: '#334155',
                  border: '1px solid #cbd5e1',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.15s ease'
                }}
                className="hover-scale-mini"
              >
                <div style={{ background: '#f1f5f9', borderRadius: '8px', padding: '6px', display: 'flex' }}>
                  <Archive size={18} color="#475569" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.88rem', fontWeight: 800 }}>Nur aus meiner Liste ausblenden</div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Ticket bleibt beim Sekretariat aktiv offen, bis Hausmeister/Verwaltung die Reparatur erledigt</div>
                </div>
              </button>
            </div>

            {/* Cancel */}
            <div style={{ marginTop: '14px', textAlign: 'center' }}>
              <button
                type="button"
                onClick={() => setSelectedRoomIssueNote(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  fontSize: '0.78rem',
                  fontWeight: 650,
                  cursor: 'pointer'
                }}
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. NOTIZEN-BOARD MODAL                                                    */}
      {/* ========================================================================= */}
      <TeacherNotesBoardModal
        isOpen={showBoardModal}
        onClose={() => setShowBoardModal(false)}
        notes={notes}
        allStudents={allStudents}
        todayStudents={todayStudents}
        user={user}
        onCreateNote={createNote}
        onUpdateNote={updateNote}
        onDeleteNote={deleteNote}
        onTogglePin={togglePin}
        onToggleCompleteTodo={toggleCompleteTodo}
        onToggleArchive={toggleArchive}
        onDismissRoomIssue={dismissRoomIssueForTeacher}
        onResolveRoomIssue={resolveRoomIssue}
        onSyncToHomeworkBook={syncToHomeworkBook}
        onUnsyncFromHomeworkBook={unsyncFromHomeworkBook}
        onOpenHomeworkModal={onOpenHomeworkModal}
      />
    </div>
  );
};
