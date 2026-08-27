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
    toggleArchive,
    syncToHomeworkBook,
    unsyncFromHomeworkBook,
    dueAlerts,
    saveStatus
  } = useNotes({ user, schoolId, activeStudent });

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

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const hasTresor = checkIsAudioTresorActive(user);

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
    const rawInstrumentRoomMatch = text.match(/!([A-Za-z0-9äöüÄÖÜß_#-\s]+?)(?:\s*\(([^)]+)\))?(?=[\s,;:\n]|$)/i);
    if (rawInstrumentRoomMatch) {
      const capturedName = rawInstrumentRoomMatch[1].trim();
      const capturedRoom = rawInstrumentRoomMatch[2] ? rawInstrumentRoomMatch[2].trim() : null;
      
      const isRoomMatch = (internalRooms || []).some((r: any) => (r.name || '').toLowerCase() === capturedName.toLowerCase());
      if (isRoomMatch) {
        detectedRoomName = capturedName;
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
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInputContent(val);
    adjustTextareaHeight();

    const cursor = e.target.selectionStart || 0;
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

    await createNote(textToSave || 'Audio-Memo', {
      studentId: studentToLink?.id || null,
      studentName: maskedStudentName,
      roomId: parsedIntent?.detectedRoomName || (parsedIntent?.isRoomIssue ? 'Raum' : null),
      authorName: authorFullName,
      audioUrl: extraAudioUrl || null,
      audioDurationSeconds: duration || null,
      dueDate: selectedDueDate || parsedIntent?.naturalDueDate || null,
      noteType: extraAudioUrl ? 'audio_memo' : isEquipmentReport ? 'room_issue' : isRoomReport ? 'room_issue' : parsedIntent?.isTodo ? 'todo' : studentToLink ? 'student_note' : 'scratchpad',
      visibility: isRoomReport ? 'school_admin' : 'private',
      tags: isEquipmentReport ? ['#Ausstattung', '#Mangel'] : undefined
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

  // SINGLE FOCUS NOTE: Determine primary active note to show (prioritize pinned, then newest unarchived)
  const focusNote = useMemo(() => {
    const unarchivedNotes = notes.filter(n => !n.is_archived);
    if (unarchivedNotes.length === 0) return null;
    const pinned = unarchivedNotes.find(n => n.is_pinned);
    if (pinned) return pinned;
    return unarchivedNotes[0];
  }, [notes]);

  const activeNotesCount = useMemo(() => {
    return notes.filter(n => !n.is_archived).length;
  }, [notes]);

  return (
    <div style={{
      background: '#ffffff',
      border: '1px solid rgba(226, 232, 240, 0.9)',
      borderRadius: '20px',
      padding: '16px 18px',
      boxShadow: '0 8px 24px -4px rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.9)',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      position: 'relative',
      fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif"
    }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'absolute',
          top: '-12px',
          right: '16px',
          background: '#0f172a',
          color: '#ffffff',
          padding: '5px 12px',
          borderRadius: '100px',
          fontSize: '0.72rem',
          fontWeight: 700,
          boxShadow: '0 6px 16px rgba(0, 0, 0, 0.15)',
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          zIndex: 40
        }}>
          <Check size={11} strokeWidth={3} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. Calm Apple Header Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '1.0rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
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
              fontSize: '0.66rem',
              fontWeight: 800
            }}>
              <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#34a853', animation: 'pulse 1s infinite' }} />
              <span>{activeMetronomeBpm} BPM Klick</span>
              <button
                type="button"
                onClick={stopMetronome}
                style={{ background: 'none', border: 'none', color: '#166534', cursor: 'pointer', padding: 0, display: 'flex' }}
                title="Metronom stoppen"
              >
                <X size={10} />
              </button>
            </div>
          )}
        </div>

        {/* Apple Action Cluster */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {/* Prominent Apple Board Pill Button */}
          <button
            type="button"
            onClick={() => setShowBoardModal(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              background: '#f8fafc',
              color: '#0f172a',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '4px 9px',
              fontSize: '0.70rem',
              fontWeight: 750,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
            }}
            className="hover-scale-mini"
            title="Vollwertiges Notizen-Board öffnen (Kanban, Archiv & Suche)"
          >
            <Layers size={11} color="#64748b" />
            <span>Notizen-Board</span>
            {activeNotesCount > 0 && (
              <span style={{
                background: '#ffffff',
                color: '#475569',
                borderRadius: '5px',
                padding: '0px 4px',
                fontSize: '0.64rem',
                fontWeight: 800,
                border: '1px solid #cbd5e1'
              }}>
                {activeNotesCount}
              </span>
            )}
            <ArrowUpRight size={10} color="#94a3b8" />
          </button>

          {/* Live Voice Dictation Button */}
          <button
            type="button"
            onClick={handleToggleVoiceDictation}
            title={isListening ? 'Diktat beenden' : 'Live Diktat (Sprache zu Text)'}
            style={{
              background: isListening ? '#0f172a' : '#f8fafc',
              color: isListening ? '#ffffff' : '#64748b',
              border: isListening ? '1px solid #0f172a' : '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '4px 7px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.68rem',
              fontWeight: 700,
              transition: 'all 0.15s ease'
            }}
          >
            <Mic size={12} color={isListening ? '#ffffff' : '#64748b'} />
            {isListening && <span>Höre zu...</span>}
          </button>
        </div>
      </div>

      {/* Overdue / Due Today Attention Banner (if present) */}
      {dueAlerts.length > 0 && (
        <div style={{
          background: '#fff1f2',
          border: '1px solid #fecdd3',
          borderRadius: '10px',
          padding: '6px 10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flex: 1 }}>
            <AlertTriangle size={13} color="#e11d48" style={{ flexShrink: 0 }} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#9f1239', letterSpacing: '0.01em' }}>
                {dueAlerts.length === 1 ? '1 fällige Notiz' : `${dueAlerts.length} fällige Notizen`}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#881337', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {dueAlerts[0].content}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              acknowledgeNote(dueAlerts[0].id);
              showToast('✓ Als erledigt markiert');
            }}
            style={{
              background: '#e11d48',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              padding: '3px 7px',
              fontSize: '0.65rem',
              fontWeight: 750,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px',
              whiteSpace: 'nowrap',
              flexShrink: 0
            }}
          >
            <Check size={10} strokeWidth={3} />
            <span>Erledigt</span>
          </button>
        </div>
      )}

      {/* 2. The Pure Paper Canvas (Zero Clutter Writing Surface) */}
      <div style={{
        background: '#f8fafc',
        borderRadius: '12px',
        padding: '10px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        border: '1px solid #f1f5f9',
        position: 'relative'
      }}>
        {/* Autocomplete Floating Dropdown */}
        {autocompleteType && suggestions.length > 0 && (
          <div style={{
            position: 'absolute',
            bottom: '100%',
            left: '8px',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            padding: '6px',
            boxShadow: '0 12px 28px -4px rgba(15,23,42,0.14), 0 4px 10px -2px rgba(0,0,0,0.04)',
            zIndex: 50,
            minWidth: '290px',
            maxWidth: '380px',
            maxHeight: '270px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            marginBottom: '6px'
          }}>
            {autocompleteType === 'room' ? (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '2px 4px 6px 4px',
                borderBottom: '1px solid #f1f5f9',
                marginBottom: '4px',
                gap: '4px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setRoomSegmentTab('all'); }}
                    style={{
                      background: roomSegmentTab === 'all' ? '#0f172a' : '#f8fafc',
                      color: roomSegmentTab === 'all' ? '#ffffff' : '#64748b',
                      border: roomSegmentTab === 'all' ? '1px solid #0f172a' : '1px solid #e2e8f0',
                      borderRadius: '6px',
                      padding: '2px 7px',
                      fontSize: '0.62rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    ⚡ Alle
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setRoomSegmentTab('equipment'); }}
                    style={{
                      background: roomSegmentTab === 'equipment' ? '#0f172a' : '#f8fafc',
                      color: roomSegmentTab === 'equipment' ? '#ffffff' : '#64748b',
                      border: roomSegmentTab === 'equipment' ? '1px solid #0f172a' : '1px solid #e2e8f0',
                      borderRadius: '6px',
                      padding: '2px 7px',
                      fontSize: '0.62rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    🎵 Instrumente
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setRoomSegmentTab('rooms'); }}
                    style={{
                      background: roomSegmentTab === 'rooms' ? '#0f172a' : '#f8fafc',
                      color: roomSegmentTab === 'rooms' ? '#ffffff' : '#64748b',
                      border: roomSegmentTab === 'rooms' ? '1px solid #0f172a' : '1px solid #e2e8f0',
                      borderRadius: '6px',
                      padding: '2px 7px',
                      fontSize: '0.62rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    🏢 Räume
                  </button>
                </div>
                <span style={{ fontSize: '0.58rem', color: '#94a3b8', fontWeight: 600 }}>⇥ Tab</span>
              </div>
            ) : (
              <div style={{ fontSize: '0.64rem', fontWeight: 800, color: '#94a3b8', padding: '3px 6px', letterSpacing: '0.03em', textTransform: 'uppercase' }}>
                {autocompleteType === 'student' ? 'Schüler auswählen (@)' : autocompleteType === 'tag' ? 'Themen-Tag (#)' : 'Schnell-Baustein (/)'}
              </div>
            )}
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
                  padding: '5px 8px',
                  borderRadius: '6px',
                  border: 'none',
                  background: idx === suggestionIndex ? '#f1f5f9' : 'transparent',
                  color: '#0f172a',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: '0.76rem',
                  fontWeight: 650
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  {s.type === 'student' ? (
                    <div style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      background: s.isToday ? '#e6f4ea' : '#f1f5f9',
                      color: s.isToday ? '#34a853' : '#64748b',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.58rem',
                      fontWeight: 800
                    }}>
                      {s.label[0] || 'S'}
                    </div>
                  ) : s.type === 'tag' ? (
                    <Hash size={11} color="#64748b" />
                  ) : s.type === 'macro' ? (
                    <Zap size={11} color="#64748b" />
                  ) : s.type === 'equipment' ? (
                    <Music size={11} color="#eab308" />
                  ) : (
                    <DoorOpen size={11} color="#64748b" />
                  )}
                  <span>{s.label}</span>
                </div>
                <span style={{ fontSize: '0.64rem', color: s.isToday ? '#166534' : '#94a3b8', fontWeight: s.isToday ? 700 : 550 }}>
                  {s.sub}
                </span>
              </button>
            ))}
          </div>
        )}

        <textarea
          ref={textareaRef}
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
              if (e.key === 'Tab' && autocompleteType === 'room' && (e.altKey || suggestions.length === 0)) {
                e.preventDefault();
                setRoomSegmentTab(prev => prev === 'all' ? 'equipment' : prev === 'equipment' ? 'rooms' : 'all');
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

            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
              e.preventDefault();
              handleSave();
            }
          }}
          placeholder={isListening ? 'Höre zu... Diktat aktiv...' : 'Gedanke, @Schüler, - To-Do, !Raum oder BPM... (⌘J)'}
          style={{
            width: '100%',
            minHeight: '44px',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            resize: 'none',
            fontSize: '0.84rem',
            color: '#0f172a',
            fontWeight: 550,
            lineHeight: 1.4,
            fontFamily: 'inherit',
            transition: 'height 0.1s ease',
            boxSizing: 'border-box'
          }}
        />

        {/* Dynamic Context Helpers & Progressive Action Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '4px' }}>
          {/* Subtle Input Hints / Triggers when empty */}
          {!inputContent.trim() && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button
                type="button"
                onClick={() => {
                  setAutocompleteType('student');
                  setAutocompleteQuery('');
                  if (!inputContent.includes('@')) setInputContent('@');
                  setTimeout(() => textareaRef.current?.focus(), 10);
                }}
                style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '0.66rem', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '2px 4px' }}
              >
                <User size={10} />
                <span>@Schüler</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setInputContent('- ');
                  setTimeout(() => textareaRef.current?.focus(), 10);
                }}
                style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '0.66rem', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '2px 4px' }}
              >
                <CheckSquare size={10} />
                <span>To-Do</span>
              </button>
              <button
                type="button"
                onClick={() => setShowQuickTemplates(prev => !prev)}
                style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '0.66rem', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '2px 4px' }}
              >
                <Sparkles size={10} />
                <span>Vorlagen</span>
              </button>
            </div>
          )}

          {/* Progressive Action Pill Bar when text is entered */}
          {inputContent.trim() && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '6px', paddingTop: '4px', borderTop: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                {Boolean(parsedIntent?.detectedStudent) && (
                  <button
                    type="button"
                    onClick={handleDirectHomeworkTransfer}
                    style={{
                      background: '#0f172a',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '4px 8px',
                      fontSize: '0.70rem',
                      fontWeight: 750,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <BookOpen size={11} />
                    <span>Ins Hausaufgabenheft ({parsedIntent?.detectedStudent.first_name || parsedIntent?.detectedStudent.name}) ➔</span>
                  </button>
                )}

                {/* Due Date Trigger */}
                <div style={{ position: 'relative' }}>
                  <button
                    type="button"
                    onClick={() => setShowDatePicker(prev => !prev)}
                    style={{
                      background: (selectedDueDate || parsedIntent?.naturalDueDate) ? '#eff6ff' : '#ffffff',
                      color: (selectedDueDate || parsedIntent?.naturalDueDate) ? '#1e40af' : '#475569',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      padding: '3px 7px',
                      fontSize: '0.68rem',
                      fontWeight: 750,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px'
                    }}
                  >
                    <Calendar size={10} />
                    <span>{(selectedDueDate || parsedIntent?.naturalDueDate) ? formatDueDateBadge(selectedDueDate || parsedIntent!.naturalDueDate!).label : 'Fälligkeit'}</span>
                  </button>
                  {showDatePicker && (
                    <div style={{
                      position: 'absolute',
                      bottom: '100%',
                      left: 0,
                      marginBottom: '6px',
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      padding: '4px',
                      boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15)',
                      zIndex: 60,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px',
                      minWidth: '120px'
                    }}>
                      <button
                        type="button"
                        onClick={() => { setSelectedDueDate(getQuickDate('today')); setShowDatePicker(false); }}
                        style={{ padding: '4px 6px', border: 'none', background: 'transparent', textAlign: 'left', fontSize: '0.72rem', fontWeight: 600, color: '#0f172a', cursor: 'pointer' }}
                      >
                        📅 Heute
                      </button>
                      <button
                        type="button"
                        onClick={() => { setSelectedDueDate(getQuickDate('tomorrow')); setShowDatePicker(false); }}
                        style={{ padding: '4px 6px', border: 'none', background: 'transparent', textAlign: 'left', fontSize: '0.72rem', fontWeight: 600, color: '#0f172a', cursor: 'pointer' }}
                      >
                        📅 Morgen
                      </button>
                      <button
                        type="button"
                        onClick={() => { setSelectedDueDate(getQuickDate('friday')); setShowDatePicker(false); }}
                        style={{ padding: '4px 6px', border: 'none', background: 'transparent', textAlign: 'left', fontSize: '0.72rem', fontWeight: 600, color: '#0f172a', cursor: 'pointer' }}
                      >
                        📅 Bis Freitag
                      </button>
                    </div>
                  )}
                </div>

                {parsedIntent?.bpm && (
                  <button
                    type="button"
                    onClick={() => toggleMetronome(parsedIntent.bpm!)}
                    style={{
                      background: activeMetronomeBpm === parsedIntent.bpm ? '#34a853' : '#ffffff',
                      color: activeMetronomeBpm === parsedIntent.bpm ? '#ffffff' : '#0f172a',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      padding: '3px 7px',
                      fontSize: '0.68rem',
                      fontWeight: 750,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px'
                    }}
                  >
                    <Play size={9} />
                    <span>{parsedIntent.bpm} BPM</span>
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => handleSave()}
                style={{
                  background: '#0f172a',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '4px 10px',
                  fontSize: '0.70rem',
                  fontWeight: 750,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Check size={11} strokeWidth={2.5} />
                <span>Sichern (⌘↵)</span>
              </button>
            </div>
          )}
        </div>

        {/* Quick Templates Popover Trigger (when clicked) */}
        {showQuickTemplates && !inputContent.trim() && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            overflowX: 'auto',
            paddingTop: '6px',
            borderTop: '1px dashed #e2e8f0',
            scrollbarWidth: 'none'
          }}>
            {QUICK_SNIPPETS.map((snippet) => {
              const IconComp = snippet.icon;
              const snippetStyles: Record<string, { bg: string; border: string; color: string }> = {
                takt: { bg: '#eff6ff', border: '#bfdbfe', color: '#1e40af' },
                tonleiter: { bg: '#fef9c3', border: '#fef08a', color: '#854d0e' },
                playalong: { bg: '#f3e8ff', border: '#e9d5ff', color: '#6b21a8' },
                buch: { bg: '#f0fdf4', border: '#bbf7d0', color: '#15803d' },
                todo: { bg: '#eff6ff', border: '#bfdbfe', color: '#2563eb' },
                raum: { bg: '#fee2e2', border: '#fecaca', color: '#dc2626' }
              };
              const sStyle = snippetStyles[snippet.id] || { bg: '#f8fafc', border: '#e2e8f0', color: '#475569' };
              return (
                <button
                  key={snippet.id}
                  type="button"
                  onClick={() => insertSnippet(snippet.snippet)}
                  style={{
                    background: sStyle.bg,
                    border: `1px solid ${sStyle.border}`,
                    borderRadius: '100px',
                    padding: '2px 8px',
                    fontSize: '0.64rem',
                    fontWeight: 750,
                    color: sStyle.color,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    whiteSpace: 'nowrap',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                  }}
                >
                  <IconComp size={9} color={sStyle.color} />
                  <span>{snippet.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. The Single Focus Note Stage ("Zuletzt Notiert" / "Aktiver Fokus") */}
      {focusNote ? (
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '9px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '5px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
          position: 'relative'
        }}>
          {/* Focus Card Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.03em', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Clock size={9} color="#94a3b8" />
              <span>{focusNote.is_pinned ? '📌 Angepinnter Fokus' : 'Zuletzt notiert'}</span>
            </span>

            <button
              type="button"
              onClick={() => setShowBoardModal(true)}
              style={{
                background: 'none',
                border: 'none',
                color: '#64748b',
                fontSize: '0.65rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '2px',
                padding: 0
              }}
            >
              <span>Alle {activeNotesCount} im Board</span>
              <ArrowUpRight size={10} />
            </button>
          </div>

          {/* Focus Card Content */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '7px', flex: 1, minWidth: 0 }}>
              {(focusNote.note_type === 'todo' || focusNote.tags.includes('todo') || focusNote.content.startsWith('- ')) && (
                <button
                  type="button"
                  onClick={() => {
                    toggleCompleteTodo(focusNote.id);
                    showToast(focusNote.is_completed ? 'Als offen markiert' : '✓ Erledigt');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: focusNote.is_completed ? '#34a853' : '#94a3b8',
                    cursor: 'pointer',
                    padding: 0,
                    marginTop: '1px',
                    display: 'flex',
                    flexShrink: 0
                  }}
                >
                  {focusNote.is_completed ? <CheckCircle2 size={15} /> : <Circle size={15} />}
                </button>
              )}

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: '0.80rem',
                  color: focusNote.is_completed ? '#94a3b8' : '#0f172a',
                  textDecoration: focusNote.is_completed ? 'line-through' : 'none',
                  lineHeight: 1.35,
                  fontWeight: 600,
                  wordBreak: 'break-word'
                }}>
                  {formatCleanNoteContent(focusNote.content, focusNote.student_name)}
                </div>

                {/* Focus Card Badges (Student, Tag, Due Date) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap', marginTop: '3px' }}>
                  {focusNote.student_name && (
                    <span style={{ fontSize: '0.64rem', color: '#166534', fontWeight: 750, background: '#e6f4ea', padding: '1px 5px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                      <User size={8} />
                      {maskStudentName(focusNote.student_name)}
                    </span>
                  )}
                  {focusNote.tags && focusNote.tags.filter(t => t !== 'todo' && t !== '#To-Do').map(tag => {
                    const style = getTagBadgeStyle(tag);
                    return (
                      <span
                        key={tag}
                        style={{
                          fontSize: '0.62rem',
                          fontWeight: 750,
                          padding: '1px 5px',
                          borderRadius: '4px',
                          background: style.bg,
                          color: style.color,
                          border: `1px solid ${style.border}`,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '2px'
                        }}
                      >
                        {renderMonochromeTagIcon(style.iconName, 8, style.color)}
                        <span>{tag.replace(/^#/, '')}</span>
                      </span>
                    );
                  })}
                  {focusNote.due_date && (
                    <span style={{
                      fontSize: '0.62rem',
                      fontWeight: 750,
                      padding: '1px 5px',
                      borderRadius: '4px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '2px',
                      background: formatDueDateBadge(focusNote.due_date).isOverdue ? '#fee2e2' : formatDueDateBadge(focusNote.due_date).isToday ? '#fef3c7' : '#eff6ff',
                      color: formatDueDateBadge(focusNote.due_date).isOverdue ? '#991b1b' : formatDueDateBadge(focusNote.due_date).isToday ? '#92400e' : '#1e40af'
                    }}>
                      <Calendar size={8} />
                      <span>{formatDueDateBadge(focusNote.due_date).label}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Actions for Focus Note */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0 }}>
              {!syncedIds.has(focusNote.id) && focusNote.visibility !== 'student_shared' && (focusNote.student_id || focusNote.student_name) && (
                <button
                  type="button"
                  onClick={async () => {
                    const sId = focusNote.student_id;
                    const sName = focusNote.student_name;
                    if (sId) {
                      await syncToHomeworkBook(focusNote, sId, sName || undefined);
                      setSyncedIds(prev => new Set([...Array.from(prev), focusNote.id]));
                      showToast('✓ Ins Hausaufgabenheft übertragen');
                    }
                  }}
                  title="Ins Hausaufgabenheft übertragen"
                  style={{
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    color: '#166534',
                    cursor: 'pointer',
                    padding: '3px 6px',
                    borderRadius: '5px',
                    fontSize: '0.64rem',
                    fontWeight: 750,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '3px'
                  }}
                >
                  <BookOpen size={10} />
                  <span>Hausaufgabe</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => togglePin(focusNote.id)}
                title={focusNote.is_pinned ? 'Lösen' : 'Anpinnen'}
                style={{
                  background: 'none',
                  border: 'none',
                  color: focusNote.is_pinned ? '#0f172a' : '#94a3b8',
                  cursor: 'pointer',
                  padding: '3px'
                }}
              >
                <Pin size={11} />
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteNote(focusNote.id);
                  showToast('Notiz gelöscht');
                }}
                title="Löschen"
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#cbd5e1',
                  cursor: 'pointer',
                  padding: '3px'
                }}
              >
                <Trash2 size={11} />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div style={{
          padding: '8px 10px',
          textAlign: 'center',
          fontSize: '0.72rem',
          color: '#94a3b8',
          fontWeight: 550,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '5px'
        }}>
          <Sparkles size={11} color="#cbd5e1" />
          <span>Keine offenen Notizen • Schreibe oben eine Notiz oder ein To-Do</span>
        </div>
      )}

      {/* 4. Minimalist Footer */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: '6px',
        borderTop: '1px solid #f1f5f9',
        fontSize: '0.65rem',
        color: '#94a3b8',
        fontWeight: 600
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#34a853' }} />
          <span>Auto-Sync</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span 
            onClick={() => setShowBoardModal(true)}
            style={{ color: '#64748b', cursor: 'pointer', fontWeight: 700 }}
          >
            Board öffnen ➔
          </span>
          <span>
            Shortcut <kbd style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '1px 3px', fontFamily: 'monospace' }}>⌘J</kbd>
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. FULL-FEATURED TRELLO-INSPIRED NOTIZEN-BOARD MODAL                     */}
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
        onSyncToHomeworkBook={syncToHomeworkBook}
        onUnsyncFromHomeworkBook={unsyncFromHomeworkBook}
        onOpenHomeworkModal={onOpenHomeworkModal}
      />
    </div>
  );
};
