import React, { useState, useEffect, useMemo } from 'react';
import { X, Check, Award, Flame, AlertCircle, BookOpen, Music, History, Plus, ChevronRight } from 'lucide-react';
import Confetti from 'react-confetti';
import { supabase } from '../lib/supabase';

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  photo_url?: string;
}

interface MeisterwerkDocumentationModalProps {
  student: Student;
  onClose: () => void;
  teacherId?: string;
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
  if (!instrument) return '/avatars/guitar_avatar.png';
  const inst = instrument.toLowerCase();
  if (inst.includes('guitar') || inst.includes('gitarre')) return '/avatars/guitar_avatar.png';
  if (inst.includes('bass')) return '/avatars/bass_avatar.png';
  if (inst.includes('drum') || inst.includes('schlagzeug')) return '/avatars/drums_avatar.png';
  if (inst.includes('piano') || inst.includes('keys') || inst.includes('klavier') || inst.includes('keyboard')) return '/avatars/piano_avatar.png';
  if (inst.includes('vocal') || inst.includes('gesang') || inst.includes('stimme') || inst.includes('singer')) return '/avatars/vocals_avatar.png';
  if (inst.includes('trompete') || inst.includes('trumpet')) return '/avatars/trumpet_avatar.png';
  if (inst.includes('posaune') || inst.includes('trombone')) return '/avatars/trombone_avatar.png';
  if (inst.includes('horn')) return '/avatars/horn_avatar.png';
  if (inst.includes('cello')) return '/avatars/cello_avatar.png';
  if (inst.includes('geige') || inst.includes('violin') || inst.includes('violine')) return '/avatars/violin_avatar.png';
  if (inst.includes('klarinette') || inst.includes('clarinet')) return '/avatars/clarinet_avatar.png';
  if (inst.includes('querflöte') || inst.includes('flute')) return '/avatars/flute_avatar.png';
  if (inst.includes('saxofon') || inst.includes('saxophone') || inst.includes('sax')) return '/avatars/saxophone_avatar.png';
  return '/avatars/guitar_avatar.png';
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

export const MeisterwerkDocumentationModal: React.FC<MeisterwerkDocumentationModalProps> = ({ student, onClose, teacherId }) => {
  const [studentInstrument, setStudentInstrument] = useState<string | null>(null);
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
  const [pageGroupIndex, setPageGroupIndex] = useState(0);
  const [showAssignDropdown, setShowAssignDropdown] = useState(false);

  // Active Songs
  const [activeSongSkills, setActiveSongSkills] = useState<any[]>([]);
  const [selectedActiveSongId, setSelectedActiveSongId] = useState<string>('');

  // Active paintbrush mode
  const [activeBrush, setActiveBrush] = useState<'NONE' | 'LOCKED' | 'HOMEWORK' | 'MASTERED' | 'THEORY'>('NONE');

  // Session log to capture all modifications made in current modal open state
  const [sessionLogs, setSessionLogs] = useState<string[]>([]);
  const [lessonDay, setLessonDay] = useState<number>(1); // Default to Monday = 1
  const [activeModalTab, setActiveModalTab] = useState<'document' | 'logbook'>('document');

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
          const { data: songsData, error: songsError } = await supabase
            .from('songs')
            .select('*')
            .eq('school_id', studentUser.school_id)
            .order('title', { ascending: true });

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

  // Load Lehrwerke data from localStorage
  const loadLehrwerke = () => {
    try {
      const storedGlobal = localStorage.getItem('campus_lehrwerke');
      const storedAssigned = localStorage.getItem('student_lehrwerke_progress');
      
      const defaults = [
        { id: '1', title: 'GrooveLab Guitar Vol. 1', instrument: 'Guitar', type: 'Standardwerk für E-Gitarre', progress: 60, emoji: '🎸', color: '#34a853', totalPages: 50 },
        { id: '2', title: 'GrooveLab Drums Vol. 1', instrument: 'Drums', type: 'Standardwerk für Schlagzeug', progress: 45, emoji: '🥁', color: '#4f46e5', totalPages: 50 },
        { id: '3', title: 'GrooveLab Bass Vol. 1', instrument: 'Bass', type: 'Standardwerk für E-Bass', progress: 30, emoji: '🎸', color: '#f59e0b', totalPages: 50 },
        { id: '4', title: 'GrooveLab Keys Vol. 1', instrument: 'Keys', type: 'Standardwerk für Keyboard', progress: 80, emoji: '🎹', color: '#ec4899', totalPages: 50 },
        { id: '5', title: 'GrooveLab Vocals Vol. 1', instrument: 'Vocals', type: 'Standardwerk für Gesang', progress: 50, emoji: '🎤', color: '#3b82f6', totalPages: 50 }
      ];
      
      setGlobalLehrwerke(storedGlobal ? JSON.parse(storedGlobal) : defaults);

      if (storedAssigned) {
        const parsedAssigned = JSON.parse(storedAssigned);
        const filtered = parsedAssigned.filter((item: any) => item.studentId === student.id);
        setAssignedLehrwerke(filtered);
        
        // Auto-select first assigned textbook if none selected
        if (filtered.length > 0 && !activeLehrwerkId) {
          setActiveLehrwerkId(filtered[0].lehrwerkId);
        }
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
            .select('instrument')
            .eq('id', student.id)
            .single();
          if (!error && data?.instrument) {
            setStudentInstrument(data.instrument);
          }
        } catch (e) {
          console.error('Error loading student profile in modal:', e);
        }
      };
      fetchProfile();
    }
  }, [student.id]);

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
      const { error } = await supabase
        .from('progress_matrix')
        .update({ is_current_homework: false })
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
      const currentWeekItems = progressItems.filter(item => 
        item.updated_at && getISOWeek(item.updated_at) === currentWeek
      );

      const combinedHomeworkNotes = JSON.stringify(updatedList);

      if (currentWeekItems.length > 0) {
        const itemIds = currentWeekItems.map(item => item.id).filter(Boolean);
        if (itemIds.length > 0) {
          const { error } = await supabase
            .from('progress_matrix')
            .update({ homework_notes: combinedHomeworkNotes })
            .in('id', itemIds);
          if (error) throw error;
        }
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

  const triggerDirectSave = async (lehrwerkId: string, pageNum: number, targetStatus: 'IN_PROGRESS' | 'THEORY_DONE' | 'MASTERED', targetHomework: boolean) => {
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
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
        let skillPercent = 25;
        if (status === 'MASTERED') {
          skillPercent = 100;
        } else if (status === 'THEORY_DONE') {
          skillPercent = 60;
        }
        
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
        setActiveItem(null);
        onClose(); // Automatically close window on save success
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
      setActiveItem(null);
      onClose(); // Automatically close window on save success
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
          is_campus_active: true
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
    const { data: refreshedSongs } = await supabase
      .from('songs')
      .select('*')
      .eq('school_id', schoolId)
      .order('title', { ascending: true });
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



  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 4000,
      background: 'rgba(9, 9, 11, 0.65)',
      backdropFilter: 'blur(20px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      fontFamily: '"Inter", sans-serif'
    }}>


      <div style={{
        background: '#f3f3f6', // Zurich neutral gray background canvas
        borderRadius: '32px',
        width: '100%',
        maxWidth: '1360px',
        height: '92vh',
        boxShadow: '0 30px 60px -15px rgba(0, 0, 0, 0.25)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        border: '1px solid rgba(0, 0, 0, 0.05)'
      }} className="animation-slide-up">
        {/* Header - Premium Zurich Card Style Header */}
        <div style={{
          padding: '20px 32px',
          background: 'white',
          borderBottom: '1px solid #e8e8ed',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '52px',
              height: '52px',
              borderRadius: '16px',
              overflow: 'hidden',
              boxShadow: '0 4px 15px rgba(0,0,0,0.06)',
              border: '2px solid white'
            }}>
              <img
                src={getInstrumentAvatarUrl(studentInstrument)}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                alt=""
              />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="swiss-label" style={{ fontSize: '0.62rem', background: '#f3f3f6', color: '#4b5563', padding: '3px 8px', borderRadius: '8px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Tageskompass
                </span>
                <h2 className="swiss-h2" style={{ margin: 0, fontSize: '1.25rem', color: '#000', fontWeight: 900, letterSpacing: '-0.02em' }}>
                  Meisterwerk-Protokoll
                </h2>
              </div>
              <p style={{ fontSize: '0.8rem', color: '#4b5563', margin: '4px 0 0 0', fontWeight: 600 }}>
                Aktive Begleitung für: <strong style={{ color: '#000', fontWeight: 800 }}>{student.first_name} {student.last_name}</strong>
              </p>
            </div>
          </div>

          {/* Swiss Modernist Segmented Tab Control */}
          <div style={{
            display: 'inline-flex',
            background: '#f3f3f6',
            padding: '4px',
            borderRadius: '24px',
            border: '1px solid #e2e8f0'
          }}>
            <button
              type="button"
              onClick={() => setActiveModalTab('document')}
              style={{
                background: activeModalTab === 'document' ? 'white' : 'transparent',
                border: 'none',
                color: activeModalTab === 'document' ? '#000' : '#4b5563',
                padding: '8px 16px',
                borderRadius: '20px',
                fontSize: '0.78rem',
                fontWeight: activeModalTab === 'document' ? 800 : 600,
                cursor: 'pointer',
                boxShadow: activeModalTab === 'document' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>📝</span>
              <span>Unterricht dokumentieren</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveModalTab('logbook')}
              style={{
                background: activeModalTab === 'logbook' ? 'white' : 'transparent',
                border: 'none',
                color: activeModalTab === 'logbook' ? '#000' : '#4b5563',
                padding: '8px 16px',
                borderRadius: '20px',
                fontSize: '0.78rem',
                fontWeight: activeModalTab === 'logbook' ? 800 : 600,
                cursor: 'pointer',
                boxShadow: activeModalTab === 'logbook' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>🏆</span>
              <span>Meisterwerk-Logbuch</span>
            </button>
          </div>

          <button
            onClick={onClose}
            style={{
              background: '#f3f3f6',
              border: 'none',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#000',
              transition: 'all 0.2s'
            }}
            className="hover-scale"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Content - Side-by-side Columns or Logbook */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }} className="flex-col lg:flex-row">
          {activeModalTab === 'document' ? (
            <>
          
          {/* COLUMN 1: 📚 LEHRWERKE (35%) */}
          <div style={{
            flex: '1.2 1 0%',
            borderRight: '1px solid #e8e8ed',
            padding: '24px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            background: 'white'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 900, color: '#000', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Lehrwerke & Übungen
                </span>
              </div>
              
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setShowAssignDropdown(!showAssignDropdown)}
                  style={{
                    background: '#000',
                    color: 'white',
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: '20px',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
                  }}
                  className="hover-scale"
                >
                  <Plus size={12} /> Zuweisen
                </button>
                
                {showAssignDropdown && (
                  <div style={{
                    position: 'absolute',
                    right: 0,
                    top: '32px',
                    background: 'white',
                    border: '1px solid #e8e8ed',
                    borderRadius: '16px',
                    boxShadow: '0 12px 30px rgba(0,0,0,0.12)',
                    zIndex: 10,
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
                          <span>{g.emoji}</span>
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

            {/* Brush Palette & Legend Combined Card */}
            <div style={{
              background: '#f3f3f6',
              padding: '12px 14px',
              borderRadius: '24px',
              border: '1px solid rgba(0, 0, 0, 0.05)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              marginBottom: '6px',
              boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ 
                  fontSize: '0.72rem', 
                  fontWeight: 900, 
                  color: '#000', 
                  textTransform: 'uppercase', 
                  letterSpacing: '0.08em',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <span style={{ fontSize: '0.9rem' }}>🖌️</span> Pinsel-Modus
                </span>
                <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#7d7d82', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  iPad Schnell-Einfärbung
                </span>
              </div>

              <div style={{ 
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr 1fr',
                gap: '6px',
                background: 'rgba(255, 255, 255, 0.5)',
                padding: '6px',
                borderRadius: '18px',
                border: '1px solid rgba(0, 0, 0, 0.03)'
              }}>
                {/* ROT */}
                <button
                  type="button"
                  onClick={() => setActiveBrush(activeBrush === 'LOCKED' ? 'NONE' : 'LOCKED')}
                  style={{
                    padding: '14px 4px',
                    borderRadius: '14px',
                    border: 'none',
                    background: activeBrush === 'LOCKED' ? '#ef4444' : 'transparent',
                    color: activeBrush === 'LOCKED' ? 'white' : '#ef4444',
                    fontSize: '0.7rem',
                    fontWeight: 900,
                    cursor: 'pointer',
                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                    boxShadow: activeBrush === 'LOCKED' ? '0 2px 6px rgba(239,68,68,0.2)' : 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px'
                  }}
                  className="hover-scale-mini"
                >
                  <span style={{ fontSize: '0.75rem' }}>🔴</span>
                  <span style={{ fontSize: '0.62rem', color: activeBrush === 'LOCKED' ? 'white' : '#991b1b' }}>Ungestartet</span>
                </button>

                {/* GELB */}
                <button
                  type="button"
                  onClick={() => setActiveBrush(activeBrush === 'HOMEWORK' ? 'NONE' : 'HOMEWORK')}
                  style={{
                    padding: '14px 4px',
                    borderRadius: '14px',
                    border: 'none',
                    background: activeBrush === 'HOMEWORK' ? '#eab308' : 'transparent',
                    color: activeBrush === 'HOMEWORK' ? 'white' : '#d97706',
                    fontSize: '0.7rem',
                    fontWeight: 900,
                    cursor: 'pointer',
                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                    boxShadow: activeBrush === 'HOMEWORK' ? '0 2px 6px rgba(234,179,8,0.25)' : 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px'
                  }}
                  className="hover-scale-mini"
                >
                  <span style={{ fontSize: '0.75rem' }}>🟡</span>
                  <span style={{ fontSize: '0.62rem', color: activeBrush === 'HOMEWORK' ? 'white' : '#92400e' }}>Hausaufgabe</span>
                </button>

                {/* GRÜN */}
                <button
                  type="button"
                  onClick={() => setActiveBrush(activeBrush === 'MASTERED' ? 'NONE' : 'MASTERED')}
                  style={{
                    padding: '14px 4px',
                    borderRadius: '14px',
                    border: 'none',
                    background: activeBrush === 'MASTERED' ? '#10b981' : 'transparent',
                    color: activeBrush === 'MASTERED' ? 'white' : '#059669',
                    fontSize: '0.7rem',
                    fontWeight: 900,
                    cursor: 'pointer',
                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                    boxShadow: activeBrush === 'MASTERED' ? '0 2px 6px rgba(16,185,129,0.25)' : 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px'
                  }}
                  className="hover-scale-mini"
                >
                  <span style={{ fontSize: '0.75rem' }}>🟢</span>
                  <span style={{ fontSize: '0.62rem', color: activeBrush === 'MASTERED' ? 'white' : '#166534' }}>Gemeistert</span>
                </button>

                {/* LILA */}
                <button
                  type="button"
                  onClick={() => setActiveBrush(activeBrush === 'THEORY' ? 'NONE' : 'THEORY')}
                  style={{
                    padding: '14px 4px',
                    borderRadius: '14px',
                    border: 'none',
                    background: activeBrush === 'THEORY' ? '#af52de' : 'transparent',
                    color: activeBrush === 'THEORY' ? 'white' : '#af52de',
                    fontSize: '0.7rem',
                    fontWeight: 900,
                    cursor: 'pointer',
                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                    boxShadow: activeBrush === 'THEORY' ? '0 2px 6px rgba(175,82,222,0.25)' : 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px'
                  }}
                  className="hover-scale-mini"
                >
                  <span style={{ fontSize: '0.75rem' }}>🟣</span>
                  <span style={{ fontSize: '0.62rem', color: activeBrush === 'THEORY' ? 'white' : '#6d28d9' }}>Theorie/Info</span>
                </button>
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
                    color: '#000',
                    totalPages: 50
                  };
                  const isSelected = activeLehrwerkId === assigned.lehrwerkId;
                  const pages = Array.from({ length: book.totalPages || 50 }, (_, i) => i + 1);

                  return (
                    <div key={assigned.lehrwerkId} style={{
                      border: '1px solid #e8e8ed',
                      borderRadius: '24px',
                      background: '#f8f8fa',
                      overflow: 'hidden',
                      transition: 'all 0.25s'
                    }} className={isSelected ? 'pulse-glow-emerald-subtle' : ''}>
                      {/* Textbook Title Bar */}
                      <div 
                        onClick={() => {
                          setActiveLehrwerkId(isSelected ? null : assigned.lehrwerkId);
                          setActivePageNumber(null);
                        }}
                        style={{
                          padding: '14px 18px',
                          background: isSelected ? 'white' : '#f8f8fa',
                          borderBottom: '1px solid #e8e8ed',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          cursor: 'pointer'
                        }}
                      >
                        <div style={{
                          width: '32px', height: '32px',
                          background: isSelected ? '#000' : '#e8e8ed',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: isSelected ? 'white' : '#000',
                          fontSize: '15px'
                        }}>
                          {book.emoji}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 900, color: '#000', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {book.title}
                          </h4>
                          {(() => {
                            const total = book.totalPages || 50;
                            const worked = Object.values(assigned.pageStates || {}).filter((p: any) => p.status === 'mastered').length;
                            const pct = Math.min(100, Math.round((worked / total) * 100));
                            return (
                              <>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                                  <p style={{ margin: 0, fontSize: '0.7rem', color: '#7d7d82', fontWeight: 700, whiteSpace: 'nowrap' }}>
                                    {total} Seiten • {worked} gemeistert
                                  </p>
                                  <span style={{ fontSize: '0.7rem', fontWeight: 900, color: pct > 0 ? '#10b981' : '#7d7d82' }}>
                                    ({pct}%)
                                  </span>
                                </div>
                                <div style={{
                                  width: '100%',
                                  height: '6px',
                                  background: '#e8e8ed',
                                  borderRadius: '3px',
                                  marginTop: '6px',
                                  overflow: 'hidden'
                                }}>
                                  <div style={{
                                    width: `${pct}%`,
                                    height: '100%',
                                    background: 'linear-gradient(90deg, #10b981, #059669)',
                                    borderRadius: '3px',
                                    transition: 'width 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
                                  }} />
                                </div>
                              </>
                            );
                          })()}
                        </div>
                        <ChevronRight size={16} style={{ color: '#7d7d82', transform: isSelected ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
                      </div>

                      {/* Pages Grid - Always expanded for active Lehrwerk */}
                      {isSelected && (
                        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', background: 'white' }}>
                           {activePageNumber !== null && (
                            <div style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '8px',
                              background: '#f8fafc',
                              padding: '12px 16px',
                              borderRadius: '20px',
                              border: '1px solid #e8e8ed'
                            }}>
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                borderBottom: '1px solid #e8e8ed',
                                paddingBottom: '8px',
                                marginBottom: '4px'
                              }}>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (activePageNumber > 1) {
                                      selectTextbookPage(assigned.lehrwerkId, activePageNumber - 1);
                                    }
                                  }}
                                  disabled={activePageNumber <= 1}
                                  style={{
                                    background: '#000',
                                    color: 'white',
                                    border: 'none',
                                    padding: '6px 14px',
                                    borderRadius: '12px',
                                    fontSize: '0.78rem',
                                    fontWeight: 800,
                                    cursor: activePageNumber <= 1 ? 'not-allowed' : 'pointer',
                                    opacity: activePageNumber <= 1 ? 0.3 : 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                  }}
                                  className="hover-scale"
                                >
                                  ◀ Zurück
                                </button>
                                
                                <span style={{ fontSize: '0.88rem', fontWeight: 900, color: '#000' }}>
                                  Seite {activePageNumber} / {book.totalPages}
                                </span>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (activePageNumber < (book.totalPages || 50)) {
                                      selectTextbookPage(assigned.lehrwerkId, activePageNumber + 1);
                                    }
                                  }}
                                  disabled={activePageNumber >= (book.totalPages || 50)}
                                  style={{
                                    background: '#000',
                                    color: 'white',
                                    border: 'none',
                                    padding: '6px 14px',
                                    borderRadius: '12px',
                                    fontSize: '0.78rem',
                                    fontWeight: 800,
                                    cursor: activePageNumber >= (book.totalPages || 50) ? 'not-allowed' : 'pointer',
                                    opacity: activePageNumber >= (book.totalPages || 50) ? 0.3 : 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                  }}
                                  className="hover-scale"
                                >
                                  Vor ▶
                                </button>
                              </div>

                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between'
                              }}>
                                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#7d7d82' }}>
                                  Schnell einfärben:
                                </span>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                  {/* Red */}
                                  <button 
                                    type="button" 
                                    onClick={(e) => { e.stopPropagation(); triggerDirectSave(assigned.lehrwerkId, activePageNumber, 'IN_PROGRESS', false); }}
                                    style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#ef4444', border: 'none', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
                                    title="Ungestartet (Rot)"
                                  />
                                  {/* Yellow */}
                                  <button 
                                    type="button" 
                                    onClick={(e) => { e.stopPropagation(); triggerDirectSave(assigned.lehrwerkId, activePageNumber, 'IN_PROGRESS', true); }}
                                    style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#eab308', border: 'none', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
                                    title="Hausaufgabe (Gelb)"
                                  />
                                  {/* Green */}
                                  <button 
                                    type="button" 
                                    onClick={(e) => { e.stopPropagation(); triggerDirectSave(assigned.lehrwerkId, activePageNumber, 'MASTERED', false); }}
                                    style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#10b981', border: 'none', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
                                    title="Meisterwerk (Grün)"
                                  />
                                  {/* Purple */}
                                  <button 
                                    type="button" 
                                    onClick={(e) => { e.stopPropagation(); triggerDirectSave(assigned.lehrwerkId, activePageNumber, 'THEORY_DONE', false); }}
                                    style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#af52de', border: 'none', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
                                    title="Theorie (Lila)"
                                  />
                                </div>
                              </div>
                            </div>
                          )}

                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {pages.slice(pageGroupIndex * 49, (pageGroupIndex + 1) * 49).map(num => {
                            const pageState = assigned.pageStates[num] || { status: 'locked' };
                            const globalPage = book.globalPageStates?.[num] === 'purple';
                            const status = globalPage ? 'purple' : (pageState.status || 'locked');

                            let borderColor = '#ef4444'; // locked / unstarted = rot
                            let bg = '#fef2f2';
                            let textColor = '#991b1b';

                            if (status === 'homework') {
                              borderColor = '#eab308'; // homework = gold/gelb
                              bg = '#fffbeb';
                              textColor = '#92400e';
                            } else if (status === 'mastered') {
                              borderColor = '#10b981'; // mastered = grün
                              bg = '#f0fdf4';
                              textColor = '#166534';
                            } else if (status === 'purple') {
                              borderColor = '#af52de'; // purple = lila
                              bg = '#f5f3ff';
                              textColor = '#6d28d9';
                            }

                            let solidActiveBg = '#ef4444'; // locked/unstarted active
                            let activeBorder = '#ef4444';
                            if (status === 'homework') {
                              solidActiveBg = '#eab308';
                              activeBorder = '#eab308';
                            } else if (status === 'mastered') {
                              solidActiveBg = '#10b981';
                              activeBorder = '#10b981';
                            } else if (status === 'purple') {
                              solidActiveBg = '#af52de';
                              activeBorder = '#af52de';
                            }

                            const isPageActive = activePageNumber === num && activeLehrwerkId === assigned.lehrwerkId;

                            return (
                              <button
                                key={num}
                                onClick={() => {
                                  if (activeBrush === 'NONE') {
                                    selectTextbookPage(assigned.lehrwerkId, num);
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
                                className="hover-scale-mini"
                              >
                                {num}
                              </button>
                            );
                          })}
                          </div>

                          {pages.length > 49 && (
                            <div style={{
                              display: 'flex',
                              justifyContent: 'center',
                              alignItems: 'center',
                              gap: '6px',
                              marginTop: '10px',
                              background: '#f3f3f6',
                              padding: '4px',
                              borderRadius: '16px',
                              alignSelf: 'center',
                              boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)'
                            }}>
                              {Array.from({ length: Math.ceil(pages.length / 49) }).map((_, idx) => {
                                const startNum = idx * 49 + 1;
                                const endNum = Math.min((idx + 1) * 49, pages.length);
                                const isCurrent = pageGroupIndex === idx;
                                return (
                                  <button
                                    key={idx}
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); setPageGroupIndex(idx); }}
                                    style={{
                                      border: 'none',
                                      background: isCurrent ? 'white' : 'transparent',
                                      color: isCurrent ? '#000' : '#7d7d82',
                                      padding: '6px 14px',
                                      borderRadius: '12px',
                                      fontSize: '0.74rem',
                                      fontWeight: 800,
                                      cursor: 'pointer',
                                      boxShadow: isCurrent ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                                      transition: 'all 0.2s'
                                    }}
                                    className="hover-scale-mini"
                                  >
                                    {startNum}–{endNum}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* COLUMN 2: 🎵 SONGS & SONG KATALOG (33%) */}
          <div style={{
            flex: '1.1 1 0%',
            borderRight: '1px solid #e8e8ed',
            padding: '24px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            background: 'white'
          }}>
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
                  const isSelected = selectedActiveSongId === skill.id && activeInputTab === 'active_song';
                  const progress = skill.is_stage_ready ? 100 : (skill.progress_percent || 0);

                  return (
                    <div
                      key={skill.id}
                      onClick={() => selectActiveSong(skill)}
                      style={{
                        padding: '14px 18px',
                        background: isSelected ? '#f8f8fa' : 'white',
                        borderRadius: '20px',
                        border: `2.5px solid ${isSelected ? '#000' : '#e8e8ed'}`,
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        transition: 'all 0.2s'
                      }}
                      className="hover-scale"
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 900, color: '#000' }}>
                            {skill.songs?.title}
                          </h4>
                          <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#7d7d82', fontWeight: 700 }}>
                            {skill.songs?.artist} • <span style={{ color: '#000', fontWeight: 800 }}>{skill.instrument}</span>
                          </p>
                        </div>
                        
                        <span style={{
                          background: skill.is_stage_ready ? '#d1fae5' : '#f3f3f6',
                          color: skill.is_stage_ready ? '#065f46' : '#000',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '0.65rem',
                          fontWeight: 900,
                          textTransform: 'uppercase'
                        }}>
                          {skill.is_stage_ready ? 'Bühnenreif' : `${progress}%`}
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div style={{ width: '100%', height: '6px', background: '#f3f3f6', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{
                          width: `${progress}%`,
                          height: '100%',
                          background: skill.is_stage_ready ? '#10b981' : '#000',
                          transition: 'width 0.3s ease'
                        }} />
                      </div>

                      {/* Quick Color Picker inside active song card */}
                      {isSelected && (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          background: '#f8fafc',
                          padding: '8px 12px',
                          borderRadius: '12px',
                          border: '1px solid #e8e8ed',
                          width: '100%',
                          justifyContent: 'space-between',
                          marginTop: '4px'
                        }} onClick={(e) => e.stopPropagation()}>
                          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#000' }}>Schnell-Einfärbung:</span>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            {/* Red */}
                            <button 
                              type="button" 
                              onClick={() => triggerDirectSongSave(skill.id, 'IN_PROGRESS', false)}
                              style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#ef4444', border: 'none', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
                              title="Zurücksetzen (Rot)"
                            />
                            {/* Yellow */}
                            <button 
                              type="button" 
                              onClick={() => triggerDirectSongSave(skill.id, 'IN_PROGRESS', true)}
                              style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#eab308', border: 'none', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
                              title="Hausaufgabe (Gelb)"
                            />
                            {/* Green */}
                            <button 
                              type="button" 
                              onClick={() => triggerDirectSongSave(skill.id, 'MASTERED', false)}
                              style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#10b981', border: 'none', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
                              title="Meisterwerk (Grün)"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* INTEGRATED SONG CATALOG SEARCH & DIRECT ADD */}
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
                onFocus={(e) => e.currentTarget.style.borderColor = '#000'}
                onBlur={(e) => e.currentTarget.style.borderColor = '#e8e8ed'}
              />

              {songSearch.trim().length > 0 && (
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
          </div>

          {/* COLUMN 3: ✍️ DOKUMENTATION & HAUSAUFGABE (32%) */}
          <div style={{
            flex: '1.1 1 0%',
            padding: '24px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            background: '#f8fafc',
            borderLeft: '1px solid #e4e4e7'
          }}>
            <div>
              <span style={{ fontSize: '0.84rem', fontWeight: 900, color: '#09090b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                ✍️ Eintrag & Hausaufgabe
              </span>
              <p style={{ margin: '3px 0 0 0', fontSize: '0.76rem', color: '#71717a', fontWeight: 550, lineHeight: '1.3' }}>
                Dokumentiere den heutigen Unterricht für den Schüler.
              </p>
            </div>

            {/* The Main Input Form Card */}
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
                  background: '#ffffff',
                  border: '1px solid rgba(0, 0, 0, 0.08)',
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
                        info.pages.sort((a, b) => a - b);
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
                                fontFamily: '"Helvetica Neue", Helvetica, Inter, Arial, sans-serif'
                              }}>
                                📖 <span>{item.title}</span> <span style={{ color: '#4b5563', fontWeight: 700, marginLeft: '4px', letterSpacing: '-0.02em' }}>· {formatPageNumbers(item.pages)}</span>
                              </div>
                              {/* Horizontal premium badge chips */}
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', paddingLeft: '2px' }}>
                                {item.pages.map(p => {
                                  const original = allActive.find(x => x.topic_name === `${item.title} - Seite ${p}`);
                                  return (
                                    <div key={`p-${p}`} style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '5px',
                                      background: '#ffffff',
                                      color: '#475569',
                                      padding: '4px 8px 4px 10px',
                                      borderRadius: '6px',
                                      fontSize: '0.76rem',
                                      fontWeight: 900,
                                      border: '1px solid #e2e8f0',
                                      fontFamily: '"Helvetica Neue", Helvetica, Inter, Arial, sans-serif',
                                      letterSpacing: '-0.02em',
                                      boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                                    }}>
                                      <span>📄 S. {p}</span>
                                      {original?.id && (
                                        <button
                                          type="button"
                                          onClick={() => handleRemoveHomeworkItem(original.id!, item.title, p)}
                                          style={{
                                            border: 'none',
                                            background: 'none',
                                            color: '#ef4444',
                                            cursor: 'pointer',
                                            fontSize: '0.68rem',
                                            padding: '0 2px 0 4px',
                                            fontWeight: 800,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            transition: 'color 0.15s ease'
                                          }}
                                          className="hover-scale-mini"
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
                          
                          {otherHWs.map((item, idx) => (
                            <div key={`oth-${idx}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.74rem', color: '#1f2937', fontWeight: 700 }}>
                              <span>{item.status === 'THEORY_DONE' ? '🧠' : '🎵'} {item.topic_name}</span>
                              {item.id && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveHomeworkItem(item.id)}
                                  style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.72rem', padding: '0 4px', fontWeight: 800 }}
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                          ))}
                          
                          {/* List of separate homework notes with delete buttons */}
                          {hasNotes && (
                            <div style={{ 
                              display: 'flex', 
                              flexDirection: 'column', 
                              gap: '6px',
                              borderTop: '1px solid #f4f4f5',
                              paddingTop: '8px',
                              marginTop: '2px'
                            }}>
                              {homeworkNotesList.map((note, nIdx) => (
                                <div key={`note-${nIdx}`} style={{ 
                                  display: 'flex', 
                                  justifyContent: 'space-between', 
                                  alignItems: 'flex-start',
                                  fontSize: '0.72rem', 
                                  color: '#475569', 
                                  fontWeight: 500, 
                                  fontStyle: 'italic',
                                  lineHeight: '1.35',
                                  gap: '8px'
                                }}>
                                  <span style={{ whiteSpace: 'pre-line' }}>{note}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteNote(nIdx)}
                                    style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.72rem', padding: '0 4px', fontWeight: 800, marginTop: '1px' }}
                                  >
                                    ✕
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Neue Hausaufgabe (Schüler-Sicht) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    📝 Neue Hausaufgabe <span style={{ color: '#64748b', fontWeight: 500 }}>(für den Schüler sichtbar)</span>
                  </label>
                  <textarea
                    ref={homeworkTextareaRef}
                    placeholder="Schreibe dem Schüler auf, was er bis zum nächsten Mal üben soll..."
                    value={homeworkNotes}
                    onChange={(e) => setHomeworkNotes(e.target.value)}
                    style={{
                      width: '100%',
                      height: '110px',
                      padding: '14px 16px',
                      borderRadius: '14px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      outline: 'none',
                      resize: 'none',
                      fontFamily: 'inherit',
                      background: 'white',
                      transition: 'all 0.15s ease'
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#09090b';
                      e.currentTarget.style.boxShadow = '0 0 0 2px rgba(9, 9, 11, 0.04)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#cbd5e1';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  />

                  <button
                    type="button"
                    onClick={handleAddNote}
                    disabled={!homeworkNotes.trim()}
                    style={{
                      marginTop: '4px',
                      padding: '10px 14px',
                      borderRadius: '12px',
                      border: 'none',
                      background: homeworkNotes.trim() ? '#10b981' : '#e4e4e7',
                      color: homeworkNotes.trim() ? '#ffffff' : '#a1a1aa',
                      fontWeight: 800,
                      cursor: homeworkNotes.trim() ? 'pointer' : 'default',
                      fontSize: '0.78rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      transition: 'all 0.15s ease'
                    }}
                    className={homeworkNotes.trim() ? "hover-scale" : ""}
                  >
                    ➕ Notiz hinzufügen
                  </button>

                  {/* iPad Schnell-Textbausteine inside the form card as a clean drawer or chips */}
                  <div style={{ marginTop: '6px' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {[
                        { label: '🐌 Schnecken-Tempo', text: 'Spiele die schwierige Passage ganz langsam wie eine Schnecke. Erst wenn deine Finger den Weg im Schlaf kennen, schalten wir den Turbo an!' },
                        { label: '🔂 Ritter-Dreierspiel', text: 'Wiederhole den kniffligen Übergang dreimal hintereinander fehlerfrei. Schaffst du das, hast du die Stelle gemeistert!' },
                        { label: '🎵 Laut-Leise Zauber', text: 'Lass das Stück lebendig klingen! Mache deutliche Unterschiede zwischen Flüsterlautstärke (piano) und Löwenbrüllen (forte).' },
                        { label: '⏱️ 10-Min.-Champion', text: 'Stelle dir einen Timer auf 10 Minuten. Übe diese Woche jeden Tag kurz und fokussiert, anstatt einmal ganz lang am Wochenende.' },
                        { label: '🌟 Eigener Remix', text: 'Du beherrschst die Noten super! Überlege dir bis zum nächsten Mal eine eigene coole Rhythmus-Variante für diesen Teil.' },
                        { label: '🕵️‍♂️ Noten-Detektiv', text: 'Lies die Noten laut mit und achte genau auf die Tonlängen. Sei wie ein Detektiv, dem keine Note entwischt!' },
                        { label: '👁️ Blind-Flug', text: 'Schließe beim Spielen mal die Augen. Fühle die Tasten/Saiten und spiele die Stelle ganz blind auswendig!' },
                        { label: '🥁 Puls-Master', text: 'Klatsche zuerst den Rhythmus und zähle laut mit, bevor du dein Instrument spielst. Der Rhythmus ist das Herz der Musik!' },
                        { label: '🧩 Puzzle-Taktik', text: 'Übe nicht das ganze Stück auf einmal. Nimm dir einen einzelnen Takt vor und setze ihn als perfektes Puzzleteil zusammen!' }
                      ].map((tpl, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setHomeworkNotes(prev => prev ? `${prev}\n\n${tpl.text}` : tpl.text)}
                          style={{
                            background: '#ffffff',
                            color: '#4b5563',
                            border: '1px solid #e5e7eb',
                            padding: '6px 12px',
                            borderRadius: '9999px',
                            fontSize: '0.66rem',
                            fontWeight: 650,
                            cursor: 'pointer',
                            transition: 'all 0.12s ease-in-out',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.01)'
                          }}
                          className="hover-scale-mini"
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#f9fafb';
                            e.currentTarget.style.borderColor = '#cbd5e1';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#ffffff';
                            e.currentTarget.style.borderColor = '#e5e7eb';
                          }}
                        >
                          {tpl.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Interne Lehrer-Notizen */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid #f4f4f5', paddingTop: '14px' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#52525b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    🔒 Interne Notizen <span style={{ color: '#71717a', fontWeight: 550 }}>(nur für dich sichtbar)</span>
                  </label>
                  <textarea
                    placeholder="Verhaltensauffälligkeiten, Fortschritte oder Notizen..."
                    value={teacherNotes}
                    onChange={(e) => setTeacherNotes(e.target.value)}
                    style={{
                      width: '100%',
                      height: '65px',
                      padding: '12px 14px',
                      borderRadius: '12px',
                      border: '1px solid #e4e4e7',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      outline: 'none',
                      resize: 'none',
                      fontFamily: 'inherit',
                      background: '#f8fafc',
                      color: '#18181b',
                      transition: 'all 0.15s ease'
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#71717a';
                      e.currentTarget.style.background = '#ffffff';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#e4e4e7';
                      e.currentTarget.style.background = '#f8fafc';
                    }}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '12px', marginTop: '2px' }}>
                {(activeItem || activePageNumber !== null || selectedActiveSongId) && (
                  <button
                    type="button"
                    onClick={handleCreateNew}
                    style={{
                      flex: 1,
                      padding: '14px',
                      borderRadius: '14px',
                      border: '1px solid #e4e4e7',
                      background: '#ffffff',
                      color: '#3f3f46',
                      fontWeight: 800,
                      cursor: 'pointer',
                      fontSize: '0.82rem',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                      transition: 'all 0.15s ease'
                    }}
                    className="hover-scale"
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                    onMouseLeave={(e) => e.currentTarget.style.background = '#ffffff'}
                  >
                    Zurücksetzen
                  </button>
                )}
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    flex: 2,
                    padding: '14px',
                    borderRadius: '14px',
                    border: 'none',
                    background: '#09090b',
                    color: '#ffffff',
                    fontWeight: 800,
                    cursor: 'pointer',
                    fontSize: '0.82rem',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
                    transition: 'all 0.15s ease'
                  }}
                  className="hover-scale"
                  onMouseEnter={(e) => e.currentTarget.style.background = '#18181b'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#09090b'}
                >
                  {saving ? 'Wird gespeichert...' : 'Eintrag speichern'}
                </button>
              </div>

              {error && (
                <div style={{
                  background: '#fef2f2',
                  border: '1px solid #fca5a5',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  color: '#991b1b',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <AlertCircle size={15} />
                  <span>{error}</span>
                </div>
              )}
            </form>

            {/* Separator to clean visual space */}
            {(lastHomework || progressItems.filter(item => item.is_current_homework).length > 0 || sessionLogs.length > 0) && (
              <div style={{ borderTop: '1px solid #e4e4e7', margin: '8px 0' }} />
            )}

            {/* REFERENCE & HISTORY GROUP (At the bottom, simple, clean, and extremely compact) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              
              {/* 1. Vorwochen-Hausaufgabe (Only rendered if exists, extremely compact) */}
              {lastHomework && (
                <div style={{
                  background: '#fffbeb',
                  border: '1px solid #fef3c7',
                  padding: '10px 12px',
                  borderRadius: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.66rem', color: '#b45309', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      🏠 Letzte Hausaufgabe ({lastHomework.topic_name})
                    </span>
                    <span style={{ fontSize: '0.6rem', color: '#d97706', fontWeight: 600 }}>
                      {lastHomework.updated_at ? new Date(lastHomework.updated_at).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' }) : ''}
                    </span>
                  </div>
                  <div style={{ 
                    fontSize: '0.74rem', 
                    color: '#78350f', 
                    fontWeight: 650, 
                    fontStyle: 'italic', 
                    lineHeight: '1.25',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }} title={lastHomework.homework_notes}>
                    "{lastHomework.homework_notes}"
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        /* COLUMN 4: 🏆 MEISTERWERKE & LOGBUCH (Full Width in Swiss Modernist Style) */
        <div style={{
          flex: 1,
          padding: '32px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
          background: '#f8fafc'
        }}>
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

          {/* List of mastered items inside logbook */}
          {(() => {
            const masteredBooksList: any[] = [];
            assignedLehrwerke.forEach(assigned => {
              const book = globalLehrwerke.find(g => g.id === assigned.lehrwerkId);
              if (book) {
                const total = book.totalPages || 50;
                const masteredPages: number[] = [];
                Object.entries(assigned.pageStates || {}).forEach(([pStr, state]: [string, any]) => {
                  if (state.status === 'mastered') {
                    const pNum = parseInt(pStr, 10);
                    if (!isNaN(pNum)) masteredPages.push(pNum);
                  }
                });
                const pct = Math.min(100, Math.round((masteredPages.length / total) * 100));
                if (pct === 100 && masteredPages.length > 0) {
                  masteredBooksList.push({
                    title: book.title,
                    emoji: book.emoji,
                    pages: masteredPages
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
                  border: '2px dashed #cbd5e1',
                  borderRadius: '24px',
                  color: '#475569',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  background: 'white',
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
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '20px'
              }}>
                {/* Mastered Lehrwerke */}
                {masteredBooksList.map((item, idx) => (
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
                    <div style={{
                      fontSize: '0.86rem',
                      color: '#0f172a',
                      fontWeight: 900,
                      letterSpacing: '-0.03em',
                      fontFamily: '"Helvetica Neue", Helvetica, Inter, Arial, sans-serif'
                    }}>
                      {item.emoji} {item.title}
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
                ))}

                {/* Mastered Songs */}
                {masteredSongs.map((skill, idx) => (
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
                ))}
              </div>
            );
          })()}
        </div>
      )}
      </div>
      </div>
    </div>
  );
};

