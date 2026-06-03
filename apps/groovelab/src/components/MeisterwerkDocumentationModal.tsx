import React, { useState, useEffect, useMemo } from 'react';
import { X, Check, Award, Flame, AlertCircle, BookOpen, Music, History, Plus, ChevronRight, Book, Star } from 'lucide-react';
import Confetti from 'react-confetti';
import { supabase } from '../lib/supabase';

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  photo_url?: string;
  school_id?: string;
  schoolId?: string;
}

interface MeisterwerkDocumentationModalProps {
  student: Student;
  onClose: () => void;
  teacherId?: string;
  initialLehrwerkId?: string;
}

interface ProgressItem {
  id?: string;
  topic_name: string;
  status: 'IN_PROGRESS' | 'THEORY_DONE' | 'MASTERED';
  is_current_homework: boolean;
  teacher_notes: string;
  homework_notes?: string;
  updated_at?: string;
}

const getISOWeekRaw = (dateInput?: string | Date, lessonDay: number = 1): string => {
  let date: Date;
  if (!dateInput) {
    date = new Date();
  } else if (dateInput instanceof Date) {
    date = dateInput;
  } else {
    const match = String(dateInput).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const year = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1; // 0-indexed
      const day = parseInt(match[3], 10);
      date = new Date(year, month, day);
    } else {
      date = new Date(dateInput);
    }
  }
  
  if (isNaN(date.getTime())) {
    date = new Date();
  }

  // Adjust the date back to the most recent lesson day
  const currentDay = date.getDay(); // 0 (Sun) to 6 (Sat)
  let diff = currentDay - lessonDay;
  if (diff < 0) {
    diff += 7;
  }
  
  const lessonStart = new Date(date);
  lessonStart.setDate(date.getDate() - diff);

  const d = new Date(Date.UTC(lessonStart.getFullYear(), lessonStart.getMonth(), lessonStart.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
};

const getInstrumentAvatarUrl = (instrument: string | null | undefined): string => {
  if (!instrument) return '/avatars/gitarre_avatar_new.png';
  const inst = instrument.toLowerCase().trim();
  if (inst.includes('e-gitarre')) return '/avatars/egitarre_avatar.png';
  if (inst.includes('guitar') || inst.includes('gitarre')) return '/avatars/gitarre_avatar_new.png';
  if (inst.includes('e-bass')) return '/avatars/ebass_avatar.png';
  if (inst.includes('kontrabass') || inst.includes('double bass')) return '/avatars/kontrabass_avatar.png';
  if (inst.includes('bass')) return '/avatars/bass_avatar.png';
  if (inst.includes('drum') || inst.includes('schlagzeug')) return '/avatars/schlagzeug_avatar.png';
  if (inst.includes('piano') || inst.includes('keys') || inst.includes('klavier') || inst.includes('keyboard')) return '/avatars/klavier_avatar_new.png';
  if (inst.includes('vocal') || inst.includes('gesang') || inst.includes('stimme') || inst.includes('singer')) return '/avatars/gesang_avatar.png';
  if (inst.includes('trompete') || inst.includes('trumpet')) return '/avatars/trompete_avatar_new.png';
  if (inst.includes('posaune') || inst.includes('trombone')) return '/avatars/posaune_avatar.png';
  if (inst.includes('horn')) return '/avatars/horn_avatar_new.png';
  if (inst.includes('cello')) return '/avatars/cello_avatar_new.png';
  if (inst.includes('geige') || inst.includes('violin') || inst.includes('violine')) return '/avatars/violine_avatar_new.png';
  if (inst.includes('klarinette') || inst.includes('clarinet')) return '/avatars/klarinette_avatar_new.png';
  if (inst.includes('querflöte') || inst.includes('flute')) return '/avatars/querfloete_avatar.png';
  if (inst.includes('saxofon') || inst.includes('saxophone') || inst.includes('sax')) return '/avatars/saxophon_avatar_new.png';
  if (inst.includes('blockflöte') || inst.includes('recorder') || inst.includes('blockfloete')) return '/avatars/blockfloete_avatar.png';
  if (inst.includes('bariton') || inst.includes('baritone')) return '/avatars/bariton_avatar.png';
  if (inst.includes('oboe')) return '/avatars/oboe_avatar.png';
  return '/avatars/gitarre_avatar_new.png';
};

export const formatPageNumbers = (pages: number[]): string => {
  if (pages.length === 0) return '';
  const sorted = [...pages].sort((a, b) => a - b);
  const ranges: string[] = [];
  let start = sorted[0];
  let end = start;

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === end + 1) {
      end = sorted[i];
    } else {
      if (start === end) {
        ranges.push(`${start}`);
      } else {
        ranges.push(`${start}–${end}`);
      }
      start = sorted[i];
      end = start;
    }
  }
  if (start === end) {
    ranges.push(`${start}`);
  } else {
    ranges.push(`${start}–${end}`);
  }
  
  if (ranges.length === 1) return `S. ${ranges[0]}`;
  const last = ranges.pop();
  return `S. ${ranges.join(', ')} & ${last}`;
};

export const MeisterwerkDocumentationModal: React.FC<MeisterwerkDocumentationModalProps> = ({ student, onClose, teacherId, initialLehrwerkId }) => {
  const [studentInstrument, setStudentInstrument] = useState<string | null>(null);
  const [studentSchoolId, setStudentSchoolId] = useState<string | null>(null);
  const [progressItems, setProgressItems] = useState<ProgressItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Left column navigation tab
  const [leftTab, setLeftTab] = useState<'lehrwerke' | 'songs' | 'history'>('lehrwerke');

  // Form State for editing / adding
  const [activeItem, setActiveItem] = useState<ProgressItem | null>(null);
  const [topicName, setTopicName] = useState('');
  const [status, setStatus] = useState<'IN_PROGRESS' | 'THEORY_DONE' | 'MASTERED'>('IN_PROGRESS');
  const [isCurrentHomework, setIsCurrentHomework] = useState(false);
  const [teacherNotes, setTeacherNotes] = useState('');
  const [homeworkNotes, setHomeworkNotes] = useState('');
  const [homeworkNotesList, setHomeworkNotesList] = useState<string[]>([]);
  const homeworkTextareaRef = React.useRef<HTMLTextAreaElement>(null);

  // Song catalog integration
  const [activeInputTab, setActiveInputTab] = useState<'free' | 'catalog' | 'lehrwerk_page' | 'active_song'>('free');
  const [songs, setSongs] = useState<any[]>([]);
  const [songsLoading, setSongsLoading] = useState(false);
  const [songSearch, setSongSearch] = useState('');
  const [selectedSongId, setSelectedSongId] = useState<string>('');
  const [songPart, setSongPart] = useState('');

  // Lehrwerke assigned to student states
  const [globalLehrwerke, setGlobalLehrwerke] = useState<any[]>([]);
  const [assignedLehrwerke, setAssignedLehrwerke] = useState<any[]>([]);
  const [activeLehrwerkId, setActiveLehrwerkId] = useState<string | null>(null);
  const [activePageNumber, setActivePageNumber] = useState<number | null>(null);
  const [activeSubView, setActiveSubView] = useState<'hub' | 'lehrwerk' | 'song' | 'history'>('hub');
  const [selectedHistoryWeek, setSelectedHistoryWeek] = useState<string | null>(null);
  const [songProgressPercent, setSongProgressPercent] = useState<number>(25);

  const getLehrwerkColor = (title: string) => {
    const trimmed = (title || '').trim();
    let hash = 0;
    for (let i = 0; i < trimmed.length; i++) {
      hash = trimmed.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    return {
      from: `hsl(${hue}, 85%, 94%)`,
      to: `hsl(${hue}, 80%, 84%)`,
      text: `hsl(${hue}, 90%, 25%)`,
      shadowFrom: `hsla(${hue}, 85%, 50%, 0.2)`,
      shadowTo: `hsla(${hue}, 80%, 40%, 0.15)`
    };
  };

  const getSongColor = (title: string) => {
    const trimmed = (title || '').trim();
    const firstChar = trimmed.charAt(0).toUpperCase();
    const charCode = firstChar.charCodeAt(0) || 65;
    const clampedCode = Math.max(65, Math.min(90, charCode));
    const hue = Math.round(((clampedCode - 65) / 25) * 360);
    return {
      from: `hsl(${hue}, 85%, 94%)`,
      to: `hsl(${hue}, 80%, 84%)`,
      text: `hsl(${hue}, 90%, 25%)`,
      shadowFrom: `hsla(${hue}, 85%, 50%, 0.2)`,
      shadowTo: `hsla(${hue}, 80%, 40%, 0.15)`
    };
  };

  const [pageGroupIndex, setPageGroupIndex] = useState(0);
  const [showAssignDropdown, setShowAssignDropdown] = useState(false);

  // Active Songs
  const [activeSongSkills, setActiveSongSkills] = useState<any[]>([]);
  const [selectedActiveSongId, setSelectedActiveSongId] = useState<string>('');
  const [rhythmVal, setRhythmVal] = useState<number>(25);
  const [fingerVal, setFingerVal] = useState<number>(25);
  const [expressionVal, setExpressionVal] = useState<number>(25);
  const [isSubSlidersExpanded, setIsSubSlidersExpanded] = useState<boolean>(false);

  // Active paintbrush mode
  const [activeBrush, setActiveBrush] = useState<'NONE' | 'LOCKED' | 'HOMEWORK' | 'MASTERED' | 'THEORY'>('NONE');
  const [showAllPagesGrid, setShowAllPagesGrid] = useState(false);
  const [isSongSearchFocused, setIsSongSearchFocused] = useState(false);

  // Session log to capture all modifications made in current modal open state
  const [sessionLogs, setSessionLogs] = useState<string[]>([]);
  const [lessonDay, setLessonDay] = useState<number>(1); // Default to Monday = 1
  const [activeModalTab, setActiveModalTab] = useState<'document' | 'logbook'>('document');
  const [useNotebookLayout, setUseNotebookLayout] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('meisterwerk_notebook_layout');
      return saved !== 'false'; // defaults to true if not explicitly set to 'false'
    }
    return true;
  });
  const [pageUndoStack, setPageUndoStack] = useState<{ lehrwerkId: string, pageNum: number, prevStatus: any }[]>([]);
  const [hasChanges, setHasChanges] = useState<boolean>(false);

  const handleClose = () => {
    if (hasChanges) {
      if (confirm('Du hast ungespeicherte Änderungen. Möchtest du das Protokoll wirklich schließen, ohne zu speichern?')) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  const getISOWeek = (dateInput?: string | Date): string => {
    return getISOWeekRaw(dateInput, lessonDay);
  };

  // Custom song creation form states
  const [showCreateSongModal, setShowCreateSongModal] = useState(false);
  const [newSongTitle, setNewSongTitle] = useState('');
  const [newSongArtist, setNewSongArtist] = useState('');

  const getCurrentTeacherId = async (): Promise<string> => {
    if (teacherId) return teacherId;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) return user.id;

      // Fallback: Query first teacher in users table
      const { data: teachers } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'teacher')
        .limit(1);
      if (teachers && teachers.length > 0) {
        return teachers[0].id;
      }
    } catch (e) {
      console.error('Error determining teacher ID:', e);
    }
    // Hard fallback UUID
    return 'd3b07384-d113-4ec2-a5d6-6d2c12345678';
  };



  // Fetch student's school's songs catalog
  useEffect(() => {
    async function loadSongs() {
      setSongsLoading(true);
      try {
        const { data: studentUser, error: studentError } = await supabase
          .from('users')
          .select('school_id')
          .eq('id', student.id)
          .single();

        if (studentError) throw studentError;

        if (studentUser?.school_id) {
          let sq = supabase
            .from('songs')
            .select('*')
            .eq('school_id', studentUser.school_id);
          
          if (teacherId) {
            sq = sq.eq('teacher_id', teacherId);
          }
          
          const { data: songsData, error: songsError } = await sq.order('title', { ascending: true });

          if (songsError) throw songsError;
          setSongs(songsData || []);
        }
      } catch (err) {
        console.error('Error loading catalog songs:', err);
      } finally {
        setSongsLoading(false);
      }
    }
    if (student.id) {
      loadSongs();
    }
  }, [student.id]);

  useEffect(() => {
    const loadLessonDay = async () => {
      try {
        const { data } = await supabase
          .from('schedules')
          .select('day_of_week')
          .eq('student_id', student.id)
          .limit(1);
        if (data && data.length > 0 && data[0].day_of_week !== undefined) {
          setLessonDay(data[0].day_of_week);
        }
      } catch (e) {
        console.error('Error loading lesson day:', e);
      }
    };
    if (student.id) {
      loadLessonDay();
    }
  }, [student.id]);

  // Load Lehrwerke data from Supabase
  const loadLehrwerke = async (resolvedSchoolId?: string) => {
    try {
      const activeTId = await getCurrentTeacherId();
      
      let query = supabase.from('lehrwerke').select('*');
      const schoolId = resolvedSchoolId || student?.school_id || student?.schoolId || studentSchoolId;
      if (schoolId) {
        query = query.eq('school_id', schoolId);
      }
      const { data: lehrwerkeData, error } = await query.order('title');
      if (error) throw error;

      if (lehrwerkeData && lehrwerkeData.length > 0) {
        const mapped = lehrwerkeData.map((item: any) => ({
          ...item,
          totalPages: item.total_pages || 50,
          emoji: item.emoji || '📖',
          color: item.color || '#456355'
        }));
        setGlobalLehrwerke(mapped);
      } else {
        setGlobalLehrwerke([]);
      }

      const storedAssigned = localStorage.getItem('student_lehrwerke_progress');
      if (storedAssigned) {
        const parsedAssigned = JSON.parse(storedAssigned);
        const filtered = parsedAssigned.filter((item: any) => item.studentId === student.id);
        setAssignedLehrwerke(filtered);
      } else {
        setAssignedLehrwerke([]);
      }
    } catch (e) {
      console.error('Error loading Lehrwerke in modal:', e);
    }
  };

  // Load Student's active song skills
  const loadActiveSongSkills = async () => {
    try {
      const { data: skillsData, error } = await supabase
        .from('user_song_skills')
        .select('*, songs(*)')
        .eq('user_id', student.id);
      
      if (error) throw error;
      setActiveSongSkills(skillsData || []);
    } catch (e) {
      console.error('Error loading active songs in modal:', e);
    }
  };

  // Fetch student's progress matrix history
  const fetchProgress = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: dbError } = await supabase
        .from('progress_matrix')
        .select('*')
        .eq('student_id', student.id)
        .order('updated_at', { ascending: false });

      if (dbError) throw dbError;
      setProgressItems(data || []);

      // Pre-populate homeworkNotes with the current week's active homework notes if found
      const currentWeek = getISOWeek();
      const currentWeekHomework = (data || []).find(item => 
        item.homework_notes && 
        item.homework_notes.trim() !== '' && 
        item.updated_at && 
        getISOWeek(item.updated_at) === currentWeek
      ) || (data || []).find(item => 
        item.is_current_homework && 
        item.homework_notes && 
        item.homework_notes.trim() !== ''
      );
      if (currentWeekHomework) {
        const rawNotes = currentWeekHomework.homework_notes;
        try {
          if (rawNotes.startsWith('[') && rawNotes.endsWith(']')) {
            setHomeworkNotesList(JSON.parse(rawNotes));
          } else {
            // Backward compatibility: filter out old bullet logs
            const cleanNotes = rawNotes
              .split('\n')
              .filter((line: string) => !line.trim().startsWith('• 📖') && !line.trim().startsWith('• 🎵') && !line.trim().startsWith('• 🗑️'))
              .join('\n')
              .trim();
            if (cleanNotes) {
              setHomeworkNotesList(cleanNotes.split('\n\n').filter(Boolean));
            } else {
              setHomeworkNotesList([]);
            }
          }
        } catch (e) {
          setHomeworkNotesList([rawNotes]);
        }
      } else {
        setHomeworkNotesList([]);
      }
      setHomeworkNotes(''); // Keep input textarea completely clean!
    } catch (err: any) {
      console.error('Error fetching progress:', err);
      setError('Fehler beim Laden des Lernfortschritts.');
    } finally {
      setLoading(false);
    }
  };

  const notifyHomeworkChange = async () => {
    // 1. Dispatch custom DOM event for same-window / local sync
    window.dispatchEvent(new CustomEvent('homework-updated', { detail: { studentId: student.id } }));

    // 2. Broadcast on Supabase channel for cross-browser / cross-device real-time websocket sync
    try {
      const channel = supabase.channel(`realtime_student_progress_${student.id}`);
      await channel.send({
        type: 'broadcast',
        event: 'homework-changed',
        payload: { studentId: student.id }
      });
    } catch (e) {
      console.warn('Realtime broadcast error:', e);
    }
  };


  useEffect(() => {
    if (student.id) {
      fetchProgress();
      loadLehrwerke();
      loadActiveSongSkills();

      const fetchProfile = async () => {
        try {
          const { data, error } = await supabase
            .from('users')
            .select('instrument, school_id')
            .eq('id', student.id)
            .single();
          if (!error && data) {
            if (data.instrument) {
              setStudentInstrument(data.instrument);
            }
            if (data.school_id) {
              setStudentSchoolId(data.school_id);
              loadLehrwerke(data.school_id);
            }
          }
        } catch (e) {
          console.error('Error loading student profile in modal:', e);
        }
      };
      fetchProfile();
    }
  }, [student.id]);

  useEffect(() => {
    if (initialLehrwerkId && globalLehrwerke.length > 0) {
      const isAssigned = assignedLehrwerke.some(a => a.lehrwerkId === initialLehrwerkId);
      if (!isAssigned) {
        handleAssignLehrwerk(initialLehrwerkId);
      } else if (activeLehrwerkId !== initialLehrwerkId) {
        selectTextbookPage(initialLehrwerkId, 1);
      }
    }
  }, [initialLehrwerkId, globalLehrwerke, assignedLehrwerke]);

  // Dynamically auto-expand the homework textarea height as more content gets entered
  useEffect(() => {
    if (homeworkTextareaRef.current) {
      homeworkTextareaRef.current.style.height = 'auto';
      homeworkTextareaRef.current.style.height = `${Math.max(90, homeworkTextareaRef.current.scrollHeight)}px`;
    }
  }, [homeworkNotes]);

  const selectItemForEditing = (item: ProgressItem) => {
    setActiveItem(item);
    setTopicName(item.topic_name);
    setStatus(item.status);
    setIsCurrentHomework(item.is_current_homework);
    setTeacherNotes(item.teacher_notes || '');
    setHomeworkNotes('');
    setActiveInputTab('free');
  };

  const handleCreateNew = () => {
    setActiveItem(null);
    setTopicName('');
    setStatus('IN_PROGRESS');
    setIsCurrentHomework(false);
    setTeacherNotes('');
    setHomeworkNotes('');
    setActiveInputTab('free');
    setSelectedSongId('');
    setSongPart('');
    setActivePageNumber(null);
    setSelectedActiveSongId('');
  };

  const handleResetAllCurrentHomework = async () => {
    try {
      const activeIds = progressItems.filter(item => item.is_current_homework).map(item => item.id);
      if (activeIds.length === 0) return;

      const { error } = await supabase
        .from('progress_matrix')
        .update({ is_current_homework: false })
        .in('id', activeIds);

      if (error) throw error;

      setSessionLogs(prev => [...prev, `🗑️ Alle aktiven Hausaufgaben zurückgesetzt/deaktiviert`]);
      await fetchProgress();
      notifyHomeworkChange();
    } catch (e) {
      console.error('Error resetting current homework:', e);
    }
  };

  const handleRemoveHomeworkItem = async (itemId: string, bookTitle?: string, pageNum?: number) => {
    try {
      // If it's a textbook page, we update its status to 'IN_PROGRESS' in progress_matrix
      // to make it turn red (unbearbeitet/in progress) when removed from active homework.
      let updatePayload: any = { is_current_homework: false };
      if (bookTitle && pageNum !== undefined) {
        updatePayload.status = 'IN_PROGRESS';
      }

      const { error } = await supabase
        .from('progress_matrix')
        .update(updatePayload)
        .eq('id', itemId);

      if (error) throw error;

      if (bookTitle && pageNum !== undefined) {
        const book = globalLehrwerke.find(b => b.title === bookTitle);
        if (book) {
          const stored = localStorage.getItem('student_lehrwerke_progress');
          const parsed = stored ? JSON.parse(stored) : [];
          
          const updated = parsed.map((item: any) => {
            if (item.studentId === student.id && item.lehrwerkId === book.id) {
              const pageStates = { ...item.pageStates };
              pageStates[pageNum] = {
                ...pageStates[pageNum],
                status: 'locked',
                updatedAt: new Date().toISOString()
              };
              return { ...item, pageStates };
            }
            return item;
          });
          
          localStorage.setItem('student_lehrwerke_progress', JSON.stringify(updated));
          
          const globalStored = localStorage.getItem('campus_lehrwerke');
          if (globalStored) {
            const books = JSON.parse(globalStored);
            const updatedBooks = books.map((b: any) => {
              if (b.id === book.id) {
                const globalPageStates = { ...b.globalPageStates };
                delete globalPageStates[pageNum];
                return { ...b, globalPageStates };
              }
              return b;
            });
            localStorage.setItem('campus_lehrwerke', JSON.stringify(updatedBooks));
          }

          loadLehrwerke();
        }
      }

      await fetchProgress();
      notifyHomeworkChange();
    } catch (e) {
      console.error('Error removing homework item:', e);
    }
  };

  const handleDeleteNote = async (noteIndex: number) => {
    try {
      const updatedList = homeworkNotesList.filter((_, idx) => idx !== noteIndex);
      setHomeworkNotesList(updatedList);
      
      const combinedHomeworkNotes = JSON.stringify(updatedList);
      const currentWeek = getISOWeek();
      const currentWeekItems = progressItems.filter(item => 
        item.updated_at && getISOWeek(item.updated_at) === currentWeek
      );
      
      if (currentWeekItems.length > 0) {
        const itemIds = currentWeekItems.map(item => item.id).filter(Boolean);
        if (itemIds.length > 0) {
          const { error } = await supabase
            .from('progress_matrix')
            .update({ homework_notes: combinedHomeworkNotes })
            .in('id', itemIds);
          if (error) throw error;
        }
      }
      
      await fetchProgress();
      notifyHomeworkChange();
    } catch (e) {
      console.error('Error deleting note:', e);
    }
  };

  const handleAddNote = async () => {
    if (!homeworkNotes.trim()) return;
    try {
      const newNote = homeworkNotes.trim();
      const updatedList = [...homeworkNotesList, newNote];
      setHomeworkNotesList(updatedList);
      setHomeworkNotes('');

      const currentWeek = getISOWeek();
      const combinedHomeworkNotes = JSON.stringify(updatedList);

      // Try to find an active homework row or current week items to update
      const currentHomeworkItem = progressItems.find(item => item.is_current_homework);
      const currentWeekItems = progressItems.filter(item => 
        item.updated_at && getISOWeek(item.updated_at) === currentWeek
      );

      if (currentHomeworkItem) {
        const { error } = await supabase
          .from('progress_matrix')
          .update({ 
            homework_notes: combinedHomeworkNotes,
            updated_at: new Date().toISOString()
          })
          .eq('id', currentHomeworkItem.id);
        if (error) throw error;
      } else if (currentWeekItems.length > 0) {
        const itemIds = currentWeekItems.map(item => item.id).filter(Boolean);
        const { error } = await supabase
          .from('progress_matrix')
          .update({ 
            homework_notes: combinedHomeworkNotes,
            updated_at: new Date().toISOString()
          })
          .in('id', itemIds);
        if (error) throw error;
      } else {
        const activeTId = await getCurrentTeacherId();
        const row = {
          student_id: student.id,
          teacher_id: activeTId,
          topic_name: `Hausaufgabe KW ${currentWeek.split('-W')[1]}`,
          status: 'IN_PROGRESS',
          is_current_homework: true,
          teacher_notes: '',
          homework_notes: combinedHomeworkNotes,
          updated_at: new Date().toISOString()
        };
        const { error } = await supabase
          .from('progress_matrix')
          .insert(row);
        if (error) throw error;
      }

      await fetchProgress();
      notifyHomeworkChange();
    } catch (e) {
      console.error('Error adding note:', e);
    }
  };

  const handleStatusChange = (newStatus: 'IN_PROGRESS' | 'THEORY_DONE' | 'MASTERED') => {
    setStatus(newStatus);
  };

  const handleRemoveLehrwerk = (lehrwerkId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm("Lehrwerk wirklich entfernen?")) return;
    try {
      const stored = localStorage.getItem('student_lehrwerke_progress');
      const parsed = stored ? JSON.parse(stored) : [];
      const updated = parsed.filter((item: any) => !(item.studentId === student.id && item.lehrwerkId === lehrwerkId));
      localStorage.setItem('student_lehrwerke_progress', JSON.stringify(updated));
      loadLehrwerke();
      if (activeLehrwerkId === lehrwerkId) {
        setActiveLehrwerkId(null);
        setActivePageNumber(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveSong = async (skillId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm("Song wirklich aus den aktiven Projekten entfernen?")) return;
    try {
      const { error } = await supabase
        .from('user_song_skills')
        .delete()
        .eq('id', skillId);
      if (error) throw error;
      await loadActiveSongSkills();
      if (selectedActiveSongId === skillId) {
        setSelectedActiveSongId('');
      }
    } catch (err) {
      console.error('Error removing song skill:', err);
      setError('Fehler beim Entfernen des Songs.');
    }
  };

  const handleUndo = async () => {
    if (pageUndoStack.length === 0) return;
    const lastChange = pageUndoStack[pageUndoStack.length - 1];
    setPageUndoStack(prev => prev.slice(0, -1));

    let targetStatus: 'IN_PROGRESS' | 'THEORY_DONE' | 'MASTERED' = 'IN_PROGRESS';
    let targetHomework = false;
    
    if (lastChange.prevStatus.status === 'mastered') {
      targetStatus = 'MASTERED';
    } else if (lastChange.prevStatus.status === 'purple') {
      targetStatus = 'THEORY_DONE';
    } else if (lastChange.prevStatus.status === 'homework') {
      targetStatus = 'IN_PROGRESS';
      targetHomework = true;
    }
    
    await triggerDirectSave(lastChange.lehrwerkId, lastChange.pageNum, targetStatus, targetHomework, true);
  };

  // Assign textbook to student inside the modal
  const handleAssignLehrwerk = (lehrwerkId: string) => {
    if (!lehrwerkId) return;
    const book = globalLehrwerke.find(b => b.id === lehrwerkId);
    if (!book) return;

    try {
      const stored = localStorage.getItem('student_lehrwerke_progress');
      const parsed = stored ? JSON.parse(stored) : [];
      
      if (parsed.some((item: any) => item.studentId === student.id && item.lehrwerkId === lehrwerkId)) {
        return;
      }

      const newAssignment = {
        studentId: student.id,
        lehrwerkId: lehrwerkId,
        assignedAt: new Date().toISOString(),
        pageStates: {}
      };

      const updated = [...parsed, newAssignment];
      localStorage.setItem('student_lehrwerke_progress', JSON.stringify(updated));
      loadLehrwerke();
      setActiveLehrwerkId(lehrwerkId);
      setShowAssignDropdown(false);
    } catch (e) {
      console.error(e);
    }
  };

  const selectTextbookPage = (lehrwerkId: string, pageNum: number) => {
    const book = globalLehrwerke.find(b => b.id === lehrwerkId);
    if (!book) return;

    setActiveLehrwerkId(lehrwerkId);
    setActivePageNumber(pageNum);
    setActiveInputTab('lehrwerk_page');
    setActiveSubView('lehrwerk');
    
    // Automatically determine which 49-page group this page belongs to
    const calculatedGroup = Math.floor((pageNum - 1) / 49);
    setPageGroupIndex(calculatedGroup);
    
    const assignedBook = assignedLehrwerke.find(a => a.lehrwerkId === lehrwerkId);
    const pageState = assignedBook?.pageStates?.[pageNum] || { status: 'locked', notes: '', homework_notes: '' };
    
    // Look up existing database notes in progressItems
    const topicNameStr = `${book.title} - Seite ${pageNum}`;
    const dbItem = progressItems.find(item => item.topic_name === topicNameStr);
    
    // Auto-populate form
    setTopicName(topicNameStr);
    setTeacherNotes(dbItem ? (dbItem.teacher_notes || '') : (pageState.notes || ''));
    setHomeworkNotes('');

    // Map textbook page statuses to Supabase/form states
    const bookPageStatus = pageState.status || 'locked';
    if (bookPageStatus === 'mastered') {
      setStatus('MASTERED');
      setIsCurrentHomework(false);
    } else if (bookPageStatus === 'purple') {
      setStatus('THEORY_DONE');
      setIsCurrentHomework(false);
    } else if (bookPageStatus === 'homework') {
      setStatus('IN_PROGRESS');
      setIsCurrentHomework(true);
    } else {
      setStatus('IN_PROGRESS');
      setIsCurrentHomework(false);
    }
  };

  const selectActiveSong = (skill: any) => {
    setSelectedActiveSongId(skill.id);
    setActiveInputTab('active_song');
    setActiveSubView('song');
    setSongProgressPercent(skill.progress_percent || 0);
    
    // Load sub-sliders
    const savedValsStr = localStorage.getItem(`song_skills_detail_${student.id}_${skill.id}`);
    let r = skill.progress_percent || 0;
    let f = skill.progress_percent || 0;
    let e = skill.progress_percent || 0;
    if (savedValsStr) {
      try {
        const parsed = JSON.parse(savedValsStr);
        if (typeof parsed.rhythm === 'number') r = parsed.rhythm;
        if (typeof parsed.finger === 'number') f = parsed.finger;
        if (typeof parsed.expression === 'number') e = parsed.expression;
      } catch (err) {
        console.error(err);
      }
    }
    setRhythmVal(r);
    setFingerVal(f);
    setExpressionVal(e);
    
    const fullTitle = `${skill.songs?.artist} - ${skill.songs?.title} (${skill.instrument})`;
    setTopicName(fullTitle);
    
    // Look up existing database notes in progressItems
    const dbItem = progressItems.find(item => item.topic_name === fullTitle);
    setTeacherNotes(dbItem ? (dbItem.teacher_notes || '') : '');
    setHomeworkNotes('');
    
    if (skill.is_stage_ready) {
      setStatus('MASTERED');
      setIsCurrentHomework(false);
    } else if (skill.progress_percent >= 50) {
      setStatus('THEORY_DONE');
      setIsCurrentHomework(false);
    } else {
      setStatus('IN_PROGRESS');
      setIsCurrentHomework(skill.is_current_homework || false);
    }
  };

  // Find former notes matching the current topic Name automatically!
  const formerNotes = useMemo(() => {
    if (!topicName.trim()) return [];
    return progressItems.filter(item => item.topic_name.toLowerCase().trim() === topicName.toLowerCase().trim());
  }, [topicName, progressItems]);

  // Find the most recent homework from the previous week/lessons
  const lastHomework = useMemo(() => {
    const currentWeek = getISOWeek();
    return progressItems.find(item => {
      if (!item.homework_notes || item.homework_notes.trim() === '') return false;
      if (!item.updated_at) return true; // fallback
      return getISOWeek(item.updated_at) !== currentWeek;
    });
  }, [progressItems]);

  const triggerDirectSave = async (
    lehrwerkId: string, 
    pageNum: number, 
    targetStatus: 'IN_PROGRESS' | 'THEORY_DONE' | 'MASTERED', 
    targetHomework: boolean,
    isUndo = false
  ) => {
    if (!isUndo) {
      const assignedBook = assignedLehrwerke.find(a => a.lehrwerkId === lehrwerkId);
      const prevPageState = assignedBook?.pageStates?.[pageNum] || { status: 'locked' };
      setPageUndoStack(prev => [...prev, { lehrwerkId, pageNum, prevStatus: prevPageState }]);
    }

    let pageStatus: 'locked' | 'homework' | 'mastered' | 'purple' = 'locked';
    if (targetStatus === 'MASTERED') {
      pageStatus = 'mastered';
    } else if (targetStatus === 'THEORY_DONE') {
      pageStatus = 'purple';
    } else if (targetHomework) {
      pageStatus = 'homework';
    }

    try {
      const book = globalLehrwerke.find(g => g.id === lehrwerkId);
      if (!book) return;

      const globalStored = localStorage.getItem('campus_lehrwerke');
      if (globalStored) {
        const books = JSON.parse(globalStored);
        const updatedBooks = books.map((b: any) => {
          if (b.id === lehrwerkId) {
            const globalPageStates = b.globalPageStates || {};
            if (pageStatus === 'purple') {
              globalPageStates[pageNum] = 'purple';
            } else {
              delete globalPageStates[pageNum];
            }
            return { ...b, globalPageStates };
          }
          return b;
        });
        localStorage.setItem('campus_lehrwerke', JSON.stringify(updatedBooks));
      }

      const stored = localStorage.getItem('student_lehrwerke_progress');
      const parsed = stored ? JSON.parse(stored) : [];
      
      const updated = parsed.map((item: any) => {
        if (item.studentId === student.id && item.lehrwerkId === lehrwerkId) {
          return {
            ...item,
            pageStates: {
              ...item.pageStates,
              [pageNum]: {
                status: pageStatus,
                notes: teacherNotes.trim(),
                updatedAt: new Date().toISOString()
              }
            }
          };
        }
        return item;
      });

      localStorage.setItem('student_lehrwerke_progress', JSON.stringify(updated));
      loadLehrwerke();

      setTopicName(`${book.title} - Seite ${pageNum}`);
      setStatus(targetStatus);
      setIsCurrentHomework(targetHomework);

      const activeTId = await getCurrentTeacherId();

      const row = {
        student_id: student.id,
        teacher_id: activeTId,
        topic_name: `${book.title} - Seite ${pageNum}`,
        status: targetStatus,
        is_current_homework: targetHomework,
        teacher_notes: teacherNotes.trim(),
        homework_notes: homeworkNotes.trim(),
        updated_at: new Date().toISOString()
      };

      const currentWeek = getISOWeek();
      const existingThisWeek = progressItems.find(item => 
        item.topic_name === `${book.title} - Seite ${pageNum}` && 
        item.updated_at && 
        getISOWeek(item.updated_at) === currentWeek
      );

      if (existingThisWeek?.id) {
        await supabase
          .from('progress_matrix')
          .update(row)
          .eq('id', existingThisWeek.id);
      } else {
        await supabase
          .from('progress_matrix')
          .insert(row);
      }

      // Add to session log
      if (pageStatus === 'homework' || pageStatus === 'purple') {
        const logText = pageStatus === 'homework' 
          ? `📖 ${book.title} - S. ${pageNum}` 
          : `📖 ${book.title} - S. ${pageNum} (Theorie)`;
        
        setSessionLogs(prev => {
          const filtered = prev.filter(log => !log.startsWith(`📖 ${book.title} - S. ${pageNum}`));
          return [...filtered, logText];
        });
      } else {
        setSessionLogs(prev => prev.filter(log => !log.startsWith(`📖 ${book.title} - S. ${pageNum}`)));
      }

      await fetchProgress();
      notifyHomeworkChange();
    } catch (e) {
      console.error('Error saving direct textbook progress:', e);
    }
  };

  const triggerDirectSongSave = async (skillId: string, targetStatus: 'IN_PROGRESS' | 'THEORY_DONE' | 'MASTERED', targetHomework: boolean) => {
    try {
      const skill = activeSongSkills.find(s => s.id === skillId);
      if (!skill) return;

      let skillPercent = 25;
      if (targetStatus === 'MASTERED') {
        skillPercent = 100;
      } else if (targetStatus === 'THEORY_DONE') {
        skillPercent = 60;
      }

      await supabase
        .from('user_song_skills')
        .update({
          is_stage_ready: targetStatus === 'MASTERED',
          progress_percent: skillPercent
        })
        .eq('id', skillId);

      await loadActiveSongSkills();

      const fullTitle = `${skill.songs?.artist} - ${skill.songs?.title} (${skill.instrument})`;
      setTopicName(fullTitle);
      setStatus(targetStatus);
      setIsCurrentHomework(targetHomework);

      const activeTId = await getCurrentTeacherId();

      const row = {
        student_id: student.id,
        teacher_id: activeTId,
        topic_name: fullTitle,
        status: targetStatus,
        is_current_homework: targetHomework,
        teacher_notes: teacherNotes.trim(),
        homework_notes: homeworkNotes.trim(),
        updated_at: new Date().toISOString()
      };

      const currentWeek = getISOWeek();
      const existingThisWeek = progressItems.find(item => 
        item.topic_name === fullTitle && 
        item.updated_at && 
        getISOWeek(item.updated_at) === currentWeek
      );

      if (existingThisWeek?.id) {
        await supabase
          .from('progress_matrix')
          .update(row)
          .eq('id', existingThisWeek.id);
      } else {
        await supabase
          .from('progress_matrix')
          .insert(row);
      }

      // Add to session log
      const songTitle = skill.songs?.title || 'Song';
      if (targetHomework || targetStatus === 'THEORY_DONE') {
        const logText = targetHomework 
          ? `🎵 ${songTitle}` 
          : `🎵 ${songTitle} (Theorie)`;
        
        setSessionLogs(prev => {
          const filtered = prev.filter(log => !log.startsWith(`🎵 ${songTitle}`));
          return [...filtered, logText];
        });
      } else {
        setSessionLogs(prev => prev.filter(log => !log.startsWith(`🎵 ${songTitle}`)));
      }

      await fetchProgress();
      notifyHomeworkChange();
    } catch (e) {
      console.error('Error in direct song save:', e);
    }
  };

  const handleSave = async (e?: React.FormEvent | boolean, keepOpenParam?: boolean) => {
    let keepOpen = false;
    if (typeof e === 'boolean') {
      keepOpen = e;
    } else {
      e?.preventDefault();
      if (typeof keepOpenParam === 'boolean') {
        keepOpen = keepOpenParam;
      }
    }
    const currentWeekNum = getISOWeek().split('-W')[1] || '';
    const defaultTitle = `Hausaufgabe KW ${currentWeekNum}`;
    const finalTopicName = topicName.trim() || defaultTitle;

    setSaving(true);
    setError(null);

    // Save page status to local textbooks structure if page active
    if (activeInputTab === 'lehrwerk_page' && activeLehrwerkId && activePageNumber !== null) {
      try {
        const stored = localStorage.getItem('student_lehrwerke_progress');
        const parsed = stored ? JSON.parse(stored) : [];

        // Map status/homework form values back to local textbook format
        let pageStatus: 'locked' | 'homework' | 'mastered' | 'purple' = 'locked';
        if (status === 'MASTERED') {
          pageStatus = 'mastered';
        } else if (status === 'THEORY_DONE') {
          pageStatus = 'purple';
        } else if (isCurrentHomework) {
          pageStatus = 'homework';
        }

        // Manage global page status (purple / info)
        const globalStored = localStorage.getItem('campus_lehrwerke');
        if (globalStored) {
          const books = JSON.parse(globalStored);
          const updatedBooks = books.map((b: any) => {
            if (b.id === activeLehrwerkId) {
              const globalPageStates = b.globalPageStates || {};
              if (pageStatus === 'purple') {
                globalPageStates[activePageNumber] = 'purple';
              } else {
                delete globalPageStates[activePageNumber];
              }
              return { ...b, globalPageStates };
            }
            return b;
          });
          localStorage.setItem('campus_lehrwerke', JSON.stringify(updatedBooks));
        }

        const updated = parsed.map((item: any) => {
          if (item.studentId === student.id && item.lehrwerkId === activeLehrwerkId) {
            return {
              ...item,
              pageStates: {
                ...item.pageStates,
                [activePageNumber]: {
                  status: pageStatus,
                  notes: teacherNotes.trim(),
                  updatedAt: new Date().toISOString()
                }
              }
            };
          }
          return item;
        });

        localStorage.setItem('student_lehrwerke_progress', JSON.stringify(updated));
        loadLehrwerke();
      } catch (err) {
        console.error('Error saving textbook local progress:', err);
      }
    }

    // Save to active song skills if active song selected
    if (activeInputTab === 'active_song' && selectedActiveSongId) {
      try {
        let skillPercent = status === 'MASTERED' ? 100 : songProgressPercent;
        
        await supabase
          .from('user_song_skills')
          .update({
            is_stage_ready: status === 'MASTERED',
            progress_percent: skillPercent
          })
          .eq('id', selectedActiveSongId);
        
        loadActiveSongSkills();
      } catch (err) {
        console.error('Error updating song skill:', err);
      }
    }

    let finalNotesList = [...homeworkNotesList];
    if (homeworkNotes.trim().length > 0) {
      finalNotesList.push(homeworkNotes.trim());
    }
    const combinedHomeworkNotes = JSON.stringify(finalNotesList);

    const hasHomeworkText = finalNotesList.length > 0;
    const finalIsCurrentHomework = isCurrentHomework || hasHomeworkText;

    const payload = {
      id: activeItem?.id,
      studentId: student.id,
      topicName: finalTopicName,
      status,
      isCurrentHomework: finalIsCurrentHomework,
      teacherNotes: teacherNotes.trim(),
      homeworkNotes: combinedHomeworkNotes
    };

    try {
      // 1. Post to API endpoint
      const response = await fetch('/api/teacher/save-progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionStorage.getItem('sb-access-token') || ''}`
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        // Sync homework notes to all other progress items of the current week for this student
        const currentWeek = getISOWeek();
        const currentWeekItems = progressItems.filter(item => 
          item.updated_at && getISOWeek(item.updated_at) === currentWeek
        );
        if (currentWeekItems.length > 0) {
          const itemIds = currentWeekItems.map(item => item.id).filter(Boolean);
          if (itemIds.length > 0) {
            await supabase
              .from('progress_matrix')
              .update({ homework_notes: combinedHomeworkNotes })
              .in('id', itemIds);
          }
        }

        await fetchProgress();
        notifyHomeworkChange();
        if (!keepOpen) {
          if (activeSubView === 'hub') {
            onClose();
          } else {
            setActiveItem(null);
            setActiveSubView('hub');
            setActiveLehrwerkId(null);
            setActivePageNumber(null);
          }
        }
        setHasChanges(false);
        return;
      }

      // 2. Direct Supabase update/insert fallback
      const activeTId = await getCurrentTeacherId();
      const currentWeek = getISOWeek();

      const row = {
        student_id: student.id,
        teacher_id: activeTId,
        topic_name: finalTopicName,
        status,
        is_current_homework: finalIsCurrentHomework,
        teacher_notes: teacherNotes.trim(),
        homework_notes: combinedHomeworkNotes,
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
        // Find if there is an entry with the same topic name in the current calendar week
        const existingThisWeek = progressItems.find(item => 
          item.topic_name === finalTopicName && 
          item.updated_at && 
          getISOWeek(item.updated_at) === currentWeek
        );

        if (existingThisWeek?.id) {
          const { error } = await supabase
            .from('progress_matrix')
            .update(row)
            .eq('id', existingThisWeek.id);
          dbError = error;
        } else {
          const { error } = await supabase
            .from('progress_matrix')
            .insert(row);
          dbError = error;
        }
      }

      if (dbError) throw dbError;

      // Sync homework notes to all other progress items of the current week for this student
      const currentWeekItems = progressItems.filter(item => 
        item.updated_at && getISOWeek(item.updated_at) === currentWeek
      );
      if (currentWeekItems.length > 0) {
        const itemIds = currentWeekItems.map(item => item.id).filter(Boolean);
        if (itemIds.length > 0) {
          await supabase
            .from('progress_matrix')
            .update({ homework_notes: combinedHomeworkNotes })
            .in('id', itemIds);
        }
      }

      await fetchProgress();
      notifyHomeworkChange();
      if (!keepOpen) {
        if (activeSubView === 'hub') {
          onClose();
        } else {
          setActiveItem(null);
          setActiveSubView('hub');
          setActiveLehrwerkId(null);
          setActivePageNumber(null);
        }
      }
      setHasChanges(false);
    } catch (err: any) {
      console.error('Error saving progress:', err);
      setError('Fehler beim Speichern des Fortschritts.');
    } finally {
      setSaving(false);
    }
  };

  const handleAssignSongFromCatalog = async (songId: string) => {
    if (!songId) return;
    
    // Check if already in active songs
    const existing = activeSongSkills.find((s: any) => s.song_id === songId);
    if (existing) {
      selectActiveSong(existing);
      return;
    }

    try {
      const song = songs.find(s => s.id === songId);
      if (!song) return;

      const defaultInstrument = activeSongSkills[0]?.instrument || 
        globalLehrwerke.find(l => assignedLehrwerke.some(a => a.lehrwerkId === l.id))?.instrument || 
        'Gitarre';

      const { data: newSkill, error } = await supabase
        .from('user_song_skills')
        .insert({
          user_id: student.id,
          song_id: songId,
          instrument: defaultInstrument,
          progress_percent: 25,
          is_stage_ready: false
        })
        .select('*, songs(*)')
        .single();

      if (error) throw error;

      await loadActiveSongSkills();
      
      if (newSkill) {
        selectActiveSong(newSkill);
      } else {
        const { data: refreshedSkills } = await supabase
          .from('user_song_skills')
          .select('*, songs(*)')
          .eq('user_id', student.id);
        if (refreshedSkills) {
          const found = refreshedSkills.find((s: any) => s.song_id === songId);
          if (found) selectActiveSong(found);
        }
      }
      
      setSongSearch('');
      setSelectedSongId('');
    } catch (e) {
      console.error('Error assigning song from catalog:', e);
      setError('Fehler beim Hinzufügen des Songs.');
    }
  };

  const handleCreateAndAssignSong = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSongTitle.trim() || !newSongArtist.trim()) {
      alert('Bitte Titel und Künstler ausfüllen.');
      return;
    }

    try {
      // Get student's school ID
      let schoolId = '';
      const { data: studentUser, error: studentError } = await supabase
        .from('users')
        .select('school_id')
        .eq('id', student.id)
        .maybeSingle();

      if (studentUser?.school_id) {
        schoolId = studentUser.school_id;
      } else {
        // Fallback: Get current authenticated teacher's school ID
        const activeTId = await getCurrentTeacherId();
        const { data: teacherUser } = await supabase
          .from('users')
          .select('school_id')
          .eq('id', activeTId)
          .maybeSingle();
        if (teacherUser?.school_id) {
          schoolId = teacherUser.school_id;
        }
      }

      if (!schoolId) {
        alert('Schule des Schülers konnte nicht ermittelt werden.');
        return;
      }

      // 1. Insert into songs catalog
      const { data: createdSong, error: songError } = await supabase
        .from('songs')
        .insert({
          title: newSongTitle.trim(),
          artist: newSongArtist.trim(),
          school_id: schoolId,
          is_campus_active: true,
          teacher_id: teacherId || null
        })
        .select()
        .maybeSingle();

      if (songError) throw songError;
      if (!createdSong) {
        // If exact title/artist already exists, fetch it instead of failing
        const { data: existingSongs } = await supabase
          .from('songs')
          .select('*')
          .eq('title', newSongTitle.trim())
          .eq('artist', newSongArtist.trim())
          .eq('school_id', schoolId);
        
        if (existingSongs && existingSongs.length > 0) {
          // Use the existing song
          const matchedSong = existingSongs[0];
          await assignSongToStudent(matchedSong, schoolId);
        } else {
          throw new Error('Song-Erstellung schlug fehl.');
        }
      } else {
        await assignSongToStudent(createdSong, schoolId);
      }
    } catch (err: any) {
      console.error('Error creating custom song:', err);
      alert(`Fehler beim Anlegen des Songs: ${err.message || err}`);
    }
  };

  const assignSongToStudent = async (song: any, schoolId: string) => {
    // Refresh catalog local list
    let sq = supabase
      .from('songs')
      .select('*')
      .eq('school_id', schoolId);
    if (teacherId) {
      sq = sq.eq('teacher_id', teacherId);
    }
    const { data: refreshedSongs } = await sq.order('title', { ascending: true });
    if (refreshedSongs) {
      setSongs(refreshedSongs);
    }

    // 2. Assign to student details
    const defaultInstrument = activeSongSkills[0]?.instrument || 
      globalLehrwerke.find(l => assignedLehrwerke.some(a => a.lehrwerkId === l.id))?.instrument || 
      'Gitarre';

    // Verify if already assigned
    const existing = activeSongSkills.find((s: any) => s.song_id === song.id);
    if (existing) {
      selectActiveSong(existing);
      setNewSongTitle('');
      setNewSongArtist('');
      setShowCreateSongModal(false);
      return;
    }

    const { data: newSkill, error: skillError } = await supabase
      .from('user_song_skills')
      .insert({
        user_id: student.id,
        song_id: song.id,
        instrument: defaultInstrument,
        progress_percent: 25,
        is_stage_ready: false
      })
      .select('*, songs(*)')
      .maybeSingle();

    if (skillError) throw skillError;

    await loadActiveSongSkills();

    if (newSkill) {
      selectActiveSong(newSkill);
    } else {
      const { data: refreshedSkills } = await supabase
        .from('user_song_skills')
        .select('*, songs(*)')
        .eq('user_id', student.id);
      if (refreshedSkills) {
        const found = refreshedSkills.find((s: any) => s.song_id === song.id);
        if (found) selectActiveSong(found);
      }
    }

    // Reset modal fields
    setNewSongTitle('');
    setNewSongArtist('');
    setShowCreateSongModal(false);
  };



  const activeBook = activeLehrwerkId ? globalLehrwerke.find(g => g.id === activeLehrwerkId) : null;
  const activeSong = selectedActiveSongId ? activeSongSkills.find(s => s.id === selectedActiveSongId) : null;
  const bookColor = (activeBook && activeSubView === 'lehrwerk') 
    ? getLehrwerkColor(activeBook.title) 
    : (activeSong && activeSubView === 'song') 
      ? getSongColor(activeSong.songs?.title || 'Song') 
      : null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      background: 'rgba(9, 9, 11, 0.65)',
      backdropFilter: 'blur(20px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      fontFamily: '"Inter", sans-serif'
    }}>


      <div style={{
        background: useNotebookLayout 
          ? (bookColor 
              ? `radial-gradient(circle, ${bookColor.from} 0%, ${bookColor.to} 100%)` 
              : 'radial-gradient(circle, #5c4d40 0%, #30261f 100%)') 
          : '#f3f3f6', // Zurich neutral gray background canvas or tactile book cover
        borderRadius: '32px',
        width: '100%',
        maxWidth: '1360px',
        height: '92vh',
        boxShadow: useNotebookLayout ? '0 30px 80px rgba(0, 0, 0, 0.6), inset 0 0 40px rgba(0, 0, 0, 0.4)' : '0 30px 60px -15px rgba(0, 0, 0, 0.25)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        border: useNotebookLayout 
          ? 'none' 
          : '1px solid rgba(0, 0, 0, 0.05)',
        padding: useNotebookLayout ? '6px' : '0',
        position: 'relative'
      }} className="animation-slide-up">
        {/* Header - Apple-style Translucent/White Header (5% Darker Hybrid Forest-Sage Green Design in Notebook Layout) */}
        <div style={{
          padding: '18px 24px',
          background: useNotebookLayout 
            ? '#456355' 
            : 'rgba(255, 255, 255, 0.72)',
          backdropFilter: useNotebookLayout ? 'none' : 'blur(20px) saturate(190%)',
          borderBottom: useNotebookLayout 
            ? '2px solid #32483e' 
            : '1px solid rgba(0, 0, 0, 0.06)',
          borderRadius: useNotebookLayout ? '24px 24px 0 0' : '0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 50,
          boxShadow: useNotebookLayout 
            ? '0 4px 12px rgba(0,0,0,0.1)' 
            : '0 1px 2px rgba(0, 0, 0, 0.01)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              overflow: 'hidden',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              border: useNotebookLayout ? '1.5px solid rgba(255, 213, 79, 0.25)' : '1px solid rgba(0, 0, 0, 0.05)'
            }}>
              <img
                src={getInstrumentAvatarUrl(studentInstrument)}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                alt=""
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ 
                  fontSize: '0.62rem', 
                  color: useNotebookLayout ? '#c5d8cf' : '#8e8e93', 
                  fontWeight: 700, 
                  textTransform: 'uppercase', 
                  letterSpacing: '0.08em' 
                }}>
                  Tageskompass
                </span>
              </div>
              <h2 className="swiss-h2" style={{ 
                margin: 0, 
                fontSize: '1.2rem', 
                color: useNotebookLayout ? '#ffffff' : '#1d1d1f', 
                fontWeight: 800, 
                letterSpacing: '-0.025em', 
                lineHeight: 1.15
              }}>
                Schüler-Protokoll
              </h2>
              <p style={{ fontSize: '0.78rem', color: useNotebookLayout ? '#c5d8cf' : '#86868b', margin: '1px 0 0 0', fontWeight: 500 }}>
                Aktive Begleitung für: <strong style={{ color: useNotebookLayout ? '#ffffff' : '#1d1d1f', fontWeight: 600 }}>{student.first_name} {student.last_name}</strong>
              </p>
            </div>
          </div>

          {/* Swiss Modernist Tab & Toggle Control Group */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              display: 'inline-flex',
              background: useNotebookLayout ? 'rgba(0, 0, 0, 0.2)' : 'rgba(120, 120, 128, 0.08)',
              padding: '2.5px',
              borderRadius: '20px',
              border: useNotebookLayout ? '1px solid rgba(255, 255, 255, 0.08)' : 'none'
            }}>
              <button
                type="button"
                onClick={() => setActiveModalTab('document')}
                style={{
                  background: activeModalTab === 'document' 
                    ? (useNotebookLayout ? '#ffffff' : 'white') 
                    : 'transparent',
                  border: 'none',
                  color: activeModalTab === 'document' 
                    ? (useNotebookLayout ? '#1c1c1e' : '#1d1d1f') 
                    : (useNotebookLayout ? '#c5d8cf' : '#86868b'),
                  padding: '6px 14px',
                  borderRadius: '17px',
                  fontSize: '0.76rem',
                  fontWeight: 650,
                  cursor: 'pointer',
                  boxShadow: activeModalTab === 'document' 
                    ? (useNotebookLayout ? '0 1px 3px rgba(0,0,0,0.06)' : '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)') 
                    : 'none',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                <BookOpen size={13} style={{ opacity: activeModalTab === 'document' ? 1 : 0.8 }} />
                <span>Unterricht dokumentieren</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveModalTab('logbook')}
                style={{
                  background: activeModalTab === 'logbook' 
                    ? (useNotebookLayout ? '#ffffff' : 'white') 
                    : 'transparent',
                  border: 'none',
                  color: activeModalTab === 'logbook' 
                    ? (useNotebookLayout ? '#1c1c1e' : '#1d1d1f') 
                    : (useNotebookLayout ? '#c5d8cf' : '#86868b'),
                  padding: '6px 14px',
                  borderRadius: '17px',
                  fontSize: '0.76rem',
                  fontWeight: 650,
                  cursor: 'pointer',
                  boxShadow: activeModalTab === 'logbook' 
                    ? (useNotebookLayout ? '0 1px 3px rgba(0,0,0,0.06)' : '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)') 
                    : 'none',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                <Award size={13} style={{ opacity: activeModalTab === 'logbook' ? 1 : 0.8 }} />
                <span>Meisterwerk-Logbuch</span>
              </button>
            </div>

            {/* Premium Notebook / Modern Design Toggle Button */}
            <button
              type="button"
              onClick={() => {
                const nextVal = !useNotebookLayout;
                setUseNotebookLayout(nextVal);
                localStorage.setItem('meisterwerk_notebook_layout', String(nextVal));
              }}
              style={{
                background: useNotebookLayout ? 'rgba(0, 0, 0, 0.2)' : 'rgba(120, 120, 128, 0.08)',
                border: useNotebookLayout ? '1px solid rgba(255, 255, 255, 0.08)' : 'none',
                color: useNotebookLayout ? '#ffffff' : '#1d1d1f',
                padding: '6px 14px',
                borderRadius: '17px',
                fontSize: '0.76rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = useNotebookLayout ? 'rgba(0, 0, 0, 0.3)' : 'rgba(120, 120, 128, 0.14)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = useNotebookLayout ? 'rgba(0, 0, 0, 0.2)' : 'rgba(120, 120, 128, 0.08)';
              }}
            >
              <Book size={13} style={{ opacity: 0.8 }} />
              <span>{useNotebookLayout ? 'Modernes Design' : 'Notizbuch-Design'}</span>
            </button>
          </div>

          <button
            onClick={handleClose}
            style={{
              background: useNotebookLayout ? 'rgba(0, 0, 0, 0.2)' : 'rgba(120, 120, 128, 0.08)',
              border: useNotebookLayout ? '1px solid rgba(255, 255, 255, 0.08)' : 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: useNotebookLayout ? '#c5d8cf' : '#86868b',
              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = useNotebookLayout ? 'rgba(0, 0, 0, 0.3)' : 'rgba(120, 120, 128, 0.16)';
              e.currentTarget.style.color = useNotebookLayout ? '#ffd54f' : '#1d1d1f';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = useNotebookLayout ? 'rgba(0, 0, 0, 0.2)' : 'rgba(120, 120, 128, 0.08)';
              e.currentTarget.style.color = useNotebookLayout ? '#c5d8cf' : '#86868b';
            }}
            className="hover-scale"
          >
            <X size={15} />
          </button>
        </div>

        {/* Modal Content - Side-by-side Columns or Logbook */}
        <div style={{
          display: 'flex',
          flex: 1,
          overflow: 'hidden',
          minHeight: 0,
          background: useNotebookLayout 
            ? (bookColor 
                ? `radial-gradient(circle, ${bookColor.from} 0%, ${bookColor.to} 100%)` 
                : 'radial-gradient(circle, #5c4d40 0%, #30261f 100%)') 
            : 'transparent',
          padding: '0',
          position: 'relative'
        }} className="flex-col lg:flex-row">
          {activeModalTab === 'document' ? (
            <>
          
          {/* LEFT COLUMN: 🎯 FOKUS-ARBEITSPLATZ (Lehrwerke & Songs) */}
          <style dangerouslySetInnerHTML={{__html: `
            .hide-scrollbar::-webkit-scrollbar {
              display: none;
            }
            .hide-scrollbar {
              -ms-overflow-style: none;
              scrollbar-width: none;
            }
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes slideUp {
              from { transform: translateY(20px); opacity: 0; }
              to { transform: translateY(0); opacity: 1; }
            }
          `}} />
          <div style={{
            flex: '1 1 0%',
            padding: '24px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            background: useNotebookLayout ? '#faf8f2' : 'white',
            borderRadius: useNotebookLayout ? '0 0 0 20px' : '0',
            boxShadow: useNotebookLayout ? '-10px 10px 20px rgba(0,0,0,0.15)' : 'none',
            borderRight: useNotebookLayout ? '1px dashed #e5e0d4' : '1px solid #e8e8ed',
            position: 'relative'
          }}>
            
            {useNotebookLayout && (
              <div style={{
                position: 'absolute',
                top: '20px',
                bottom: '20px',
                right: '8px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-around',
                zIndex: 25
              }}>
                {Array.from({ length: 6 }).map((_, idx) => (
                  <div key={idx} style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: '#121214',
                    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.8)'
                  }} />
                ))}
              </div>
            )}

            {activeSubView === 'history' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeIn 0.25s ease', height: '100%' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>
                    📚 Hausaufgaben-Archiv
                  </h3>
                  <p style={{ margin: '3px 0 0 0', fontSize: '0.76rem', color: '#64748b', fontWeight: 650 }}>
                    Hier findest du alle vergangenen, archivierten Hausaufgaben-Wochen.
                  </p>
                </div>
                
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '4px' }}>
                  {(() => {
                    const weeks = Array.from(new Set(progressItems
                      .filter(item => item.updated_at)
                      .map(item => getISOWeek(item.updated_at))
                    )).sort().reverse();
                    
                    if (weeks.length === 0) {
                      return (
                        <div style={{ padding: '24px', textAlign: 'center', background: '#f8fafc', borderRadius: '16px', border: '1px dashed #cbd5e1', color: '#64748b', fontSize: '0.8rem' }}>
                          Keine vergangenen Hausaufgaben gefunden.
                        </div>
                      );
                    }
                    
                    return weeks.map(wk => {
                      const isSelected = selectedHistoryWeek === wk;
                      const weekNum = wk.split('-W')[1] || '';
                      
                      // Count how many items were checked or active in this week
                      const weekItems = progressItems.filter(item => item.updated_at && getISOWeek(item.updated_at) === wk);
                      const homeworkItemsCount = weekItems.filter(item => item.is_current_homework && !item.topic_name.startsWith('Hausaufgabe KW ')).length;
                      
                      return (
                        <div
                          key={wk}
                          onClick={() => setSelectedHistoryWeek(wk)}
                          style={{
                            background: isSelected ? '#f1f5f9' : 'white',
                            border: isSelected ? '1.5px solid #456355' : '1px solid #cbd5e1',
                            borderRadius: '16px',
                            padding: '16px',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px',
                            boxShadow: isSelected ? '0 4px 12px rgba(69, 99, 85, 0.08)' : '0 2px 4px rgba(0,0,0,0.01)'
                          }}
                          className="hover-scale"
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.86rem', fontWeight: 900, color: isSelected ? '#456355' : '#0f172a' }}>
                              KW {weekNum}
                            </span>
                            <span style={{ fontSize: '0.68rem', background: isSelected ? '#456355' : '#f1f5f9', color: isSelected ? 'white' : '#4b5563', padding: '2px 8px', borderRadius: '10px', fontWeight: 800 }}>
                              {homeworkItemsCount} Aufgaben
                            </span>
                          </div>
                          <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 500 }}>
                            Dokumentiert in Woche {weekNum}
                          </span>
                        </div>
                      );
                    });
                  })()}
                </div>

                {/* Back button to active hub */}
                <button
                  type="button"
                  onClick={() => setActiveSubView('hub')}
                  style={{
                    background: '#456355',
                    color: 'white',
                    border: 'none',
                    padding: '12px',
                    borderRadius: '14px',
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 4px 10px rgba(69, 99, 85, 0.2)',
                    transition: 'all 0.15s ease',
                    width: '100%',
                    textAlign: 'center'
                  }}
                  className="hover-scale"
                >
                  Zurück zum aktuellen Tag
                </button>
              </div>
            ) : activeSubView === 'lehrwerk' && activeLehrwerkId ? (
              (() => {
                const book = globalLehrwerke.find(g => g.id === activeLehrwerkId);
                if (!book) return null;
                const assignedBook = assignedLehrwerke.find(a => a.lehrwerkId === activeLehrwerkId);
                const bookColor = getLehrwerkColor(book.title);
                const pct = assignedBook ? Math.min(100, Math.round((Object.values(assignedBook.pageStates || {}).filter((p: any) => p.status === 'mastered').length / (book.totalPages || 50)) * 100)) : 0;
                const pages = Array.from({ length: book.totalPages || 50 }, (_, i) => i + 1);

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeIn 0.25s ease' }}>
                    <button
                      type="button"
                      onClick={() => setActiveSubView('hub')}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: '#f1f5f9',
                        border: 'none',
                        color: '#475569',
                        padding: '8px 14px',
                        borderRadius: '20px',
                        fontSize: '0.74rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        width: 'fit-content',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                        transition: 'all 0.15s ease'
                      }}
                      className="hover-scale"
                    >
                      <span>← Zurück zum Hub</span>
                    </button>

                    {/* Textbook Cover Card */}
                    <div style={{
                      background: 'white',
                      border: '1px solid #cbd5e1',
                      borderRadius: '24px',
                      padding: '20px',
                      display: 'flex',
                      gap: '16px',
                      alignItems: 'center',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
                    }}>
                      <div style={{
                        width: '54px',
                        height: '70px',
                        background: bookColor ? `linear-gradient(135deg, ${bookColor.from}, ${bookColor.to})` : '#e2e8f0',
                        borderRadius: '6px',
                        boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
                        border: 'none',
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {bookColor && <BookOpen size={22} color={bookColor.text} />}
                        <div style={{
                          position: 'absolute',
                          left: 0,
                          top: 0,
                          bottom: 0,
                          width: '6px',
                          background: 'rgba(0,0,0,0.08)',
                          borderRight: '1px solid rgba(255,255,255,0.1)'
                        }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h4 style={{ margin: '0 0 4px 0', fontSize: '0.95rem', fontWeight: 900, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {book.title}
                        </h4>
                        {book.author && (
                          <p style={{ margin: '0 0 2px 0', fontSize: '0.76rem', color: '#64748b', fontWeight: 650 }}>
                            von {book.author}
                          </p>
                        )}
                        <span style={{ fontSize: '0.74rem', color: '#475569', fontWeight: 800 }}>
                          📖 {book.totalPages || 50} Seiten • {pct}% gemeistert
                        </span>
                        <div style={{ width: '100%', height: '6px', background: '#e8e8ed', borderRadius: '3px', marginTop: '6px', overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg, #10b981, #059669)', transition: 'width 0.4s ease' }} />
                        </div>
                      </div>
                    </div>

                    {/* Brushes Panel for Textbooks - Moved to left page */}
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      background: 'white',
                      borderRadius: '18px',
                      padding: '12px 16px',
                      border: '1px solid rgba(0, 0, 0, 0.08)',
                      boxShadow: '0 4px 15px rgba(0,0,0,0.02)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#4b5563', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span>🖌️</span> Pinsel zum Einfärben:
                        </span>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          {[
                            { mode: 'LOCKED', color: 'hsl(355, 75%, 84%)', label: 'rot = unbearbeitet' },
                            { mode: 'HOMEWORK', color: 'hsl(47, 85%, 84%)', label: 'gelb = Hausaufgabe' },
                            { mode: 'MASTERED', color: 'hsl(130, 65%, 82%)', label: 'grün = erledigt' }
                          ].map(b => {
                            const isActive = activeBrush === b.mode;
                            return (
                              <button
                                key={b.mode}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveBrush(prev => prev === b.mode ? 'NONE' : b.mode as any);
                                }}
                                style={{
                                  width: '28px',
                                  height: '28px',
                                  borderRadius: '50%',
                                  background: b.color,
                                  border: isActive ? '3px solid #0f172a' : '1.5px solid #cbd5e1',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease',
                                  transform: isActive ? 'scale(1.15)' : 'none',
                                  outline: 'none'
                                }}
                                title={b.label}
                              />
                            );
                          })}
                        </div>
                      </div>
                      <div style={{ borderTop: '1px solid rgba(0, 0, 0, 0.05)', paddingTop: '8px', display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.68rem', color: '#71717a', fontWeight: 700 }}><span style={{ color: 'hsl(355, 75%, 84%)' }}>●</span> Rot (unbearbeitet)</span>
                        <span style={{ fontSize: '0.68rem', color: '#71717a', fontWeight: 700 }}><span style={{ color: 'hsl(47, 85%, 84%)' }}>●</span> Gelb (Hausaufgabe)</span>
                        <span style={{ fontSize: '0.68rem', color: '#71717a', fontWeight: 700 }}><span style={{ color: 'hsl(130, 65%, 82%)' }}>●</span> Grün (erledigt)</span>
                      </div>
                    </div>

                    {/* Page Grid preview scroll for active textbook */}
                    {assignedBook && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '24px', padding: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#7d7d82' }}>Seitenübersicht:</span>
                          <button
                            type="button"
                            onClick={() => setShowAllPagesGrid(true)}
                            style={{ background: 'transparent', border: 'none', color: '#10b981', fontSize: '0.72rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                            className="hover-scale"
                          >
                            Ganzes Lehrwerk anzeigen
                          </button>
                        </div>
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(44px, 1fr))',
                          gap: '8px',
                          maxHeight: '320px',
                          overflowY: 'auto',
                          padding: '4px'
                        }}>
                          {pages.map(num => {
                            const pageState = assignedBook.pageStates[num] || { status: 'locked' };
                            const globalPage = book.globalPageStates?.[num] === 'purple';
                            const status = globalPage ? 'purple' : (pageState.status || 'locked');

                            let borderColor = 'hsl(355, 70%, 73%)';
                            let bg = 'hsl(355, 80%, 94%)';
                            let textColor = 'hsl(355, 80%, 30%)';

                            if (status === 'homework') {
                              borderColor = 'hsl(47, 80%, 68%)';
                              bg = 'hsl(47, 90%, 93%)';
                              textColor = 'hsl(47, 85%, 28%)';
                            } else if (status === 'mastered') {
                              borderColor = 'hsl(130, 60%, 70%)';
                              bg = 'hsl(130, 70%, 93%)';
                              textColor = 'hsl(130, 70%, 25%)';
                            } else if (status === 'purple') {
                              borderColor = 'hsl(255, 65%, 73%)';
                              bg = 'hsl(255, 80%, 94%)';
                              textColor = 'hsl(255, 75%, 32%)';
                            }

                            let solidActiveBg = 'hsl(355, 75%, 84%)';
                            if (status === 'homework') solidActiveBg = 'hsl(47, 85%, 84%)';
                            else if (status === 'mastered') solidActiveBg = 'hsl(130, 65%, 82%)';
                            else if (status === 'purple') solidActiveBg = 'hsl(255, 75%, 84%)';

                            const isPageActive = activePageNumber === num;

                            return (
                              <button
                                key={num}
                                type="button"
                                onClick={() => selectTextbookPage(activeLehrwerkId, num)}
                                style={{
                                  height: '44px',
                                  borderRadius: '50%',
                                  border: `2px solid ${isPageActive ? solidActiveBg : borderColor}`,
                                  background: isPageActive ? solidActiveBg : bg,
                                  color: isPageActive ? 'white' : textColor,
                                  fontWeight: 900,
                                  fontSize: '0.88rem',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  boxShadow: isPageActive ? '0 4px 8px rgba(0,0,0,0.1)' : 'none',
                                  transform: isPageActive ? 'scale(1.08)' : 'none',
                                  transition: 'all 0.15s ease'
                                }}
                              >
                                {num}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()
            ) : activeSubView === 'song' && selectedActiveSongId ? (
              (() => {
                const skill = activeSongSkills.find(s => s.id === selectedActiveSongId);
                if (!skill) return null;
                const songColor = getSongColor(skill.songs?.title || 'Song');
                const progress = songProgressPercent;

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeIn 0.25s ease' }}>
                    <button
                      type="button"
                      onClick={() => setActiveSubView('hub')}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: '#f1f5f9',
                        border: 'none',
                        color: '#475569',
                        padding: '8px 14px',
                        borderRadius: '20px',
                        fontSize: '0.74rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        width: 'fit-content',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                        transition: 'all 0.15s ease'
                      }}
                      className="hover-scale"
                    >
                      <span>← Zurück zum Hub</span>
                    </button>

                    {/* Song Cover Card */}
                    <div style={{
                      background: 'white',
                      border: '1px solid #cbd5e1',
                      borderRadius: '24px',
                      padding: '20px',
                      display: 'flex',
                      gap: '16px',
                      alignItems: 'center',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
                    }}>
                      <div style={{ position: 'relative', width: '70px', height: '60px', flexShrink: 0 }}>
                        {/* Vinyl peeking out */}
                        <div style={{
                          position: 'absolute',
                          right: '2px',
                          top: '4px',
                          width: '52px',
                          height: '52px',
                          borderRadius: '50%',
                          background: 'radial-gradient(circle, #27272a 35%, #09090b 36%, #18181b 45%, #09090b 60%)',
                          border: '1px solid #000',
                          boxShadow: '0 2px 5px rgba(0,0,0,0.3)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          zIndex: 1
                        }}>
                          <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: songColor.to, border: '1px solid rgba(0,0,0,0.2)' }} />
                        </div>
                        {/* Album Sleeve */}
                        <div style={{
                          position: 'absolute',
                          left: 0,
                          top: 0,
                          width: '60px',
                          height: '60px',
                          background: `linear-gradient(135deg, ${songColor.from} 0%, ${songColor.to} 100%)`,
                          borderRadius: '6px',
                          border: '1px solid rgba(0,0,0,0.1)',
                          boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1.6rem',
                          zIndex: 2
                        }}>
                          🎵
                        </div>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h4 style={{ margin: '0 0 4px 0', fontSize: '0.95rem', fontWeight: 900, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {skill.songs?.title}
                        </h4>
                        <p style={{ margin: '0 0 2px 0', fontSize: '0.76rem', color: '#64748b', fontWeight: 650, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          von {skill.songs?.artist}
                        </p>
                        <span style={{ fontSize: '0.74rem', color: '#475569', fontWeight: 800 }}>
                          {progress}%
                        </span>
                        <div style={{ width: '100%', height: '7px', background: '#e8e8ed', borderRadius: '3.5px', marginTop: '6px', overflow: 'hidden' }}>
                          <div style={{ width: `${progress}%`, height: '100%', background: (status === 'MASTERED' || skill.is_stage_ready) ? '#10b981' : '#000', transition: 'width 0.4s ease' }} />
                        </div>
                      </div>
                    </div>

                    {/* Brushes Panel for Songs */}
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      background: 'white',
                      borderRadius: '18px',
                      padding: '12px 16px',
                      border: '1px solid rgba(0, 0, 0, 0.08)',
                      boxShadow: '0 4px 15px rgba(0,0,0,0.02)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#4b5563', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span>🎵</span> Songstatus:
                        </span>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          {[
                            { mode: 'LOCKED', color: 'hsl(355, 75%, 84%)', label: 'Rot (unbearbeitet)', getActive: () => status === 'IN_PROGRESS' && !isCurrentHomework, action: () => { setStatus('IN_PROGRESS'); setIsCurrentHomework(false); setSongProgressPercent(25); setHasChanges(true); } },
                            { mode: 'HOMEWORK', color: 'hsl(47, 85%, 84%)', label: 'Gelb (Hausaufgabe)', getActive: () => status === 'IN_PROGRESS' && isCurrentHomework, action: () => { setStatus('IN_PROGRESS'); setIsCurrentHomework(true); setSongProgressPercent(25); setHasChanges(true); } },
                            { mode: 'MASTERED', color: 'hsl(130, 65%, 82%)', label: 'Grün (gemeistert - 100%)', getActive: () => status === 'MASTERED', action: () => {
                               setStatus('MASTERED');
                               setIsCurrentHomework(false);
                               setSongProgressPercent(100);
                               setRhythmVal(100);
                               setFingerVal(100);
                               setExpressionVal(100);
                               setHasChanges(true);
                               localStorage.setItem(`song_skills_detail_${student.id}_${selectedActiveSongId}`, JSON.stringify({
                                 rhythm: 100,
                                 finger: 100,
                                 expression: 100
                               }));
                             } }
                          ].map(b => {
                            const isActive = b.getActive();
                            return (
                              <button
                                key={b.mode}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  b.action();
                                }}
                                style={{
                                  width: '28px',
                                  height: '28px',
                                  borderRadius: '50%',
                                  background: b.color,
                                  border: isActive ? '3px solid #0f172a' : '1.5px solid #cbd5e1',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease',
                                  transform: isActive ? 'scale(1.15)' : 'none',
                                  outline: 'none'
                                }}
                                title={b.label}
                              />
                            );
                          })}
                        </div>
                      </div>
                      <div style={{ borderTop: '1px solid rgba(0, 0, 0, 0.05)', paddingTop: '8px', display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.68rem', color: '#71717a', fontWeight: 700 }}><span style={{ color: 'hsl(355, 75%, 84%)' }}>●</span> Rot (unbearbeitet)</span>
                        <span style={{ fontSize: '0.68rem', color: '#71717a', fontWeight: 700 }}><span style={{ color: 'hsl(47, 85%, 84%)' }}>●</span> Gelb (Hausaufgabe)</span>
                        <span style={{ fontSize: '0.68rem', color: '#71717a', fontWeight: 700 }}><span style={{ color: 'hsl(130, 65%, 82%)' }}>●</span> Grün (gemeistert - 100%)</span>
                      </div>
                    </div>

                    {/* Collapsible Progress Sliders Widget */}
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                      background: 'white',
                      borderRadius: '18px',
                      padding: '16px',
                      border: '1px solid rgba(0, 0, 0, 0.08)',
                      boxShadow: '0 4px 15px rgba(0,0,0,0.02)',
                      transition: 'all 0.3s ease'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.84rem', fontWeight: 900, color: songProgressPercent === 100 ? '#10b981' : '#0f172a', transition: 'color 0.3s ease' }}>
                          Fortschritt: {songProgressPercent}%
                        </span>
                        
                        {songProgressPercent === 100 ? (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            color: '#eab308',
                            fontSize: '0.84rem',
                            fontWeight: 900,
                            animation: 'fadeIn 0.3s ease'
                          }}>
                            <span>Song gemeistert</span>
                            <Star size={16} fill="#eab308" color="#eab308" style={{ filter: 'drop-shadow(0 0 3px rgba(234, 179, 8, 0.5))' }} />
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setIsSubSlidersExpanded(!isSubSlidersExpanded)}
                            style={{
                              background: '#f1f5f9',
                              border: 'none',
                              color: '#4b5563',
                              fontSize: '0.74rem',
                              fontWeight: 800,
                              cursor: 'pointer',
                              padding: '8px 14px',
                              borderRadius: '20px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            {isSubSlidersExpanded ? 'Details ausblenden ▲' : 'Details einblenden ▼'}
                          </button>
                        )}
                      </div>

                      {/* Main Average Slider */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={songProgressPercent}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            setSongProgressPercent(val);
                            setRhythmVal(val);
                            setFingerVal(val);
                            setExpressionVal(val);
                            if (val === 100) {
                              setIsSubSlidersExpanded(false);
                            } else {
                              setStatus('IN_PROGRESS');
                              setIsCurrentHomework(true);
                            }
                            setHasChanges(true);
                            localStorage.setItem(`song_skills_detail_${student.id}_${selectedActiveSongId}`, JSON.stringify({
                              rhythm: val,
                              finger: val,
                              expression: val
                            }));
                          }}
                          style={{
                            flex: 1,
                            accentColor: songProgressPercent === 100 ? '#10b981' : '#000000',
                            height: '9px',
                            borderRadius: '4.5px',
                            cursor: 'pointer',
                            background: `linear-gradient(to right, ${songProgressPercent === 100 ? '#10b981' : '#000000'} 0%, ${songProgressPercent === 100 ? '#10b981' : '#000000'} ${songProgressPercent}%, #e8e8ed ${songProgressPercent}%, #e8e8ed 100%)`,
                            WebkitAppearance: 'none',
                            outline: 'none',
                            transition: 'all 0.3s ease'
                          }}
                        />
                      </div>

                      {/* Sub sliders (Rhythm, Finger, Expression) */}
                      {isSubSlidersExpanded && (
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '26px',
                          borderTop: '1px solid rgba(0, 0, 0, 0.12)',
                          padding: '16px 0 0 0',
                          marginTop: '12px',
                          background: 'transparent',
                          animation: 'fadeIn 0.2s ease'
                        }}>
                          {songProgressPercent < 100 && [
                            { label: 'Rhythmus & Timing', value: rhythmVal, type: 'rhythm', color: '#ef4444' },
                            { label: 'Finger & Technik', value: fingerVal, type: 'finger', color: '#eab308' },
                            { label: 'Ausdruck & Performance', value: expressionVal, type: 'expression', color: '#10b981' }
                          ].map(sub => (
                            <div key={sub.type} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', fontWeight: 800, color: '#4b5563' }}>
                                <span>{sub.label}</span>
                                <span>{sub.value}%</span>
                              </div>
                              <input
                                type="range"
                                min="0"
                                max="100"
                                value={sub.value}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value, 10);
                                  let r = rhythmVal;
                                  let f = fingerVal;
                                  let eVal = expressionVal;
                                  if (sub.type === 'rhythm') {
                                    r = val;
                                    setRhythmVal(val);
                                  } else if (sub.type === 'finger') {
                                    f = val;
                                    setFingerVal(val);
                                  } else if (sub.type === 'expression') {
                                    eVal = val;
                                    setExpressionVal(val);
                                  }
                                  setHasChanges(true);
                                  const avg = Math.round((r + f + eVal) / 3);
                                  setSongProgressPercent(avg);
                                  if (avg < 100) {
                                    setStatus('IN_PROGRESS');
                                    setIsCurrentHomework(true);
                                  }
                                  localStorage.setItem(`song_skills_detail_${student.id}_${selectedActiveSongId}`, JSON.stringify({
                                    rhythm: r,
                                    finger: f,
                                    expression: eVal
                                  }));
                                }}
                                style={{
                                  width: '100%',
                                  accentColor: sub.color,
                                  height: '5px',
                                  borderRadius: '2.5px',
                                  cursor: 'pointer',
                                  background: `linear-gradient(to right, ${sub.color} 0%, ${sub.color} ${sub.value}%, #e8e8ed ${sub.value}%, #e8e8ed 100%)`,
                                  WebkitAppearance: 'none',
                                  outline: 'none',
                                  padding: '8px 0' // increases the tap/touch target area size vertical padding
                                }}
                              />
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => {
                              setStatus('MASTERED');
                              setIsCurrentHomework(false);
                              setSongProgressPercent(100);
                              setRhythmVal(100);
                              setFingerVal(100);
                              setExpressionVal(100);
                              setIsSubSlidersExpanded(false);
                              setHasChanges(true);
                              localStorage.setItem(`song_skills_detail_${student.id}_${selectedActiveSongId}`, JSON.stringify({
                                rhythm: 100,
                                finger: 100,
                                expression: 100
                              }));
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '8px',
                              background: '#f1f5f9',
                              border: 'none',
                              color: '#374151',
                              fontSize: '0.8rem',
                              fontWeight: 800,
                              cursor: 'pointer',
                              padding: '10px 16px',
                              borderRadius: '20px',
                              marginTop: '8px',
                              width: 'fit-content',
                              alignSelf: 'flex-end',
                              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                              transition: 'all 0.15s ease'
                            }}
                            className="hover-scale"
                          >
                            <span>{songProgressPercent === 100 ? 'Song gemeistert' : 'Song als gemeistert markieren'}</span>
                            <Star size={16} fill="#facc15" color="#eab308" style={{ filter: 'drop-shadow(0 0 3px rgba(250, 204, 21, 0.6))' }} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()
            ) : (
              <>
                {/* Clean Apple-style Header Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#000', letterSpacing: '-0.02em', textTransform: 'uppercase' }}>
                    Lehrwerke & Übungen
                  </h3>
                  
                  <div style={{ position: 'relative' }}>
                    <button
                      type="button"
                      onClick={() => setShowAssignDropdown(!showAssignDropdown)}
                      style={{
                        background: '#000',
                        color: 'white',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: '20px',
                        fontSize: '0.78rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
                      }}
                      className="hover-scale"
                    >
                      <Plus size={14} /> Zuweisen
                    </button>
                    
                    {showAssignDropdown && (
                      <div style={{
                        position: 'absolute',
                        right: 0,
                        top: '36px',
                        background: 'white',
                        border: '1px solid #e8e8ed',
                        borderRadius: '16px',
                        boxShadow: '0 12px 30px rgba(0,0,0,0.12)',
                        zIndex: 40,
                        minWidth: '220px',
                        padding: '6px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px'
                      }}>
                        {globalLehrwerke
                          .filter(g => !assignedLehrwerke.some(a => a.lehrwerkId === g.id))
                          .map(g => (
                            <button
                              key={g.id}
                              type="button"
                              onClick={() => handleAssignLehrwerk(g.id)}
                              style={{
                                border: 'none',
                                background: 'transparent',
                                padding: '8px 12px',
                                borderRadius: '10px',
                                fontSize: '0.78rem',
                                fontWeight: 700,
                                textAlign: 'left',
                                cursor: 'pointer',
                                color: '#000',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                transition: 'background 0.2s'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.background = '#f3f3f6'}
                              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                              {(() => {
                                const bookColor = getLehrwerkColor(g.title);
                                return (
                                  <div style={{
                                    width: '24px',
                                    height: '32px',
                                    background: `linear-gradient(135deg, ${bookColor.from}, ${bookColor.to})`,
                                    borderRadius: '3px',
                                    border: 'none',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.12)',
                                    position: 'relative',
                                    flexShrink: 0,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }}>
                                    <BookOpen size={11} color={bookColor.text} />
                                    <div style={{
                                      position: 'absolute',
                                      left: 0,
                                      top: 0,
                                      bottom: 0,
                                      width: '3px',
                                      background: 'rgba(0,0,0,0.08)',
                                      borderRight: '1px solid rgba(255,255,255,0.1)'
                                    }} />
                                  </div>
                                );
                              })()}
                              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{g.title}</span>
                            </button>
                          ))
                        }
                        {globalLehrwerke.filter(g => !assignedLehrwerke.some(a => a.lehrwerkId === g.id)).length === 0 && (
                          <span style={{ fontSize: '0.72rem', color: '#7d7d82', padding: '8px', textAlign: 'center', fontStyle: 'italic' }}>
                            Alle Lehrwerke zugewiesen
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {assignedLehrwerke.length === 0 ? (
                  <div style={{ padding: '40px 16px', textAlign: 'center', border: '2px dashed #e8e8ed', borderRadius: '24px', color: '#7d7d82', fontSize: '0.82rem', fontWeight: 600 }}>
                    Noch kein Lehrwerk zugewiesen.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {assignedLehrwerke.map(assigned => {
                      const book = globalLehrwerke.find(g => g.id === assigned.lehrwerkId) || {
                        title: 'Unbekanntes Buch',
                        emoji: '📚',
                        totalPages: 50
                      };
                      const bookColor = getLehrwerkColor(book.title);
                      const total = book.totalPages || 50;
                      const worked = Object.values(assigned.pageStates || {}).filter((p: any) => p.status === 'mastered').length;
                      const pct = Math.min(100, Math.round((worked / total) * 100));

                      return (
                        <div
                          key={assigned.lehrwerkId}
                          onClick={() => selectTextbookPage(assigned.lehrwerkId, activePageNumber || 1)}
                          style={{
                            padding: '14px 18px',
                            background: 'white',
                            borderRadius: '20px',
                            border: '1.5px solid #e8e8ed',
                            cursor: 'pointer',
                            display: 'flex',
                            gap: '14px',
                            alignItems: 'center',
                            transition: 'all 0.2s'
                          }}
                          className="hover-scale"
                        >
                          <div style={{
                            width: '42px',
                            height: '56px',
                            background: `linear-gradient(135deg, ${bookColor.from}, ${bookColor.to})`,
                            borderRadius: '4px',
                            boxShadow: '0 3px 6px rgba(0,0,0,0.15)',
                            border: 'none',
                            position: 'relative',
                            flexShrink: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <BookOpen size={18} color={bookColor.text} />
                            <div style={{
                              position: 'absolute',
                              left: 0,
                              top: 0,
                              bottom: 0,
                              width: '5px',
                              background: 'rgba(0,0,0,0.08)',
                              borderRight: '1px solid rgba(255,255,255,0.1)'
                            }} />
                          </div>

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 900, color: '#000', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {book.title}
                              </h4>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveLehrwerk(assigned.lehrwerkId, e);
                                }}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: '#ef4444',
                                  cursor: 'pointer',
                                  padding: '4px',
                                  borderRadius: '50%',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  transition: 'background 0.2s'
                                }}
                                onMouseEnter={(el) => el.currentTarget.style.background = '#fef2f2'}
                                onMouseLeave={(el) => el.currentTarget.style.background = 'transparent'}
                              >
                                <X size={14} strokeWidth={2.5} />
                              </button>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                              <p style={{ margin: 0, fontSize: '0.7rem', color: '#7d7d82', fontWeight: 700 }}>
                                {total} Seiten • {worked} gemeistert
                              </p>
                              <span style={{ fontSize: '0.7rem', fontWeight: 900, color: pct > 0 ? '#10b981' : '#7d7d82' }}>
                                ({pct}%)
                              </span>
                            </div>
                            <div style={{ width: '100%', height: '6px', background: '#f3f3f6', borderRadius: '3px', overflow: 'hidden', marginTop: '6px' }}>
                              <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg, #10b981, #059669)', transition: 'width 0.3s ease' }} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div style={{ borderTop: '1px solid #e8e8ed', margin: '20px 0 10px 0' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <Music size={18} style={{ color: '#000' }} />
                  <span style={{ fontSize: '0.8rem', fontWeight: 900, color: '#000', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    🎵 Aktive Song-Projekte
                  </span>
                </div>

                {activeSongSkills.length === 0 ? (
                  <div style={{ padding: '40px 16px', textAlign: 'center', border: '2px dashed #e8e8ed', borderRadius: '24px', color: '#7d7d82', fontSize: '0.82rem', fontWeight: 600 }}>
                    Keine aktiven Songs eingetragen.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {activeSongSkills.map(skill => {
                      const progress = skill.is_stage_ready ? 100 : (skill.progress_percent || 0);
                      const songColor = getSongColor(skill.songs?.title || 'Song');

                      return (
                        <div
                          key={skill.id}
                          onClick={() => selectActiveSong(skill)}
                          style={{
                            padding: '14px 18px',
                            background: 'white',
                            borderRadius: '20px',
                            border: '1.5px solid #e8e8ed',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                            transition: 'all 0.2s'
                          }}
                          className="hover-scale"
                        >
                          <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                            {/* CD + Vinyl peeking Cover */}
                            <div style={{ position: 'relative', width: '52px', height: '44px', flexShrink: 0 }}>
                              <div style={{
                                position: 'absolute',
                                right: '1px',
                                top: '3px',
                                width: '38px',
                                height: '38px',
                                borderRadius: '50%',
                                background: 'radial-gradient(circle, #27272a 35%, #09090b 36%, #18181b 45%, #09090b 60%)',
                                border: '1px solid #000',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                zIndex: 1
                              }}>
                                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: songColor.to, border: '1px solid rgba(0,0,0,0.2)' }} />
                              </div>
                              <div style={{
                                position: 'absolute',
                                left: 0,
                                top: 0,
                                width: '44px',
                                height: '44px',
                                background: `linear-gradient(135deg, ${songColor.from} 0%, ${songColor.to} 100%)`,
                                borderRadius: '5px',
                                border: '1px solid rgba(0,0,0,0.1)',
                                boxShadow: '0 3px 6px rgba(0,0,0,0.15)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '1.2rem',
                                zIndex: 2
                              }}>
                                🎵
                              </div>
                            </div>

                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                  <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 900, color: '#000', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {skill.songs?.title}
                                  </h4>
                                  <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#7d7d82', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {skill.songs?.artist} • <span style={{ color: '#000', fontWeight: 800 }}>{progress}%</span>
                                  </p>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRemoveSong(skill.id, e);
                                    }}
                                    style={{
                                      background: 'transparent',
                                      border: 'none',
                                      color: '#ef4444',
                                      cursor: 'pointer',
                                      padding: '4px',
                                      borderRadius: '50%',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      transition: 'background 0.2s',
                                      zIndex: 10
                                    }}
                                    onMouseEnter={(el) => el.currentTarget.style.background = '#fef2f2'}
                                    onMouseLeave={(el) => el.currentTarget.style.background = 'transparent'}
                                  >
                                    <X size={14} strokeWidth={2.5} />
                                  </button>
                                </div>
                              </div>

                              <div style={{ width: '100%', height: '6px', background: '#f3f3f6', borderRadius: '3px', overflow: 'hidden', marginTop: '6px' }}>
                                <div style={{
                                  width: `${progress}%`,
                                  height: '100%',
                                  background: skill.is_stage_ready ? '#10b981' : '#000',
                                  transition: 'width 0.3s ease'
                                }} />
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div style={{ borderTop: '1px solid #e8e8ed', paddingTop: '20px', marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Plus size={16} style={{ color: '#000' }} />
                      <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#000', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Song aus Katalog hinzufügen
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowCreateSongModal(!showCreateSongModal)}
                      style={{
                        background: '#f3f3f6',
                        color: '#000',
                        border: '1.5px solid #e8e8ed',
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                      className="hover-scale-mini"
                    >
                      ➕ Neu anlegen
                    </button>
                  </div>

                  {showCreateSongModal && (
                    <form onSubmit={handleCreateAndAssignSong} style={{
                      background: '#fafbfd',
                      border: '1.5px solid #e8e8ed',
                      borderRadius: '16px',
                      padding: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
                    }} className="animation-slide-up">
                      <div style={{ fontSize: '0.7rem', fontWeight: 900, color: '#000', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        🎵 Neuen Song erschaffen
                      </div>
                      <input
                        type="text"
                        placeholder="Titel (z.B. Wonderwall)..."
                        value={newSongTitle}
                        onChange={(e) => setNewSongTitle(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          borderRadius: '10px',
                          border: '1.5px solid #e8e8ed',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          outline: 'none',
                          background: 'white'
                        }}
                        required
                      />
                      <input
                        type="text"
                        placeholder="Künstler (z.B. Oasis)..."
                        value={newSongArtist}
                        onChange={(e) => setNewSongArtist(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          borderRadius: '10px',
                          border: '1.5px solid #e8e8ed',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          outline: 'none',
                          background: 'white'
                        }}
                        required
                      />
                      <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                        <button
                          type="button"
                          onClick={() => setShowCreateSongModal(false)}
                          style={{
                            flex: 1,
                            background: 'white',
                            color: '#7d7d82',
                            border: '1.5px solid #cbd5e1',
                            borderRadius: '10px',
                            padding: '6px',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            cursor: 'pointer'
                          }}
                        >
                          Abbrechen
                        </button>
                        <button
                          type="submit"
                          style={{
                            flex: 1,
                            background: '#000',
                            color: 'white',
                            border: 'none',
                            borderRadius: '10px',
                            padding: '6px',
                            fontSize: '0.72rem',
                            fontWeight: 900,
                            cursor: 'pointer'
                          }}
                        >
                          Erstellen & Zuweisen
                        </button>
                      </div>
                    </form>
                  )}

                  <input
                    type="text"
                    placeholder="Song oder Künstler suchen..."
                    value={songSearch}
                    onChange={(e) => setSongSearch(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '12px',
                      border: '1.5px solid #e8e8ed',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      outline: 'none',
                      background: '#f8f8fa',
                      transition: 'border-color 0.2s'
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#000';
                      setIsSongSearchFocused(true);
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#e8e8ed';
                      setTimeout(() => setIsSongSearchFocused(false), 200);
                    }}
                  />

                  {(songSearch.trim().length > 0 || isSongSearchFocused) && (
                    <div style={{
                      maxHeight: '180px',
                      overflowY: 'auto',
                      border: '1.5px solid #e8e8ed',
                      borderRadius: '16px',
                      padding: '6px',
                      background: 'white',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.06)'
                    }}>
                      {(() => {
                        const filtered = songs.filter(s => 
                          s.title?.toLowerCase().includes(songSearch.toLowerCase()) || 
                          s.artist?.toLowerCase().includes(songSearch.toLowerCase())
                        );
                        
                        if (filtered.length === 0) {
                          return (
                            <div style={{ padding: '16px', fontSize: '0.78rem', color: '#7d7d82', textAlign: 'center', fontStyle: 'italic' }}>
                              Keine Treffer gefunden.
                            </div>
                          );
                        }

                        return filtered.map((song) => (
                          <button
                            key={song.id}
                            type="button"
                            onClick={() => handleAssignSongFromCatalog(song.id)}
                            style={{
                              textAlign: 'left',
                              padding: '8px 12px',
                              borderRadius: '10px',
                              border: 'none',
                              background: 'white',
                              color: '#000',
                              cursor: 'pointer',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              transition: 'background 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = '#f3f3f6'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                          >
                            <div>
                              <div style={{ fontWeight: 800, fontSize: '0.82rem' }}>{song.title}</div>
                              <div style={{ fontSize: '0.7rem', color: '#7d7d82', fontWeight: 600 }}>{song.artist}</div>
                            </div>
                            <span style={{ fontSize: '0.72rem', background: '#000', color: 'white', padding: '2px 8px', borderRadius: '10px', fontWeight: 800 }}>
                              Hinzufügen
                            </span>
                          </button>
                        ));
                  })()}
                </div>
              )}
            </div>
          </>
        )}
      </div>

        {useNotebookLayout && (
          <div style={{
            width: '6px',
            background: '#18181b',
            position: 'relative',
            zIndex: 30,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-around',
            alignItems: 'center',
            padding: '20px 0',
            alignSelf: 'stretch'
          }}>
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} style={{ position: 'relative', width: '100%', display: 'flex', justifyContent: 'center' }}>
                <div style={{
                  width: '40px',
                  height: '4px',
                  borderRadius: '2px',
                  background: 'linear-gradient(180deg, #ffd54f 0%, #ff9100 100%)',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.25)',
                  zIndex: 35,
                  position: 'absolute',
                  left: '-17px'
                }} />
              </div>
            ))}
          </div>
        )}

        {/* COLUMN 3: ✍️ DOKUMENTATION & HAUSAUFGABE (32%) */}
          
          <div style={{
            flex: '1 1 0%',
            padding: useNotebookLayout ? '24px 24px 24px 60px' : '24px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            background: useNotebookLayout ? 'white' : '#f8fafc',
            backgroundImage: useNotebookLayout ? 'repeating-linear-gradient(white, white 27px, #e5e0d4 27px, #e5e0d4 28px)' : 'none',
            borderLeft: useNotebookLayout ? 'none' : '1px solid #e4e4e7',
            borderRadius: useNotebookLayout ? '0 0 20px 0' : '0',
            boxShadow: useNotebookLayout ? '10px 10px 20px rgba(0,0,0,0.15)' : 'none',
            position: 'relative',
            height: '100%'
          }}>
            {useNotebookLayout && (
              <div style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: '42px',
                width: '2px',
                background: '#fca5a5',
                zIndex: 10
              }} />
            )}
            {useNotebookLayout && (
              <div style={{
                position: 'absolute',
                top: '20px',
                bottom: '20px',
                left: '8px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-around',
                zIndex: 25
              }}>
                {Array.from({ length: 6 }).map((_, idx) => (
                  <div key={idx} style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: '#121214',
                    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.8)'
                  }} />
                ))}
              </div>
            )}

            {activeSubView === 'history' ? (
              (() => {
                if (!selectedHistoryWeek) {
                  return (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748b', fontSize: '0.86rem', fontStyle: 'italic' }}>
                      Wähle links eine Unterrichtswoche aus.
                    </div>
                  );
                }

                const weekNum = selectedHistoryWeek.split('-W')[1] || '';
                const weekItems = progressItems.filter(item => 
                  item.updated_at && getISOWeek(item.updated_at) === selectedHistoryWeek
                );

                // Group page numbers by book title
                const groupedLehrwerke: Record<string, { pages: number[] }> = {};
                const otherHWs: any[] = [];
                const allActive = weekItems.filter(item => item.is_current_homework || item.status === 'THEORY_DONE');

                allActive.forEach(item => {
                  if (item.topic_name.includes(' - Seite ')) {
                    const parts = item.topic_name.split(' - Seite ');
                    const bookTitle = parts[0].trim();
                    const pageNum = parseInt(parts[1], 10);
                    if (!groupedLehrwerke[bookTitle]) {
                      groupedLehrwerke[bookTitle] = { pages: [] };
                    }
                    if (!isNaN(pageNum) && !groupedLehrwerke[bookTitle].pages.includes(pageNum)) {
                      groupedLehrwerke[bookTitle].pages.push(pageNum);
                    }
                  } else {
                    otherHWs.push(item);
                  }
                });

                // Extract unique non-empty homework notes
                const uniqueHomeworkNotes: string[] = [];
                weekItems.forEach(item => {
                  if (item.homework_notes && item.homework_notes.trim() !== '') {
                    try {
                      const parsed = JSON.parse(item.homework_notes);
                      if (Array.isArray(parsed)) {
                        parsed.forEach((n: string) => {
                          if (n.trim() !== '' && !uniqueHomeworkNotes.includes(n.trim())) {
                            uniqueHomeworkNotes.push(n.trim());
                          }
                        });
                      } else if (typeof parsed === 'string' && parsed.trim() !== '' && !uniqueHomeworkNotes.includes(parsed.trim())) {
                        uniqueHomeworkNotes.push(parsed.trim());
                      }
                    } catch (e) {
                      if (!uniqueHomeworkNotes.includes(item.homework_notes.trim())) {
                        uniqueHomeworkNotes.push(item.homework_notes.trim());
                      }
                    }
                  }
                });

                // Extract teacher notes
                const weekTeacherNotes = weekItems
                  .map(item => item.teacher_notes)
                  .filter(n => n && n.trim() !== '')
                  .join('\n\n');

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeIn 0.25s ease', height: '100%' }}>
                    <div>
                      <span style={{ fontSize: '0.84rem', fontWeight: 900, color: '#09090b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        🗓️ Details KW {weekNum}
                      </span>
                      <p style={{ margin: '3px 0 0 0', fontSize: '0.76rem', color: '#71717a', fontWeight: 550, lineHeight: '1.3' }}>
                        Hausaufgaben und Notizen aus dieser Woche (Schreibgeschützt).
                      </p>
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', paddingRight: '4px' }}>
                      {/* Active Homework Items Box */}
                      <div style={{
                        background: '#fffbeb',
                        border: '1px solid #fef08a',
                        borderRadius: '16px',
                        padding: '14px 16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)'
                      }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#18181b' }}>
                          Hausaufgaben KW {weekNum}
                        </span>

                        {Object.keys(groupedLehrwerke).length === 0 && otherHWs.length === 0 ? (
                          <span style={{ fontSize: '0.72rem', color: '#71717a', fontStyle: 'italic' }}>
                            Keine Hausaufgaben erfasst.
                          </span>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {Object.entries(groupedLehrwerke).map(([title, info]) => (
                              <div key={title} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <div style={{ fontSize: '0.92rem', color: '#09090b', fontWeight: 900 }}>
                                  📖 {title} · <span style={{ color: '#4b5563', fontWeight: 700 }}>S. {info.pages.join(', ')}</span>
                                </div>
                              </div>
                            ))}
                            {otherHWs.length > 0 && (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', borderTop: '1px solid rgba(251, 191, 36, 0.2)', paddingTop: '8px' }}>
                                {otherHWs.map((item, idx) => (
                                  <div key={idx} style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    background: '#ffffff',
                                    color: '#475569',
                                    padding: '4px 10px',
                                    borderRadius: '999px',
                                    fontSize: '0.76rem',
                                    fontWeight: 900,
                                    border: '1px solid rgba(251, 191, 36, 0.3)',
                                    boxShadow: '0 3px 8px rgba(0,0,0,0.03), 0 0 12px rgba(251, 191, 36, 0.32)'
                                  }}>
                                    <span>🎵 {item.topic_name}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Homework notes */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1e293b' }}>
                          📝 Hausaufgaben-Bemerkungen
                        </label>
                        <div style={{
                          width: '100%', minHeight: '80px', padding: '12px 14px', borderRadius: '16px',
                          border: '1px solid #e2e8f0', fontSize: '0.8rem', fontWeight: 600, background: '#fafafa', color: '#4b5563',
                          whiteSpace: 'pre-wrap'
                        }}>
                          {uniqueHomeworkNotes.join('\n\n') || 'Keine Bemerkungen hinterlegt.'}
                        </div>
                      </div>

                      {/* Internal teacher notes */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1e293b' }}>
                          🔒 Interne Notiz (nur für Lehrer)
                        </label>
                        <div style={{
                          width: '100%', minHeight: '60px', padding: '12px 14px', borderRadius: '16px',
                          border: '1px solid #e2e8f0', fontSize: '0.8rem', fontWeight: 600, background: '#fafafa', color: '#4b5563',
                          whiteSpace: 'pre-wrap'
                        }}>
                          {weekTeacherNotes || 'Keine internen Notizen.'}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()
            ) : activeSubView === 'lehrwerk' && activeLehrwerkId ? (
              // textbook detail notebook view
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeIn 0.25s ease' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                    {/* 6. Current status color circle before the page number */}
                    <div style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      background: status === 'MASTERED' ? 'hsl(130, 65%, 82%)' : (isCurrentHomework ? 'hsl(47, 85%, 84%)' : 'hsl(355, 75%, 84%)'),
                      border: '1.5px solid rgba(0,0,0,0.1)',
                      boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)',
                      flexShrink: 0
                    }} />
                    <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#000' }}>
                      {activePageNumber ? `Seite ${activePageNumber}` : 'Keine Seite ausgewählt'}
                    </h3>
                  </div>

                  {/* 7. Color buttons inline, right aligned */}
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                    {[
                      { mode: 'LOCKED', color: 'hsl(355, 75%, 84%)', label: 'Rot (unbearbeitet)', getActive: () => status === 'IN_PROGRESS' && !isCurrentHomework, action: () => { setStatus('IN_PROGRESS'); setIsCurrentHomework(false); setHasChanges(true); if (activeLehrwerkId && activePageNumber) triggerDirectSave(activeLehrwerkId, activePageNumber, 'IN_PROGRESS', false); } },
                      { mode: 'HOMEWORK', color: 'hsl(47, 85%, 84%)', label: 'Gelb (Hausaufgabe)', getActive: () => status === 'IN_PROGRESS' && isCurrentHomework, action: () => { setStatus('IN_PROGRESS'); setIsCurrentHomework(true); setHasChanges(true); if (activeLehrwerkId && activePageNumber) triggerDirectSave(activeLehrwerkId, activePageNumber, 'IN_PROGRESS', true); } },
                      { mode: 'MASTERED', color: 'hsl(130, 65%, 82%)', label: 'Grün (erledigt)', getActive: () => status === 'MASTERED', action: () => { setStatus('MASTERED'); setIsCurrentHomework(false); setHasChanges(true); if (activeLehrwerkId && activePageNumber) triggerDirectSave(activeLehrwerkId, activePageNumber, 'MASTERED', false); } }
                    ].map(b => {
                      const isActive = b.getActive();
                      return (
                        <button
                          key={b.mode}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            b.action();
                          }}
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            background: b.color,
                            border: isActive ? '3.5px solid #0f172a' : '1px solid rgba(0,0,0,0.15)',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            transform: isActive ? 'scale(1.1)' : 'none',
                            outline: 'none',
                            boxShadow: '0 2px 5px rgba(0,0,0,0.05)'
                          }}
                          title={b.label}
                        />
                      );
                    })}
                  </div>
                </div>

                {/* textbook page documentation form */}
                <form onSubmit={(e) => handleSave(e, false)} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* 4. Hausaufgabe & Notizen Widget prominent style */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '0.86rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      📝 Hausaufgabe & Notiz für diese Seite:
                    </label>
                    <textarea
                      placeholder="Trage hier die Hausaufgabe oder Notizen für diese Seite ein..."
                      value={homeworkNotes}
                      onChange={(e) => {
                        setHomeworkNotes(e.target.value);
                        setHasChanges(true);
                      }}
                      style={{
                        width: '100%',
                        height: '180px',
                        padding: '16px',
                        borderRadius: '20px',
                        border: '1.5px solid #cbd5e1',
                        fontSize: '0.88rem',
                        fontWeight: 650,
                        lineHeight: '1.5',
                        outline: 'none',
                        resize: 'none',
                        background: '#fefdf8',
                        color: '#1e293b',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.02), inset 0 2px 4px rgba(0,0,0,0.02)',
                        transition: 'all 0.2s ease'
                      }}
                      onFocus={e => {
                        e.currentTarget.style.borderColor = '#456355';
                        e.currentTarget.style.boxShadow = '0 0 0 3px rgba(69, 99, 85, 0.15)';
                      }}
                      onBlur={e => {
                        e.currentTarget.style.borderColor = '#cbd5e1';
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.02), inset 0 2px 4px rgba(0,0,0,0.02)';
                      }}
                    />
                    
                    {/* 9. Notizen speichern button right below textarea / templates */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
                      {/* Schnell-Textbausteine */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                        {[
                          { label: '🐌 Schnecke', text: 'Spiele die schwierige Passage ganz langsam wie eine Schnecke.' },
                          { label: '🔂 Ritter-Drei', text: 'Wiederhole den kniffligen Übergang dreimal hintereinander fehlerfrei.' },
                          { label: '🎵 Laut-Leise', text: 'Lass das Stück lebendig klingen! Mache deutliche Unterschiede.' },
                          { label: '⏱️ 10-Min.', text: 'Stelle dir einen Timer auf 10 Minuten. Übe jeden Tag.' }
                        ].map((tpl, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => {
                              setHomeworkNotes(prev => prev ? `${prev}\n\n${tpl.text}` : tpl.text);
                              setHasChanges(true);
                            }}
                            style={{
                              background: '#ffffff', color: '#475569', border: '1px solid #e2e8f0',
                              padding: '4px 8px', borderRadius: '9999px', fontSize: '0.62rem', fontWeight: 700, cursor: 'pointer'
                            }}
                          >
                            {tpl.label}
                          </button>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleSave(true)}
                        style={{
                          background: '#456355',
                          color: 'white',
                          border: 'none',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          fontSize: '0.74rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}
                      >
                        Notizen speichern
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1e293b' }}>
                      🔒 Interne Notiz (nur für Lehrer)
                    </label>
                    <textarea
                      placeholder="Interne Bemerkungen..."
                      value={teacherNotes}
                      onChange={(e) => {
                        setTeacherNotes(e.target.value);
                        setHasChanges(true);
                      }}
                      style={{
                        width: '100%', height: '70px', padding: '12px 14px', borderRadius: '16px',
                        border: '1px solid #cbd5e1', fontSize: '0.8rem', fontWeight: 600, outline: 'none', resize: 'none', background: 'white'
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveSubView('hub');
                        setActiveLehrwerkId(null);
                        setActivePageNumber(null);
                      }}
                      style={{
                        flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid #456355',
                        background: 'white', color: '#456355', fontWeight: 800, fontSize: '0.78rem', cursor: 'pointer'
                      }}
                    >
                      Zurück
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      style={{
                        flex: 2, padding: '12px', borderRadius: '12px', border: 'none',
                        background: '#456355', color: 'white', fontWeight: 800, fontSize: '0.78rem', cursor: 'pointer'
                      }}
                    >
                      {saving ? 'Speichert...' : 'Seite speichern'}
                    </button>
                  </div>
                </form>
              </div>
            ) : activeSubView === 'song' && selectedActiveSongId ? (
              // song detail notebook view
              (() => {
                const skill = activeSongSkills.find(s => s.id === selectedActiveSongId);
                if (!skill) return null;

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', animation: 'fadeIn 0.25s ease' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                          <div style={{
                            width: '18px',
                            height: '18px',
                            borderRadius: '50%',
                            background: status === 'MASTERED' ? 'hsl(130, 65%, 82%)' : (isCurrentHomework ? 'hsl(47, 85%, 84%)' : 'hsl(355, 75%, 84%)'),
                            border: '1.5px solid rgba(0,0,0,0.1)',
                            boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)',
                            flexShrink: 0
                          }} />
                          <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#000' }}>
                            {skill.songs?.artist ? `${skill.songs.artist} - ${skill.songs.title}` : (skill.songs?.title || 'Song Details')}
                          </h3>
                        </div>

                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                          {[
                             { mode: 'LOCKED', color: 'hsl(355, 75%, 84%)', label: 'Rot (unbearbeitet)', getActive: () => status === 'IN_PROGRESS' && !isCurrentHomework, action: () => { setStatus('IN_PROGRESS'); setIsCurrentHomework(false); setSongProgressPercent(25); setRhythmVal(25); setFingerVal(25); setExpressionVal(25); setHasChanges(true); } },
                             { mode: 'HOMEWORK', color: 'hsl(47, 85%, 84%)', label: 'Gelb (Hausaufgabe)', getActive: () => status === 'IN_PROGRESS' && isCurrentHomework, action: () => { setStatus('IN_PROGRESS'); setIsCurrentHomework(true); setSongProgressPercent(25); setRhythmVal(25); setFingerVal(25); setExpressionVal(25); setHasChanges(true); } },
                             { mode: 'MASTERED', color: 'hsl(130, 65%, 82%)', label: 'Grün (erledigt)', getActive: () => status === 'MASTERED', action: () => { setStatus('MASTERED'); setIsCurrentHomework(false); setSongProgressPercent(100); setRhythmVal(100); setFingerVal(100); setExpressionVal(100); setHasChanges(true); } }
                           ].map(b => {
                            const isActive = b.getActive();
                            return (
                              <button
                                key={b.mode}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  b.action();
                                }}
                                style={{
                                  width: '24px',
                                  height: '24px',
                                  borderRadius: '50%',
                                  background: b.color,
                                  border: isActive ? '3.5px solid #0f172a' : '1px solid rgba(0,0,0,0.15)',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease',
                                  transform: isActive ? 'scale(1.1)' : 'none',
                                  outline: 'none',
                                  boxShadow: '0 2px 5px rgba(0,0,0,0.05)'
                                }}
                                title={b.label}
                              />
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontSize: '0.86rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          📝 Übungs-Fahrplan & Hausaufgabe:
                        </label>
                        <textarea
                          placeholder="Passagen, Anschlagstechniken oder Rhythmen eintragen..."
                          value={homeworkNotes}
                          onChange={(e) => {
                            setHomeworkNotes(e.target.value);
                            setHasChanges(true);
                          }}
                          style={{
                            width: '100%',
                            height: '140px',
                            padding: '16px',
                            borderRadius: '20px',
                            border: '1.5px solid #cbd5e1',
                            fontSize: '0.88rem',
                            fontWeight: 650,
                            lineHeight: '1.5',
                            outline: 'none',
                            resize: 'none',
                            background: '#fefdf8',
                            color: '#1e293b',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.02), inset 0 2px 4px rgba(0,0,0,0.02)',
                            transition: 'all 0.2s ease'
                          }}
                          onFocus={e => {
                            e.currentTarget.style.borderColor = 'var(--primary-color, #10b981)';
                            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.15)';
                          }}
                          onBlur={e => {
                            e.currentTarget.style.borderColor = '#cbd5e1';
                            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.02), inset 0 2px 4px rgba(0,0,0,0.02)';
                          }}
                        />
                        {/* Schnell-Textbausteine */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                          {[
                            { label: '🐌 Schnecke', text: 'Spiele die schwierige Passage ganz langsam wie eine Schnecke.' },
                            { label: '🔂 Ritter-Drei', text: 'Wiederhole den kniffligen Übergang dreimal hintereinander fehlerfrei.' },
                            { label: '🎵 Laut-Leise', text: 'Lass das Stück lebendig klingen! Mache deutliche Unterschiede.' },
                            { label: '⏱️ 10-Min.', text: 'Stelle dir einen Timer auf 10 Minuten. Übe jeden Tag.' }
                          ].map((tpl, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => {
                                setHomeworkNotes(prev => prev ? `${prev}\n\n${tpl.text}` : tpl.text);
                                setHasChanges(true);
                              }}
                              style={{
                                background: '#f8fafc',
                                color: '#475569',
                                border: '1.5px solid #e2e8f0',
                                padding: '6px 12px',
                                borderRadius: '99px',
                                fontSize: '0.72rem',
                                fontWeight: 750,
                                cursor: 'pointer',
                                transition: 'all 0.15s'
                              }}
                              className="hover-scale"
                              onMouseEnter={e => {
                                e.currentTarget.style.background = '#f1f5f9';
                                e.currentTarget.style.borderColor = '#cbd5e1';
                              }}
                              onMouseLeave={e => {
                                e.currentTarget.style.background = '#f8fafc';
                                e.currentTarget.style.borderColor = '#e2e8f0';
                              }}
                            >
                              {tpl.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontSize: '0.86rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          🔒 Interne Notiz (nur für Lehrer):
                        </label>
                        <textarea
                          placeholder="Interne Bemerkungen..."
                          value={teacherNotes}
                          onChange={(e) => {
                            setTeacherNotes(e.target.value);
                            setHasChanges(true);
                          }}
                          style={{
                            width: '100%',
                            height: '100px',
                            padding: '16px',
                            borderRadius: '20px',
                            border: '1.5px solid #cbd5e1',
                            fontSize: '0.88rem',
                            fontWeight: 650,
                            lineHeight: '1.5',
                            outline: 'none',
                            resize: 'none',
                            background: '#fefdf8',
                            color: '#1e293b',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.02), inset 0 2px 4px rgba(0,0,0,0.02)',
                            transition: 'all 0.2s ease'
                          }}
                          onFocus={e => {
                            e.currentTarget.style.borderColor = 'var(--primary-color, #10b981)';
                            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.15)';
                          }}
                          onBlur={e => {
                            e.currentTarget.style.borderColor = '#cbd5e1';
                            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.02), inset 0 2px 4px rgba(0,0,0,0.02)';
                          }}
                        />
                      </div>

                      <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveSubView('hub');
                            setSelectedActiveSongId('');
                          }}
                          style={{
                            flex: 1,
                            padding: '14px',
                            borderRadius: '14px',
                            border: '1px solid #cbd5e1',
                            background: 'white',
                            color: '#475569',
                            fontWeight: 800,
                            fontSize: '0.82rem',
                            cursor: 'pointer',
                            boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
                            transition: 'all 0.15s ease'
                          }}
                          className="hover-scale"
                        >
                          Zurück
                        </button>
                        <button
                          type="submit"
                          disabled={saving}
                          style={{
                            flex: 2,
                            padding: '14px',
                            borderRadius: '14px',
                            border: 'none',
                            background: '#456355',
                            color: 'white',
                            fontWeight: 800,
                            fontSize: '0.82rem',
                            cursor: 'pointer',
                            boxShadow: '0 4px 10px rgba(69, 99, 85, 0.2)',
                            transition: 'all 0.15s ease'
                          }}
                          className="hover-scale"
                        >
                          {saving ? 'Speichert...' : 'Song speichern'}
                        </button>
                      </div>
                    </form>
                  </div>
                );
              })()
            ) : (
              // GENERAL HUB VIEW (only homework Checklist + general notes textarea)
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                  <div>
                    <span style={{ fontSize: '0.84rem', fontWeight: 900, color: '#09090b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      ✍️ Eintrag & Hausaufgabe
                    </span>
                    <p style={{ margin: '3px 0 0 0', fontSize: '0.76rem', color: '#71717a', fontWeight: 550, lineHeight: '1.3' }}>
                      Dokumentiere den heutigen Unterricht für den Schüler.
                    </p>
                  </div>
                  
                  {/* Sticky Note Button for History */}
                  <div 
                    style={{
                      filter: 'drop-shadow(0 5px 10px rgba(0,0,0,0.08)) drop-shadow(0 2px 4px rgba(0,0,0,0.05))',
                      transition: 'transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                      transform: 'rotate(3deg)',
                      flexShrink: 0,
                      cursor: 'pointer',
                      position: 'relative'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-4px) rotate(4.5deg) scale(1.06)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'rotate(3deg)';
                    }}
                  >
                    {/* Matte Pushpin positioned on top of the paper */}
                    <div style={{
                      position: 'absolute',
                      top: '-10px',
                      left: '50%',
                      transform: 'translateX(-50%) rotate(-8deg)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      zIndex: 10,
                      pointerEvents: 'none'
                    }}>
                      <div style={{
                        width: '14px',
                        height: '14px',
                        borderRadius: '50%',
                        background: 'radial-gradient(circle at 4px 4px, #ef4444 0%, #b91c1c 80%, #7f1d1d 100%)', // Matte red pin
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2), inset 0 -1px 2px rgba(0,0,0,0.3)',
                        position: 'relative'
                      }} />
                      <div style={{
                        width: '2px',
                        height: '10px',
                        background: 'linear-gradient(90deg, #94a3b8 0%, #475569 100%)', // Toned-down metal shaft
                        marginTop: '-1px',
                        boxShadow: '1px 1px 2px rgba(0,0,0,0.1)'
                      }} />
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setActiveSubView('history');
                        // Pre-select the most recent week if available
                        const weeks = Array.from(new Set(progressItems
                          .filter(item => item.updated_at)
                          .map(item => getISOWeek(item.updated_at))
                        )).sort().reverse();
                        if (weeks.length > 0) {
                          setSelectedHistoryWeek(weeks[0]);
                        }
                      }}
                      style={{
                        // Layered very thin fold lines to simulate a finely crumpled paper (feiner geknicktes Papier)
                        background: 'linear-gradient(120deg, transparent 49.8%, rgba(0,0,0,0.04) 50%, rgba(255,255,255,0.08) 50.1%, transparent 50.3%), linear-gradient(35deg, transparent 29.8%, rgba(0,0,0,0.04) 30%, rgba(255,255,255,0.08) 30.1%, transparent 30.3%), linear-gradient(165deg, transparent 74.8%, rgba(0,0,0,0.03) 75%, rgba(255,255,255,0.08) 75.1%, transparent 75.3%), linear-gradient(85deg, transparent 59.8%, rgba(0,0,0,0.03) 60%, rgba(255,255,255,0.08) 60.1%, transparent 60.3%), repeating-linear-gradient(45deg, rgba(0,0,0,0.003) 0px, rgba(0,0,0,0.003) 1px, transparent 1px, transparent 4px), linear-gradient(135deg, #fef9c3 0%, #fef08a 100%)',
                        border: 'none',
                        clipPath: 'polygon(2% 2%, 23% 1%, 43% 3%, 63% 1%, 83% 2%, 98% 1%, 99% 19%, 97% 38%, 99% 58%, 98% 78%, 99% 98%, 79% 97%, 59% 99%, 39% 97%, 19% 98%, 2% 99%, 1% 79%, 3% 59%, 1% 39%, 2% 19%)',
                        padding: '22px 14px 12px 14px',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '2px',
                        fontFamily: '"Helvetica Neue", Helvetica, Inter, Arial, sans-serif',
                        flexShrink: 0,
                        minWidth: '98px',
                        minHeight: '78px'
                      }}
                    >
                      <span style={{ 
                        fontSize: '0.66rem', 
                        fontWeight: 800, 
                        color: '#a16207', 
                        textTransform: 'uppercase', 
                        letterSpacing: '0.04em', 
                        lineHeight: 1 
                      }}>
                        Hausaufgaben
                      </span>
                      <span style={{ 
                        fontSize: '0.86rem', 
                        fontWeight: 900, 
                        color: '#854d0e', 
                        textTransform: 'uppercase', 
                        letterSpacing: '0.06em', 
                        lineHeight: 1.1,
                        marginTop: '1px'
                      }}>
                        Archiv
                      </span>
                    </button>
                  </div>
                </div>

                {/* The Main Input Form Card */}
                <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', gap: '16px' }}>
                  <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    paddingRight: '6px',
                    paddingBottom: '8px',
                    display: 'flex',
                    flexDirection: 'column'
                  }}>
                    <div style={{
                      background: 'white',
                      border: '1px solid #e4e4e7',
                      borderRadius: '24px',
                      padding: '20px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '16px',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.02)'
                    }}>
                      {/* Combined Hausaufgaben-Fahrplan Widget */}
                      <div style={{
                        background: '#fffbeb',
                        border: '1px solid #fef08a',
                        borderRadius: '16px',
                        padding: '14px 16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f4f4f5', paddingBottom: '8px' }}>
                          <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#18181b', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            🗓️ Hausaufgaben KW {getISOWeek().split('-W')[1]}
                          </span>
                          {(progressItems.some(item => item.is_current_homework) || homeworkNotes.trim() !== '') && (
                            <button 
                              type="button" 
                              onClick={async () => {
                                await handleResetAllCurrentHomework();
                                setHomeworkNotes('');
                              }}
                              style={{ 
                                border: 'none', 
                                background: 'none', 
                                color: '#ef4444', 
                                fontSize: '0.66rem', 
                                fontWeight: 700, 
                                cursor: 'pointer', 
                                padding: 0,
                                transition: 'color 0.15s ease'
                              }}
                              className="hover-scale-mini"
                            >
                              Zurücksetzen
                            </button>
                          )}
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {(() => {
                            const activeHWs = progressItems.filter(item => item.is_current_homework && !item.topic_name.startsWith('Hausaufgabe KW '));
                            const currentWeek = getISOWeek();
                            const activeTheories = progressItems.filter(item => 
                              item.status === 'THEORY_DONE' && 
                              item.updated_at && 
                              getISOWeek(item.updated_at) === currentWeek &&
                              !item.topic_name.startsWith('Hausaufgabe KW ')
                            );
                            const hasActive = activeHWs.length > 0 || activeTheories.length > 0;
                            const hasNotes = homeworkNotesList.length > 0;
                            
                            if (!hasActive && !hasNotes) {
                              return (
                                <span style={{ fontSize: '0.72rem', color: '#71717a', fontWeight: 550, fontStyle: 'italic', lineHeight: '1.4' }}>
                                  ✨ Keine aktiven Hausaufgaben erfasst. Markiere Lehrwerke oder Songs.
                                </span>
                              );
                            }
                            
                            // Group page numbers by book title
                            const groupedLehrwerke: Record<string, { pages: number[] }> = {};
                            const otherHWs: any[] = [];
                            
                            const allActive = [...activeHWs, ...activeTheories];
                            
                            allActive.forEach(item => {
                              if (item.topic_name.includes(' - Seite ')) {
                                const parts = item.topic_name.split(' - Seite ');
                                const bookTitle = parts[0].trim();
                                const pageNum = parseInt(parts[1], 10);
                                if (!groupedLehrwerke[bookTitle]) {
                                  groupedLehrwerke[bookTitle] = { pages: [] };
                                }
                                if (!isNaN(pageNum) && !groupedLehrwerke[bookTitle].pages.includes(pageNum)) {
                                  groupedLehrwerke[bookTitle].pages.push(pageNum);
                                }
                              } else {
                                otherHWs.push(item);
                              }
                            });
                            
                            // Convert to list
                            const lehrwerkeList = Object.entries(groupedLehrwerke).map(([title, info]) => {
                              info.pages.sort((a: number, b: number) => a - b);
                              return { title, pages: info.pages };
                            });
                            
                            return (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {lehrwerkeList.map((item, idx) => (
                                  <div key={`lw-${idx}`} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    {/* Grouped line */}
                                    <div style={{
                                      fontSize: '0.92rem',
                                      color: '#09090b',
                                      fontWeight: 900,
                                      letterSpacing: '-0.035em',
                                      fontFamily: '"Helvetica Neue", Helvetica, Inter, Arial, sans-serif',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '6px'
                                    }}>
                                      {(() => {
                                        const bookColor = getLehrwerkColor(item.title);
                                        return (
                                          <div style={{
                                            width: '16px',
                                            height: '20px',
                                            background: `linear-gradient(135deg, ${bookColor.from}, ${bookColor.to})`,
                                            borderRadius: '3px',
                                            border: 'none',
                                            position: 'relative',
                                            flexShrink: 0,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                          }}>
                                            <BookOpen size={9} color={bookColor.text} />
                                            <div style={{
                                              position: 'absolute',
                                              left: 0,
                                              top: 0,
                                              bottom: 0,
                                              width: '2px',
                                              background: 'rgba(0,0,0,0.08)',
                                              borderRight: '1px solid rgba(255,255,255,0.05)'
                                            }} />
                                          </div>
                                        );
                                      })()}
                                      <span>{item.title}</span> <span style={{ color: '#4b5563', fontWeight: 700, marginLeft: '4px', letterSpacing: '-0.02em' }}>· {formatPageNumbers(item.pages)}</span>
                                    </div>
                                    {/* Horizontal premium badge chips */}
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', paddingLeft: '2px' }}>
                                      {item.pages.map((p: number) => {
                                        const original = allActive.find(x => x.topic_name === `${item.title} - Seite ${p}`);
                                        return (
                                          <div key={`p-${p}`} style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '5px',
                                            background: '#ffffff',
                                            color: '#475569',
                                            padding: '4px 10px 4px 12px',
                                            borderRadius: '999px',
                                            fontSize: '0.76rem',
                                            fontWeight: 900,
                                            border: '1px solid rgba(251, 191, 36, 0.3)',
                                            fontFamily: '"Helvetica Neue", Helvetica, Inter, Arial, sans-serif',
                                            letterSpacing: '-0.02em',
                                            boxShadow: '0 3px 8px rgba(0,0,0,0.03), 0 0 12px rgba(251, 191, 36, 0.32)'
                                          }}>
                                            <span>📄 S. {p}</span>
                                            {original?.id && !(original?.updated_at && getISOWeek(original.updated_at) !== getISOWeek()) && (
                                              <button
                                                type="button"
                                                onClick={() => handleRemoveHomeworkItem(original.id!, item.title, p)}
                                                style={{
                                                  border: 'none',
                                                  background: 'none',
                                                  color: '#ef4444',
                                                  cursor: 'pointer',
                                                  fontSize: '0.74rem',
                                                  fontWeight: 800,
                                                  display: 'flex',
                                                  alignItems: 'center',
                                                  justifyContent: 'center',
                                                  padding: '2px',
                                                  marginLeft: '2px'
                                                }}
                                              >
                                                ✕
                                              </button>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                ))}

                                {otherHWs.length > 0 && (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid rgba(251, 191, 36, 0.2)', paddingTop: '8px' }}>
                                    <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                      Songs & Sonstige Hausaufgaben
                                    </span>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                      {otherHWs.map((item, idx) => (
                                        <div key={idx} style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '5px',
                                          background: '#ffffff',
                                          color: '#475569',
                                          padding: '4px 10px 4px 12px',
                                          borderRadius: '999px',
                                          fontSize: '0.76rem',
                                          fontWeight: 900,
                                          border: '1px solid rgba(251, 191, 36, 0.3)',
                                          boxShadow: '0 3px 8px rgba(0,0,0,0.03), 0 0 12px rgba(251, 191, 36, 0.32)'
                                        }}>
                                          <span>🎵 {item.topic_name}</span>
                                          {!(item.updated_at && getISOWeek(item.updated_at) !== getISOWeek()) && (
                                            <button
                                              type="button"
                                              onClick={() => handleRemoveHomeworkItem(item.id!)}
                                              style={{
                                                border: 'none',
                                                background: 'none',
                                                color: '#ef4444',
                                                cursor: 'pointer',
                                                fontSize: '0.74rem',
                                                fontWeight: 800,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                padding: '2px',
                                                marginLeft: '2px'
                                              }}
                                            >
                                              ✕
                                            </button>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      </div>

                      {/* General homework text notes */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px' }}>
                        <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1e293b' }}>
                          📝 Zusätzliche Hausaufgaben-Bemerkungen
                        </label>
                        <textarea
                          placeholder="Trage hier zusätzliche Bemerkungen zur Hausaufgabe ein..."
                          value={homeworkNotes}
                          onChange={(e) => {
                            setHomeworkNotes(e.target.value);
                            setHasChanges(true);
                          }}
                          style={{
                            width: '100%', height: '90px', padding: '12px 14px', borderRadius: '16px',
                            border: '1px solid #cbd5e1', fontSize: '0.8rem', fontWeight: 600, outline: 'none', resize: 'none', background: 'white'
                          }}
                        />
                        {/* Schnell-Textbausteine */}
                        {/* Schnell-Textbausteine & Submit button side-by-side */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginTop: '6px' }}>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                            {[
                              { label: '🐌 Schnecke', text: 'Spiele die schwierige Passage ganz langsam wie eine Schnecke.' },
                              { label: '🔂 Ritter-Drei', text: 'Wiederhole den kniffligen Übergang dreimal hintereinander fehlerfrei.' },
                              { label: '🎵 Laut-Leise', text: 'Lass das Stück lebendig klingen! Mache deutliche Unterschiede.' },
                              { label: '⏱️ 10-Min.', text: 'Stelle dir einen Timer auf 10 Minuten. Übe jeden Tag.' }
                            ].map((tpl, i) => (
                              <button
                                key={i}
                                type="button"
                                onClick={() => {
                                  setHomeworkNotes(prev => prev ? `${prev}\n\n${tpl.text}` : tpl.text);
                                  setHasChanges(true);
                                }}
                                style={{
                                  background: '#ffffff', color: '#475569', border: '1px solid #e2e8f0',
                                  padding: '4px 8px', borderRadius: '9999px', fontSize: '0.62rem', fontWeight: 700, cursor: 'pointer'
                                }}
                              >
                                {tpl.label}
                              </button>
                            ))}
                          </div>

                          <button
                            type="submit"
                            disabled={saving}
                            style={{
                              background: '#456355',
                              color: 'white',
                              border: 'none',
                              padding: '6px 12px',
                              borderRadius: '10px',
                              fontSize: '0.7rem',
                              fontWeight: 800,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              boxShadow: '0 2px 6px rgba(69, 99, 85, 0.15)',
                              transition: 'all 0.15s'
                            }}
                            className="hover-scale"
                          >
                            <span>{saving ? 'Speichert...' : 'Bemerkung speichern'}</span>
                          </button>
                        </div>
                      </div>

                      {/* Internal teacher notes */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px' }}>
                        <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1e293b' }}>
                          🔒 Interne Notiz (nur für Lehrer)
                        </label>
                        <textarea
                          placeholder="Welche Aspekte liefen heute gut? Wo gab es Herausforderungen? Nur für Lehrer sichtbar..."
                          value={teacherNotes}
                          onChange={(e) => {
                            setTeacherNotes(e.target.value);
                            setHasChanges(true);
                          }}
                          style={{
                            width: '100%', height: '70px', padding: '12px 14px', borderRadius: '16px',
                            border: '1px solid #cbd5e1', fontSize: '0.8rem', fontWeight: 600, outline: 'none', resize: 'none', background: 'white'
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
                    <button
                      type="submit"
                      disabled={saving}
                      style={{
                        flex: 1, padding: '14px', borderRadius: '14px', border: 'none',
                        background: '#456355', color: 'white', fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer',
                        boxShadow: '0 4px 10px rgba(69, 99, 85, 0.2)',
                        transition: 'all 0.15s ease'
                      }}
                      className="hover-scale"
                    >
                      {saving ? 'Speichert...' : 'Eintrag speichern'}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </>
      ) : (
        /* COLUMN 4: 🏆 MEISTERWERKE & LOGBUCH (Full Width in Swiss Modernist Style) */
        <div style={{
          flex: 1,
          padding: useNotebookLayout ? '32px 32px 32px 60px' : '32px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
          background: useNotebookLayout ? '#faf8f2' : '#f8fafc',
          backgroundImage: useNotebookLayout ? 'repeating-linear-gradient(#faf8f2, #faf8f2 27px, #e5e0d4 27px, #e5e0d4 28px)' : 'none',
          borderRadius: useNotebookLayout ? '0 0 20px 20px' : '0',
          boxShadow: useNotebookLayout ? '0 10px 30px rgba(0,0,0,0.15)' : 'none',
          position: 'relative'
        }}>
          {useNotebookLayout && (
            <div style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: '42px',
              width: '2px',
              background: '#fca5a5',
              zIndex: 10
            }} />
          )}
          {useNotebookLayout && (
            <div style={{
              position: 'absolute',
              top: '20px',
              bottom: '20px',
              left: '8px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-around',
              zIndex: 25
            }}>
              {Array.from({ length: 6 }).map((_, idx) => (
                <div key={idx} style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#121214',
                  boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.8)'
                }} />
              ))}
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <span style={{ fontSize: '1.25rem' }}>🏆</span>
            <span style={{
              fontSize: '1rem',
              fontWeight: 900,
              color: '#0f172a',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              fontFamily: '"Helvetica Neue", Helvetica, Inter, Arial, sans-serif'
            }}>
              Meisterwerk-Logbuch
            </span>
          </div>

          {(() => {
            const masteredBooksList: any[] = [];
            assignedLehrwerke.forEach(assigned => {
              const book = globalLehrwerke.find(g => g.id === assigned.lehrwerkId);
              if (book) {
                const masteredPages: number[] = [];
                Object.entries(assigned.pageStates || {}).forEach(([pStr, state]: [string, any]) => {
                  if (state.status === 'mastered') {
                    const pNum = parseInt(pStr, 10);
                    if (!isNaN(pNum)) masteredPages.push(pNum);
                  }
                });
                if (masteredPages.length > 0) {
                  masteredBooksList.push({
                    title: book.title,
                    emoji: book.emoji,
                    pages: masteredPages.sort((a, b) => a - b)
                  });
                }
              }
            });

            const masteredSongs = activeSongSkills.filter(s => s.is_stage_ready || s.progress_percent === 100);

            const hasMastered = masteredBooksList.length > 0 || masteredSongs.length > 0;

            if (!hasMastered) {
              return (
                <div style={{
                  padding: '80px 24px',
                  textAlign: 'center',
                  border: useNotebookLayout ? '2px dashed #32483e' : '2px dashed #cbd5e1',
                  borderRadius: '24px',
                  color: useNotebookLayout ? '#8fa399' : '#475569',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  background: useNotebookLayout ? 'rgba(0,0,0,0.1)' : 'white',
                  maxWidth: '600px',
                  margin: '40px auto 0 auto'
                }}>
                  Noch keine Meisterwerke eingetragen. Auf geht's! 🚀
                </div>
              );
            }

            return (
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '24px',
                width: '100%',
                marginTop: '16px'
              }}>
                {/* Spalte 1: Songs */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px'
                }}>
                  <h3 style={{
                    fontSize: '1rem',
                    fontWeight: 800,
                    color: useNotebookLayout ? '#456355' : '#475569',
                    borderBottom: useNotebookLayout ? '2px solid #32483e' : '2px solid #e2e8f0',
                    paddingBottom: '8px',
                    margin: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <span>🎵</span> Songs
                  </h3>
                  
                  {masteredSongs.length === 0 ? (
                    <div style={{
                      padding: '30px 16px',
                      textAlign: 'center',
                      border: useNotebookLayout ? '1px dashed #32483e' : '1px dashed #cbd5e1',
                      borderRadius: '16px',
                      color: useNotebookLayout ? '#8fa399' : '#64748b',
                      fontSize: '0.82rem',
                      background: useNotebookLayout ? 'rgba(0,0,0,0.1)' : '#f8fafc'
                    }}>
                      Noch keine Meisterwerk-Songs vorhanden.
                    </div>
                  ) : (
                    masteredSongs.map((skill, idx) => (
                      <div key={`m-song-${idx}`} style={{
                        background: 'white',
                        border: '1px solid #e2e8f0',
                        borderRadius: '20px',
                        padding: '16px 20px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{
                            fontSize: '0.86rem',
                            color: '#0f172a',
                            fontWeight: 900,
                            letterSpacing: '-0.03em',
                            fontFamily: '"Helvetica Neue", Helvetica, Inter, Arial, sans-serif'
                          }}>
                            🎤 {skill.songs?.title}
                          </div>
                          <span style={{ fontSize: '0.72rem', background: '#f1f5f9', color: '#334155', padding: '3px 8px', borderRadius: '8px', fontWeight: 800, border: '1px solid #e2e8f0' }}>
                            {skill.instrument}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.74rem', color: '#475569', fontWeight: 700 }}>
                          {skill.songs?.artist}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Spalte 2: Lehrwerke */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px'
                }}>
                  <h3 style={{
                    fontSize: '1rem',
                    fontWeight: 800,
                    color: useNotebookLayout ? '#456355' : '#475569',
                    borderBottom: useNotebookLayout ? '2px solid #32483e' : '2px solid #e2e8f0',
                    paddingBottom: '8px',
                    margin: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <span>📖</span> Lehrwerke
                  </h3>

                  {masteredBooksList.length === 0 ? (
                    <div style={{
                      padding: '30px 16px',
                      textAlign: 'center',
                      border: useNotebookLayout ? '1px dashed #32483e' : '1px dashed #cbd5e1',
                      borderRadius: '16px',
                      color: useNotebookLayout ? '#8fa399' : '#64748b',
                      fontSize: '0.82rem',
                      background: useNotebookLayout ? 'rgba(0,0,0,0.1)' : '#f8fafc'
                    }}>
                      Noch keine Meisterwerk-Lehrwerke vorhanden.
                    </div>
                  ) : (
                    masteredBooksList.map((item, idx) => (
                      <div key={`m-lw-${idx}`} style={{
                        background: 'white',
                        border: '1px solid #e2e8f0',
                        borderRadius: '20px',
                        padding: '16px 20px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                      }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {(() => {
                              const bookColor = getLehrwerkColor(item.title);
                              return (
                                <div style={{
                                  width: '14px',
                                  height: '18px',
                                  background: `linear-gradient(135deg, ${bookColor.from}, ${bookColor.to})`,
                                  borderRadius: '3px',
                                  border: `1px solid ${bookColor.text}`,
                                  flexShrink: 0
                                }} />
                              );
                            })()}
                            <span>{item.title}</span>
                          </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                          {item.pages.map((p: number) => (
                            <div key={p} style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              background: '#f1f5f9',
                              color: '#334155',
                              padding: '4px 10px',
                              borderRadius: '8px',
                              fontSize: '0.74rem',
                              fontWeight: 800,
                              border: '1px solid #e2e8f0'
                            }}>
                              S. {p}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      )}
      
      {/* Apple-style Backdrop Blur Overlay for All Pages Grid */}
      {showAllPagesGrid && activeLehrwerkId && (() => {
        const assigned = assignedLehrwerke.find(a => a.lehrwerkId === activeLehrwerkId);
        if (!assigned) return null;
        const book = globalLehrwerke.find(g => g.id === activeLehrwerkId) || { title: 'Lehrwerk', emoji: '📚', totalPages: 50 };
        const pages = Array.from({ length: book.totalPages || 50 }, (_, i) => i + 1);

        return (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            animation: 'fadeIn 0.25s ease'
          }}>
            <div style={{
              background: 'white',
              borderRadius: '32px',
              width: '100%',
              maxWidth: '640px',
              maxHeight: '90%',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 24px 60px rgba(0,0,0,0.2)',
              overflow: 'hidden',
              animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
            }}>
              {/* Header */}
              <div style={{
                padding: '20px 24px',
                borderBottom: '1px solid #e8e8ed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {(() => {
                    const bookColor = getLehrwerkColor(book.title);
                    return (
                      <div style={{
                        width: '18px',
                        height: '24px',
                        background: `linear-gradient(135deg, ${bookColor.from}, ${bookColor.to})`,
                        borderRadius: '3px',
                        border: 'none',
                        position: 'relative',
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <BookOpen size={9} color={bookColor.text} />
                        <div style={{
                          position: 'absolute',
                          left: 0,
                          top: 0,
                          bottom: 0,
                          width: '2px',
                          background: 'rgba(0,0,0,0.08)',
                          borderRight: '1px solid rgba(255,255,255,0.1)'
                        }} />
                      </div>
                    );
                  })()}
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#000' }}>
                    {book.title} — Alle Seiten
                  </h3>
                </div>
                <button
                  onClick={() => setShowAllPagesGrid(false)}
                  style={{
                    background: '#f3f3f6',
                    border: 'none',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#000'
                  }}
                >
                  <X size={16} />
                </button>
              </div>

              {/* Grid Content */}
              <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '10px', justifyItems: 'center' }}>
                  {pages.map(num => {
                    const pageState = assigned.pageStates[num] || { status: 'locked' };
                    const globalPage = book.globalPageStates?.[num] === 'purple';
                    const status = globalPage ? 'purple' : (pageState.status || 'locked');

                    let borderColor = '#ef4444';
                    let bg = '#fef2f2';
                    let textColor = '#991b1b';

                    if (status === 'homework') {
                      borderColor = '#eab308';
                      bg = '#fffbeb';
                      textColor = '#92400e';
                    } else if (status === 'mastered') {
                      borderColor = '#10b981';
                      bg = '#f0fdf4';
                      textColor = '#166534';
                    } else if (status === 'purple') {
                      borderColor = '#af52de';
                      bg = '#f5f3ff';
                      textColor = '#6d28d9';
                    }

                    let solidActiveBg = '#ef4444';
                    if (status === 'homework') {
                      solidActiveBg = '#eab308';
                    } else if (status === 'mastered') {
                      solidActiveBg = '#10b981';
                    } else if (status === 'purple') {
                      solidActiveBg = '#af52de';
                    }

                    const isPageActive = activePageNumber === num;

                    return (
                      <button
                        key={num}
                        onClick={() => {
                          if (activeBrush === 'NONE') {
                            selectTextbookPage(assigned.lehrwerkId, num);
                            setShowAllPagesGrid(false);
                          } else {
                            let targetStatus: 'IN_PROGRESS' | 'THEORY_DONE' | 'MASTERED' = 'IN_PROGRESS';
                            let targetHomework = false;

                            if (activeBrush === 'LOCKED') {
                              targetStatus = 'IN_PROGRESS';
                              targetHomework = false;
                            } else if (activeBrush === 'HOMEWORK') {
                              targetStatus = 'IN_PROGRESS';
                              targetHomework = true;
                            } else if (activeBrush === 'MASTERED') {
                              targetStatus = 'MASTERED';
                              targetHomework = false;
                            } else if (activeBrush === 'THEORY') {
                              targetStatus = 'THEORY_DONE';
                              targetHomework = false;
                            }

                            triggerDirectSave(assigned.lehrwerkId, num, targetStatus, targetHomework);
                          }
                        }}
                        style={{
                          width: '46px',
                          height: '46px',
                          borderRadius: '50%',
                          border: `2px solid ${isPageActive ? solidActiveBg : borderColor}`,
                          background: isPageActive ? solidActiveBg : bg,
                          color: isPageActive ? 'white' : textColor,
                          fontWeight: 900,
                          fontSize: '0.95rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.15s',
                          boxShadow: isPageActive ? '0 4px 10px rgba(0,0,0,0.15)' : 'none',
                          transform: isPageActive ? 'scale(1.1)' : 'none'
                        }}
                      >
                        {num}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );
      })()}
      </div>
      </div>
    </div>
  );
};

