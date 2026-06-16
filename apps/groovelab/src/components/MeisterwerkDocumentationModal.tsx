import React, { useState, useEffect, useMemo } from 'react';
import { X, Check, Award, Flame, AlertCircle, BookOpen, Music, History, Plus, ChevronRight, Book, Star } from 'lucide-react';
import Confetti from 'react-confetti';
import { supabase } from '../lib/supabase';

export const ALL_STICKERS = [
  // Meilensteine / Üben
  { id: 'fleiss-pionier', emoji: '🐝', title: 'Fleiß-Pionier', desc: 'Für insgesamt 250 Minuten fleißiges Üben.', color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)', auto: true },
  { id: 'uebe-meister', emoji: '🦉', title: 'Übe-Meister', desc: 'Für insgesamt 1000 Minuten ausdauerndes Üben.', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)', auto: true },
  { id: 'uebe-legende', emoji: '👑', title: 'Übe-Legende', desc: 'Für unglaubliche 3000 Minuten Übezeit!', color: '#af52de', bg: 'rgba(175, 82, 222, 0.1)', auto: true },

  // XP
  { id: 'xp-sammler', emoji: '⭐', title: 'XP-Sammler', desc: '500 XP auf dem Profil gesammelt.', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)', auto: true },
  { id: 'xp-champion', emoji: '🎖️', title: 'XP-Champion', desc: '1500 XP auf dem Profil gesammelt.', color: '#ec4899', bg: 'rgba(236, 72, 153, 0.1)', auto: true },
  { id: 'xp-meister', emoji: '🌌', title: 'XP-Meister', desc: 'Phänomenale 3000 XP auf dem Profil gesammelt.', color: '#6366f1', bg: 'rgba(99, 102, 241, 0.1)', auto: true },

  // Streaks
  { id: 'dranbleiber', emoji: '🔥', title: 'Dranbleiber', desc: 'Erreiche eine Übe-Streak von 3 Tagen.', color: '#f97316', bg: 'rgba(249, 115, 22, 0.1)', auto: true },
  { id: 'wochen-held', emoji: '📆', title: 'Wochen-Held', desc: 'Erreiche eine Übe-Streak von 7 Tagen.', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)', auto: true },
  { id: 'streak-koenig', emoji: '⚡', title: 'Streak-König', desc: 'Unglaubliche Übe-Streak von 14 Tagen gehalten!', color: '#eab308', bg: 'rgba(234, 179, 8, 0.1)', auto: true },

  // Songs
  { id: 'erster-erfolg', emoji: '🎵', title: 'Erster Erfolg', desc: 'Dein allererster gemeisterter Song (100%).', color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.1)', auto: true },
  { id: 'song-sammler', emoji: '📚', title: 'Song-Sammler', desc: 'Schon 5 Songs komplett gemeistert.', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.1)', auto: true },
  { id: 'repertoire-riese', emoji: '🦖', title: 'Repertoire-Riese', desc: '10 Songs zu 100% gemeistert und im Repertoire!', color: '#22c55e', bg: 'rgba(34, 197, 94, 0.1)', auto: true },

  // Manuell
  { id: 'stage-star', emoji: '🎤', title: 'Bühnen-Star', desc: 'Für jeden Live-Auftritt vor Publikum.', color: '#a855f7', bg: 'rgba(168, 85, 247, 0.1)', auto: false },
  { id: 'song-master', emoji: '🏆', title: 'Song-Master', desc: 'Wird für jeden zu 100% gemeisterten Song verliehen.', color: '#eab308', bg: 'rgba(234, 179, 8, 0.1)', auto: false }
];

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  photo_url?: string;
  school_id?: string;
  schoolId?: string;
  is_campus_active?: boolean;
}

interface MeisterwerkDocumentationModalProps {
  student: Student;
  onClose: () => void;
  teacherId?: string;
  initialLehrwerkId?: string;
  onProfileClick?: (student: Student) => void;
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

export const getCleanPageNotes = (notes: any): string => {
  if (!notes) return '';
  let text = '';
  if (typeof notes === 'string') {
    if (notes.startsWith('[') || notes.startsWith('{')) {
      try {
        const parsed = JSON.parse(notes);
        if (Array.isArray(parsed)) {
          text = parsed.join('\n');
        } else {
          text = String(parsed);
        }
      } catch {
        text = notes;
      }
    } else {
      text = notes;
    }
  } else if (Array.isArray(notes)) {
    text = notes.join('\n');
  } else {
    text = String(notes);
  }
  return text
    .split('\n')
    .filter((line: string) => !line.trim().startsWith('AUDIO:') && !line.trim().startsWith('STICKER:'))
    .join('\n')
    .trim();
};

export const MeisterwerkDocumentationModal: React.FC<MeisterwerkDocumentationModalProps> = ({ student, onClose, teacherId, initialLehrwerkId, onProfileClick }) => {
  const [isCampusActive, setIsCampusActive] = useState<boolean>(student.is_campus_active ?? true);

  useEffect(() => {
    if (!student.id) return;
    if (typeof student.is_campus_active === 'boolean') {
      setIsCampusActive(student.is_campus_active);
      return;
    }
    supabase
      .from('users')
      .select('is_campus_active')
      .eq('id', student.id)
      .single()
      .then(({ data }) => {
        if (data && typeof data.is_campus_active === 'boolean') {
          setIsCampusActive(data.is_campus_active);
        }
      });
  }, [student.id, student.is_campus_active]);

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
  const [isNotesFocused, setIsNotesFocused] = useState(false);
  const isNotesExpanded = isNotesFocused || !!homeworkNotes.trim();
  const homeworkTextareaRef = React.useRef<HTMLTextAreaElement>(null);
  const lastClickRef = React.useRef<{ pageNum: number; timestamp: number } | null>(null);
  const clickTimeoutRef = React.useRef<any>(null);

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

  const [textbausteine] = useState<any[]>(() => {
    const stored = localStorage.getItem('groovelab_textbausteine');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.length > 0 && parsed.some((x: any) => x.category)) {
          return parsed;
        }
      } catch (e) {
        console.error("Error parsing textbausteine:", e);
      }
    }
    return [
      { id: 'r1', label: '🥁 Puls-Master', text: 'Klatsche zuerst den Rhythmus und zähle laut mit, bevor du auf dem Instrument startest. Der Rhythmus ist das Herz der Musik!', type: 'both', category: 'rhythm', active: true },
      { id: 'r2', label: '⏱️ Metronom-Buddy', text: 'Übe diese Passage mit dem Metronom bei langsamem Tempo. Steigere die Geschwindigkeit erst, wenn es 3-mal perfekt im Takt war.', type: 'both', category: 'rhythm', active: true },
      { id: 'r3', label: '🐌 Schnecken-Tempo', text: 'Übe die schwierige Passage ganz langsam wie eine Schnecke. Erst wenn du den Ablauf im Schlaf beherrschst, schalten wir den Turbo an!', type: 'both', category: 'rhythm', active: true },
      { id: 'r4', label: '🧩 Puzzle-Taktik', text: 'Teile das Stück in kleine Häppchen auf. Nimm dir einen einzelnen Takt vor und setze ihn als perfektes Puzzleteil zusammen!', type: 'both', category: 'rhythm', active: true },
      { id: 't1', label: '🔂 Ritter-Dreierspiel', text: 'Wiederhole den kniffligen Übergang dreimal hintereinander fehlerfrei. Schaffst du das, hast du die Stelle gemeistert!', type: 'both', category: 'technique', active: true },
      { id: 't2', label: '👁️ Blind-Flug', text: 'Schließe beim Üben mal die Augen. Vertraue auf dein Gefühl und meistere die Stelle ganz blind auswendig!', type: 'both', category: 'technique', active: true },
      { id: 't3', label: '🏋️‍♂️ Fokus-Gym', text: 'Trainiere die schwierige Stelle ganz fokussiert in Zeitlupe, um maximale Kontrolle und Präzision aufzubauen.', type: 'both', category: 'technique', active: true },
      { id: 't4', label: '🕵️‍♂️ Detail-Detektiv', text: 'Lies den Text oder die Noten laut mit und achte genau auf jedes Detail. Sei wie ein Detektiv, dem kein Fehler entgeht!', type: 'lehrwerke', category: 'technique', active: true },
      { id: 'p1', label: '🎵 Laut-Leise Zauber', text: 'Lass das Stück lebendig klingen! Mache deutliche Unterschiede zwischen Flüsterlautstärke (piano) und Löwenbrüllen (forte).', type: 'both', category: 'performance', active: true },
      { id: 'p2', label: '🌟 Eigener Remix', text: 'Du beherrschst das Stück super! Überlege dir bis zum nächsten Mal eine eigene coole Rhythmus-Variante oder Verzierung für diesen Teil.', type: 'songs', category: 'performance', active: true },
      { id: 'p3', label: '🎭 Storyteller', text: 'Welche Geschichte erzählt dieses Stück? Gestalte den Klang so, als würdest du ein trauriges, spannendes oder fröhliches Abenteuer vertonen.', type: 'both', category: 'performance', active: true },
      { id: 'p4', label: '🌊 Atem-Fluss', text: 'Gestalte die Phrasen wie einen langen Atemzug. Verbinde die Töne weich und lasse die Musik atmen.', type: 'both', category: 'performance', active: true }
    ];
  });

  // Always start at hub view when modal opens
  useEffect(() => {
    setActiveSubView('hub');
    setActiveModalTab('document');
    setActiveLehrwerkId(null);
    setActivePageNumber(null);
    setSelectedActiveSongId('');
  }, [student.id]);

  const getLehrwerkColor = (title: string) => {
    const trimmed = (title || '').trim();
    const sorted = [...globalLehrwerke].sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    const index = sorted.findIndex(b => (b.title || '').trim() === trimmed);
    
    if (index !== -1 && sorted.length > 0) {
      const position = index % 26;
      const hue = Math.round((position / 25) * 360);
      return {
        from: `hsl(${hue}, 85%, 94%)`,
        to: `hsl(${hue}, 80%, 84%)`,
        text: `hsl(${hue}, 90%, 25%)`,
        shadowFrom: `hsla(${hue}, 85%, 50%, 0.2)`,
        shadowTo: `hsla(${hue}, 80%, 40%, 0.15)`
      };
    }

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
  const [textbookPageChunkIndex, setTextbookPageChunkIndex] = useState<number>(() => {
    try {
      const val = localStorage.getItem('groovelab_textbook_page_chunk_index');
      return val ? parseInt(val, 10) : 0;
    } catch {
      return 0;
    }
  });

  const setPageChunk = (idx: number) => {
    setTextbookPageChunkIndex(idx);
    localStorage.setItem('groovelab_textbook_page_chunk_index', String(idx));
  };

  const [isSongSearchFocused, setIsSongSearchFocused] = useState(false);
  const [studentXP, setStudentXP] = useState<number>(0);
  const [studentStreak, setStudentStreak] = useState<number>(0);
  const [studentPracticeMinutes, setStudentPracticeMinutes] = useState<number>(0);

  // Session log to capture all modifications made in current modal open state
  const [sessionLogs, setSessionLogs] = useState<string[]>([]);
  const [lessonDay, setLessonDay] = useState<number>(1); // Default to Monday = 1
  const [activeModalTab, setActiveModalTab] = useState<'document' | 'logbook' | 'stickeralbum'>('document');

  // Speech Recognition & Audio play-along state
  const [isListening, setIsListening] = useState(false);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);
  const [mediaRecorderInstance, setMediaRecorderInstance] = useState<MediaRecorder | null>(null);
  const recordingTimerRef = React.useRef<any>(null);
  const accumulatedTranscriptRef = React.useRef<string>('');
  const [useNotebookLayout, setUseNotebookLayout] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('meisterwerk_notebook_layout');
      return saved !== 'false'; // defaults to true if not explicitly set to 'false'
    }
    return true;
  });
  const [pageUndoStack, setPageUndoStack] = useState<{ lehrwerkId: string, pageNum: number, prevStatus: any }[]>([]);
  const [hasChanges, setHasChanges] = useState<boolean>(false);

  const summarizeVoiceNotes = async (textStr: string) => {
    if (!textStr || !textStr.trim()) return;
    try {
      setSaving(true);
      const { data, error: invokeErr } = await supabase.functions.invoke('summarize-homework', {
        body: { transcript: textStr }
      });
      if (invokeErr) throw invokeErr;
      if (data?.summary) {
        setHomeworkNotes(prev => prev ? `${prev}\n• ${data.summary}` : `• ${data.summary}`);
        setHasChanges(true);
      }
    } catch (e) {
      console.error("Error summarizing voice notes:", e);
      setHomeworkNotes(prev => prev ? `${prev}\n• ${textStr}` : `• ${textStr}`);
      setHasChanges(true);
    } finally {
      setSaving(false);
    }
  };

  // Speech Recognition setup
  const toggleSpeechRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Spracherkennung wird von Ihrem Browser leider nicht unterstützt (empfohlen: Google Chrome oder Safari).");
      return;
    }

    if (isListening) {
      setIsListening(false);
      if ((window as any).recognitionInstance) {
        (window as any).recognitionInstance.stop();
      }
    } else {
      setIsListening(true);
      accumulatedTranscriptRef.current = '';
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = 'de-DE';

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript + ' ';
          }
        }
        if (finalTranscript) {
          accumulatedTranscriptRef.current += finalTranscript;
        }
      };

      recognition.onerror = (event: any) => {
        console.error("Speech Recognition Error:", event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
        const textStr = accumulatedTranscriptRef.current.trim();
        if (textStr) {
          summarizeVoiceNotes(textStr);
        }
      };

      (window as any).recognitionInstance = recognition;
      recognition.start();
    }
  };

  // Audio Recorder logic
  const startRecordingAudio = async () => {
    let durationInSeconds = 0;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      
      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        
        setIsUploadingAudio(true);

        const saveAudioMetadata = async (audioUrlString: string) => {
          try {
            const audioMetaStr = `AUDIO:${audioUrlString}|${durationInSeconds}|${new Date().toISOString()}`;
            setHomeworkNotesList(prev => [...prev, audioMetaStr]);
            
            const updatedList = [...homeworkNotesList, audioMetaStr];
            await syncHomeworkNotes(updatedList);
            await fetchProgress();
            notifyHomeworkChange();
          } catch (saveErr) {
            console.error("Failed to save audio metadata:", saveErr);
            alert("Fehler beim Speichern der Audio-Bemerkung im Protokoll.");
          }
        };

        try {
          const fileName = `${student.id}_feedback_${Date.now()}.mp3`;
          const filePath = `avatars/audio_feedback_${fileName}`;
          
          const { error: uploadErr } = await supabase.storage
            .from('groovelab-assets')
            .upload(filePath, blob);
            
          if (uploadErr) throw uploadErr;
          
          const { data: publicUrlData } = supabase.storage
            .from('groovelab-assets')
            .getPublicUrl(filePath);
            
          const uploadedUrl = publicUrlData.publicUrl;
          await saveAudioMetadata(uploadedUrl);
        } catch (err: any) {
          console.warn("Storage upload failed, falling back to local base64 data URL:", err);
          const reader = new FileReader();
          reader.onloadend = async () => {
            const dataUrl = reader.result as string;
            await saveAudioMetadata(dataUrl);
          };
          reader.readAsDataURL(blob);
        } finally {
          setIsUploadingAudio(false);
        }
      };

      setAudioDuration(0);
      setIsRecordingAudio(true);
      recorder.start();
      setMediaRecorderInstance(recorder);
      
      recordingTimerRef.current = setInterval(() => {
        durationInSeconds += 1;
        setAudioDuration(durationInSeconds);
        if (durationInSeconds >= 60) {
          stopRecordingAudio(recorder);
        }
      }, 1000);
      
    } catch (err) {
      console.error("Failed to start recording:", err);
      alert("Mikrofonzugriff verweigert oder nicht verfügbar.");
    }
  };

  const stopRecordingAudio = (activeRecorder?: MediaRecorder) => {
    const rec = activeRecorder || mediaRecorderInstance;
    if (rec && rec.state !== 'inactive') {
      rec.stop();
      rec.stream.getTracks().forEach(track => track.stop());
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }
    setIsRecordingAudio(false);
  };

  const awardSticker = async (stickerId: string, topicNameContext?: string) => {
    try {
      const targetTopic = topicNameContext || topicName || `Allgemein`;
      const dateStr = new Date().toISOString();
      const stickerMetaStr = `STICKER:${stickerId}|${targetTopic}|${dateStr}`;
      
      setHomeworkNotesList(prev => [...prev, stickerMetaStr]);
      
      const updatedList = [...homeworkNotesList, stickerMetaStr];
      await syncHomeworkNotes(updatedList);
      
      await fetchProgress();
      notifyHomeworkChange();
      alert(`Sticker "${ALL_STICKERS.find(s => s.id === stickerId)?.title}" erfolgreich vergeben! 🎉`);
    } catch (e) {
      console.error("Error awarding sticker:", e);
    }
  };

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

  const getItemWeek = (item: { topic_name: string; updated_at?: string }): string => {
    if (item.topic_name.startsWith('Hausaufgabe KW ')) {
      const parts = item.topic_name.split('Hausaufgabe KW ');
      const kwNum = parts[1]?.trim();
      if (kwNum) {
        const year = item.updated_at ? new Date(item.updated_at).getFullYear() : new Date().getFullYear();
        return `${year}-W${kwNum.padStart(2, '0')}`;
      }
    }
    return item.updated_at ? getISOWeek(item.updated_at) : '';
  };

  const getWeeksBetween = (startWeek: string, endWeek: string): string[] => {
    const parseWeekToMonday = (wk: string): Date => {
      const [year, week] = wk.split('-W').map(Number);
      const simple = new Date(year, 0, 4);
      const day = simple.getDay() || 7;
      const monday = new Date(simple.getTime() - (day - 1) * 24 * 3600000);
      monday.setDate(monday.getDate() + (week - 1) * 7);
      return monday;
    };

    try {
      const startMon = parseWeekToMonday(startWeek);
      const endMon = parseWeekToMonday(endWeek);
      
      const result: string[] = [];
      const curr = new Date(startMon);
      let iterations = 0;
      while (curr <= endMon && iterations < 500) {
        result.push(getISOWeek(curr));
        curr.setDate(curr.getDate() + 7);
        iterations++;
      }
      return Array.from(new Set(result)).sort().reverse();
    } catch (e) {
      console.error(e);
      return [startWeek, endWeek];
    }
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

  const syncHomeworkNotes = async (notesList: string[]) => {
    const currentWeek = getISOWeek();
    const allNotesJson = JSON.stringify(notesList);
    const cleanNotesJson = JSON.stringify(notesList.filter(n => !n.startsWith('AUDIO:')));

    const dummyWeeklyItem = progressItems.find(item => 
      item.topic_name.startsWith('Hausaufgabe KW ') && 
      getItemWeek(item) === currentWeek
    );

    if (dummyWeeklyItem) {
      const { error } = await supabase
        .from('progress_matrix')
        .update({ homework_notes: allNotesJson, updated_at: new Date().toISOString() })
        .eq('id', dummyWeeklyItem.id);
      if (error) throw error;
    } else {
      const activeTId = await getCurrentTeacherId();
      const { error } = await supabase
        .from('progress_matrix')
        .insert({
          student_id: student.id,
          teacher_id: activeTId,
          topic_name: `Hausaufgabe KW ${currentWeek.split('-W')[1]}`,
          status: 'IN_PROGRESS',
          is_current_homework: true,
          teacher_notes: '',
          homework_notes: allNotesJson,
          updated_at: new Date().toISOString()
        });
      if (error) throw error;
    }

    const currentWeekItems = progressItems.filter(item => 
      getItemWeek(item) === currentWeek && 
      !item.topic_name.startsWith('Hausaufgabe KW ')
    );

    if (currentWeekItems.length > 0) {
      const itemIds = currentWeekItems.map(item => item.id).filter(Boolean);
      const { error } = await supabase
        .from('progress_matrix')
        .update({ homework_notes: cleanNotesJson, updated_at: new Date().toISOString() })
        .in('id', itemIds);
      if (error) throw error;
    }
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

  useEffect(() => {
    return () => {
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
      }
    };
  }, []);

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
        item.topic_name.startsWith('Hausaufgabe KW ') &&
        item.homework_notes && 
        item.homework_notes.trim() !== '' && 
        item.updated_at && 
        getISOWeek(item.updated_at) === currentWeek
      ) || (data || []).find(item => 
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

          // Fetch avatars (streak_flame, xp)
          const { data: avatarData, error: avatarError } = await supabase
            .from('avatars')
            .select('xp, streak_flame')
            .eq('user_id', student.id)
            .maybeSingle();

          if (!avatarError && avatarData) {
            setStudentXP(avatarData.xp || 0);
            setStudentStreak(avatarData.streak_flame || 0);
          }

          // Fetch fokus_logs and sum up all minutes
          const { data: focusData, error: focusError } = await supabase
            .from('fokus_logs')
            .select('seconds_spent')
            .eq('student_id', student.id);

          if (!focusError && focusData) {
            const totalSeconds = focusData.reduce((sum, item) => sum + (item.seconds_spent || 0), 0);
            setStudentPracticeMinutes(Math.floor(totalSeconds / 60));
          }
        } catch (e) {
          console.error('Error loading student profile in modal:', e);
        }
      };
      fetchProfile();
    }
  }, [student.id]);

  const awardStickerSilent = async (stickerId: string, topicNameContext: string) => {
    try {
      const targetTopic = topicNameContext || `System-Meilenstein`;
      const dateStr = new Date().toISOString();
      const stickerMetaStr = `STICKER:${stickerId}|${targetTopic}|${dateStr}`;
      
      const currentWeek = getISOWeek();
      const dummyWeeklyItem = progressItems.find(item => 
        item.topic_name.startsWith('Hausaufgabe KW ') && 
        getItemWeek(item) === currentWeek
      );

      let currentNotes: string[] = [];
      if (dummyWeeklyItem && dummyWeeklyItem.homework_notes) {
        try {
          currentNotes = dummyWeeklyItem.homework_notes.startsWith('[') && dummyWeeklyItem.homework_notes.endsWith(']')
            ? JSON.parse(dummyWeeklyItem.homework_notes)
            : [dummyWeeklyItem.homework_notes];
        } catch (e) {
          currentNotes = [dummyWeeklyItem.homework_notes];
        }
      }
      
      const updatedList = [...currentNotes, stickerMetaStr];
      const allNotesJson = JSON.stringify(updatedList);

      if (dummyWeeklyItem) {
        const { error } = await supabase
          .from('progress_matrix')
          .update({ homework_notes: allNotesJson, updated_at: new Date().toISOString() })
          .eq('id', dummyWeeklyItem.id);
        if (error) throw error;
      } else {
        const activeTId = await getCurrentTeacherId();
        const { error } = await supabase
          .from('progress_matrix')
          .insert({
            student_id: student.id,
            teacher_id: activeTId,
            topic_name: `Hausaufgabe KW ${currentWeek.split('-W')[1]}`,
            status: 'IN_PROGRESS',
            is_current_homework: true,
            teacher_notes: '',
            homework_notes: allNotesJson,
            updated_at: new Date().toISOString()
          });
        if (error) throw error;
      }

      await fetchProgress();
      notifyHomeworkChange();
    } catch (e) {
      console.error("Error silently awarding sticker:", e);
    }
  };

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

  // Synchronize progressItems from DB into student_lehrwerke_progress in localStorage
  useEffect(() => {
    if (globalLehrwerke.length === 0 || progressItems.length === 0) return;

    try {
      const stored = localStorage.getItem('student_lehrwerke_progress');
      let parsed = stored ? JSON.parse(stored) : [];
      let hasChanges = false;

      globalLehrwerke.forEach(book => {
        const bookTitleLower = book.title.toLowerCase();
        
        // Find all progress items for this book
        const bookProgressItems = progressItems.filter(item => {
          const topicLower = (item.topic_name || '').toLowerCase();
          return topicLower.startsWith(bookTitleLower + ' - seite ');
        });

        if (bookProgressItems.length === 0) return;

        // Ensure the book is assigned locally if there are progress items for it in the DB
        let assignmentIndex = parsed.findIndex((item: any) => item.studentId === student.id && item.lehrwerkId === book.id);
        if (assignmentIndex === -1) {
          const newAssignment = {
            studentId: student.id,
            lehrwerkId: book.id,
            assignedAt: new Date().toISOString(),
            pageStates: {}
          };
          parsed.push(newAssignment);
          assignmentIndex = parsed.length - 1;
          hasChanges = true;
        }

        const assignment = parsed[assignmentIndex];
        const pageStates = { ...assignment.pageStates };
        const pageSeen = new Set<number>();

        bookProgressItems.forEach(item => {
          const parts = item.topic_name.split(' - Seite ');
          const pageNumStr = parts[1];
          const pageNum = parseInt(pageNumStr, 10);
          if (isNaN(pageNum)) return;

          // Only process the latest entry for each page number (newest wins since progressItems is sorted updated_at DESC)
          if (pageSeen.has(pageNum)) return;
          pageSeen.add(pageNum);

          // Map database status/homework back to local status
          let localStatus: 'locked' | 'homework' | 'mastered' | 'purple' = 'locked';
          if (item.status === 'MASTERED') {
            localStatus = 'mastered';
          } else if (item.status === 'THEORY_DONE') {
            localStatus = 'purple';
          } else if (item.is_current_homework) {
            localStatus = 'homework';
          }

          const existingState = pageStates[pageNum];
          const dbItemTime = item.updated_at ? new Date(item.updated_at).getTime() : 0;
          const localItemTime = existingState?.updatedAt ? new Date(existingState.updatedAt).getTime() : 0;

          if (dbItemTime > localItemTime) {
            if (!existingState || existingState.status !== localStatus) {
              pageStates[pageNum] = {
                ...(existingState || {}),
                status: localStatus,
                updatedAt: item.updated_at || new Date().toISOString(),
                notes: item.teacher_notes || existingState?.notes || '',
                homework_notes: item.homework_notes || existingState?.homework_notes || ''
              };
              hasChanges = true;
            }
          }
        });

        assignment.pageStates = pageStates;
      });

      if (hasChanges) {
        localStorage.setItem('student_lehrwerke_progress', JSON.stringify(parsed));
        const filtered = parsed.filter((item: any) => item.studentId === student.id);
        setAssignedLehrwerke(filtered);
      }
    } catch (err) {
      console.error('Error synchronizing textbook progress from DB:', err);
    }
  }, [globalLehrwerke, progressItems, student.id]);

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
          setAssignedLehrwerke(updated.filter((item: any) => item.studentId === student.id));
          
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
      const noteToDelete = homeworkNotesList[noteIndex];
      if (noteToDelete && noteToDelete.startsWith("AUDIO:")) {
        const parts = noteToDelete.substring(6).split('|');
        const audioUrlString = parts[0];
        if (audioUrlString && audioUrlString.startsWith("http")) {
          const marker = '/storage/v1/object/public/groovelab-assets/';
          const markerIndex = audioUrlString.indexOf(marker);
          if (markerIndex !== -1) {
            const filePath = audioUrlString.substring(markerIndex + marker.length);
            console.log("Deleting audio file from storage:", filePath);
            await supabase.storage.from('groovelab-assets').remove([filePath]);
          }
        }
      }

      const updatedList = homeworkNotesList.filter((_, idx) => idx !== noteIndex);
      setHomeworkNotesList(updatedList);
      
      await syncHomeworkNotes(updatedList);
      
      await fetchProgress();
      notifyHomeworkChange();
    } catch (e) {
      console.error('Error deleting note:', e);
    }
  };

  const handleDeletePageNote = async (bookTitle: string, pageNum: number) => {
    try {
      const book = globalLehrwerke.find(b => b.title === bookTitle);
      if (!book) return;

      const stored = localStorage.getItem('student_lehrwerke_progress');
      if (stored) {
        const parsed = JSON.parse(stored);
        const updated = parsed.map((item: any) => {
          if (item.studentId === student.id && item.lehrwerkId === book.id) {
            const pageStates = { ...item.pageStates };
            if (pageStates[pageNum]) {
              pageStates[pageNum] = {
                ...pageStates[pageNum],
                homeworkNotes: '',
                homework_notes: ''
              };
            }
            return { ...item, pageStates };
          }
          return item;
        });
        localStorage.setItem('student_lehrwerke_progress', JSON.stringify(updated));
      }

      const currentWeek = getISOWeek();
      const existing = progressItems.find(item => 
        item.topic_name === `${bookTitle} - Seite ${pageNum}` && 
        item.updated_at && 
        getISOWeek(item.updated_at) === currentWeek
      );

      if (existing?.id) {
        const { error } = await supabase
          .from('progress_matrix')
          .update({ homework_notes: '' })
          .eq('id', existing.id);
        if (error) throw error;
      }

      await fetchProgress();
      loadLehrwerke();
      notifyHomeworkChange();
    } catch (err) {
      console.error('Error deleting page note:', err);
    }
  };

  const handleAddNote = async () => {
    if (!homeworkNotes.trim()) return;
    try {
      const newNote = homeworkNotes.trim();
      const updatedList = [...homeworkNotesList, newNote];
      setHomeworkNotesList(updatedList);
      setHomeworkNotes('');

      await syncHomeworkNotes(updatedList);

      await fetchProgress();
      notifyHomeworkChange();
      setIsNotesFocused(false);
    } catch (e) {
      console.error('Error adding note:', e);
    }
  };

  const handleStatusChange = (newStatus: 'IN_PROGRESS' | 'THEORY_DONE' | 'MASTERED') => {
    setStatus(newStatus);
  };

  const handleRemoveLehrwerk = async (lehrwerkId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm("Lehrwerk wirklich entfernen?")) return;
    try {
      const book = globalLehrwerke.find(g => g.id === lehrwerkId);
      if (book) {
        // Set is_current_homework to false for all pages of this book
        const { error } = await supabase
          .from('progress_matrix')
          .update({ is_current_homework: false })
          .eq('student_id', student.id)
          .like('topic_name', `${book.title} - Seite %`);
        if (error) console.error('Error updating progress matrix:', error);
      }

      const stored = localStorage.getItem('student_lehrwerke_progress');
      const parsed = stored ? JSON.parse(stored) : [];
      const updated = parsed.filter((item: any) => !(item.studentId === student.id && item.lehrwerkId === lehrwerkId));
      localStorage.setItem('student_lehrwerke_progress', JSON.stringify(updated));
      loadLehrwerke();
      if (activeLehrwerkId === lehrwerkId) {
        setActiveLehrwerkId(null);
        setActivePageNumber(null);
      }

      await fetchProgress();
      notifyHomeworkChange();
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

  const handlePageDoubleClick = (lehrwerkId: string, pageNum: number) => {
    const stored = localStorage.getItem('student_lehrwerke_progress');
    const parsed = stored ? JSON.parse(stored) : [];
    const assignedBook = parsed.find((a: any) => a.studentId === student.id && a.lehrwerkId === lehrwerkId);
    const pageState = assignedBook?.pageStates?.[pageNum] || { status: 'locked' };
    const currentStatus = pageState.status || 'locked';

    console.log('handlePageDoubleClick called:', { lehrwerkId, pageNum, currentStatus });
    let targetStatus: 'IN_PROGRESS' | 'THEORY_DONE' | 'MASTERED' = 'IN_PROGRESS';
    let targetHomework = false;

    if (currentStatus === 'homework') {
      targetStatus = 'MASTERED';
      targetHomework = false;
    } else if (currentStatus === 'mastered') {
      targetStatus = 'IN_PROGRESS';
      targetHomework = false;
    } else {
      targetStatus = 'IN_PROGRESS';
      targetHomework = true;
    }

    console.log('handlePageDoubleClick saving:', { targetStatus, targetHomework });
    triggerDirectSave(lehrwerkId, pageNum, targetStatus, targetHomework);
    selectTextbookPage(lehrwerkId, pageNum, targetStatus, targetHomework);
  };

  const selectTextbookPage = (
    lehrwerkId: string, 
    pageNum: number, 
    overrideStatus?: 'IN_PROGRESS' | 'THEORY_DONE' | 'MASTERED',
    overrideHomework?: boolean
  ) => {
    console.log('selectTextbookPage called:', { lehrwerkId, pageNum, overrideStatus, overrideHomework });
    const book = globalLehrwerke.find(b => b.id === lehrwerkId);
    if (!book) {
      console.log('selectTextbookPage book not found:', lehrwerkId);
      return;
    }

    setActiveLehrwerkId(lehrwerkId);
    setActivePageNumber(pageNum);
    setActiveInputTab('lehrwerk_page');
    setActiveSubView('lehrwerk');
    
    // Automatically determine which 49-page group this page belongs to
    const calculatedGroup = Math.floor((pageNum - 1) / 49);
    setPageGroupIndex(calculatedGroup);
    
    const stored = localStorage.getItem('student_lehrwerke_progress');
    const parsed = stored ? JSON.parse(stored) : [];
    const assignedBook = parsed.find((a: any) => a.studentId === student.id && a.lehrwerkId === lehrwerkId);
    const pageState = assignedBook?.pageStates?.[pageNum] || { status: 'locked', notes: '', homework_notes: '' };
    console.log('selectTextbookPage pageState loaded:', pageState);
    
    // Look up existing database notes in progressItems
    const topicNameStr = `${book.title} - Seite ${pageNum}`;
    const dbItem = progressItems.find(item => item.topic_name === topicNameStr);
    
    // Auto-populate form
    setTopicName(topicNameStr);
    setTeacherNotes(dbItem ? (dbItem.teacher_notes || '') : (pageState.notes || ''));
    let loadedNote = '';
    if (dbItem?.homework_notes) {
      try {
        const parsed = JSON.parse(dbItem.homework_notes);
        loadedNote = Array.isArray(parsed) ? parsed.join('\n') : String(parsed);
      } catch {
        loadedNote = dbItem.homework_notes;
      }
    } else {
      loadedNote = pageState.homeworkNotes || pageState.homework_notes || '';
    }
    setHomeworkNotes(loadedNote);

    // Map textbook page statuses to Supabase/form states
    if (overrideStatus !== undefined) {
      setStatus(overrideStatus);
      setIsCurrentHomework(!!overrideHomework);
    } else {
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
    // Load homework notes list
    if (dbItem && dbItem.homework_notes) {
      const rawNotes = dbItem.homework_notes;
      try {
        if (rawNotes.startsWith('[') && rawNotes.endsWith(']')) {
          setHomeworkNotesList(JSON.parse(rawNotes));
        } else {
          setHomeworkNotesList([rawNotes]);
        }
      } catch {
        setHomeworkNotesList([rawNotes]);
      }
    } else {
      setHomeworkNotesList([]);
    }
    setHomeworkNotes('');
    
    if (skill.is_stage_ready || skill.progress_percent === 100 || (dbItem && dbItem.status === 'MASTERED')) {
      setStatus('MASTERED');
      setIsCurrentHomework(false);
    } else {
      setStatus('IN_PROGRESS');
      const isHw = dbItem ? dbItem.is_current_homework : (skill.is_current_homework || false);
      setIsCurrentHomework(isHw);
    }
  };

  // Find former notes matching the current topic Name automatically!
  const formerNotes = useMemo(() => {
    if (!topicName.trim()) return [];
    return progressItems.filter(item => item.topic_name.toLowerCase().trim() === topicName.toLowerCase().trim());
  }, [topicName, progressItems]);

  // Scan all database entries for awarded stickers
  const collectedStickers = useMemo(() => {
    const counts: Record<string, { count: number; details: { topic: string; date: string }[] }> = {};
    ALL_STICKERS.forEach(s => {
      counts[s.id] = { count: 0, details: [] };
    });

    progressItems.forEach(item => {
      if (item.homework_notes) {
        try {
          const notesArray = item.homework_notes.startsWith('[') && item.homework_notes.endsWith(']')
            ? JSON.parse(item.homework_notes)
            : [item.homework_notes];
          
          if (Array.isArray(notesArray)) {
            notesArray.forEach((note: string) => {
              if (note.startsWith("STICKER:")) {
                const content = note.substring(8);
                const parts = content.split('|');
                const stickerId = parts[0];
                const topic = parts[1] || 'Allgemein';
                const date = parts[2] ? new Date(parts[2]).toLocaleDateString('de-DE') : 'Unbekannt';
                
                if (counts[stickerId]) {
                  counts[stickerId].count += 1;
                  counts[stickerId].details.push({ topic, date });
                }
              }
            });
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
    });

    return counts;
  }, [progressItems]);

  useEffect(() => {
    if (!student.id || loading || progressItems.length === 0) return;

    const runAutoStickerCheck = async () => {
      const collectedIds = new Set(Object.keys(collectedStickers).filter(id => collectedStickers[id].count > 0));
      const completedSongsCount = activeSongSkills.filter(s => s.progress === 100 || s.status === 'MASTERED').length;

      const autoAwards = [
        { id: 'fleiss-pionier', value: 250, current: studentPracticeMinutes, context: `${studentPracticeMinutes} Min. geübt` },
        { id: 'uebe-meister', value: 1000, current: studentPracticeMinutes, context: `${studentPracticeMinutes} Min. geübt` },
        { id: 'uebe-legende', value: 3000, current: studentPracticeMinutes, context: `${studentPracticeMinutes} Min. geübt` },

        { id: 'xp-sammler', value: 500, current: studentXP, context: `${studentXP} XP erreicht` },
        { id: 'xp-champion', value: 1500, current: studentXP, context: `${studentXP} XP erreicht` },
        { id: 'xp-meister', value: 3000, current: studentXP, context: `${studentXP} XP erreicht` },

        { id: 'dranbleiber', value: 3, current: studentStreak, context: `${studentStreak} Tage Streak` },
        { id: 'wochen-held', value: 7, current: studentStreak, context: `${studentStreak} Tage Streak` },
        { id: 'streak-koenig', value: 14, current: studentStreak, context: `${studentStreak} Tage Streak` },

        { id: 'erster-erfolg', value: 1, current: completedSongsCount, context: `${completedSongsCount} Songs gemeistert` },
        { id: 'song-sammler', value: 5, current: completedSongsCount, context: `${completedSongsCount} Songs gemeistert` },
        { id: 'repertoire-riese', value: 10, current: completedSongsCount, context: `${completedSongsCount} Songs gemeistert` }
      ];

      for (const award of autoAwards) {
        if (!collectedIds.has(award.id) && award.current >= award.value) {
          console.log(`Auto-awarding sticker: ${award.id}`);
          await awardStickerSilent(award.id, award.context);
        }
      }
    };

    runAutoStickerCheck();
  }, [student.id, progressItems, activeSongSkills, studentPracticeMinutes, studentXP, studentStreak, loading, collectedStickers]);

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
                ...(item.pageStates?.[pageNum] || {}),
                status: pageStatus,
                updatedAt: new Date(Date.now() + 10000).toISOString()
              }
            }
          };
        }
        return item;
      });

      localStorage.setItem('student_lehrwerke_progress', JSON.stringify(updated));
      setAssignedLehrwerke(updated.filter((item: any) => item.studentId === student.id));

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

    let targetHomework = isCurrentHomework;
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
        } else if (isCurrentHomework || (status === 'IN_PROGRESS' && homeworkNotes.trim().length > 0)) {
          pageStatus = 'homework';
          targetHomework = true;
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
                  homeworkNotes: homeworkNotes.trim(),
                  updatedAt: new Date(Date.now() + 10000).toISOString()
                }
              }
            };
          }
          return item;
        });

        localStorage.setItem('student_lehrwerke_progress', JSON.stringify(updated));
        setAssignedLehrwerke(updated.filter((item: any) => item.studentId === student.id));
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

    const isLehrwerkPage = (activeInputTab === 'lehrwerk_page');
    const isSong = (activeInputTab === 'active_song');

    let finalNotesList = [...homeworkNotesList];
    if (!isLehrwerkPage && !isSong && homeworkNotes.trim().length > 0) {
      finalNotesList.push(homeworkNotes.trim());
    }
    const combinedHomeworkNotes = JSON.stringify(finalNotesList);

    const hasHomeworkText = finalNotesList.length > 0;
    const finalIsCurrentHomework = targetHomework || (isLehrwerkPage || isSong ? homeworkNotes.trim().length > 0 : hasHomeworkText);

    const payload = {
      id: activeItem?.id,
      studentId: student.id,
      topicName: finalTopicName,
      status,
      isCurrentHomework: finalIsCurrentHomework,
      teacherNotes: teacherNotes.trim(),
      homeworkNotes: (isLehrwerkPage || isSong) ? homeworkNotes.trim() : combinedHomeworkNotes
    };

    try {
      // Clean up any unassigned textbooks' homework status in the database
      const unassignedHWItems = progressItems.filter(item => {
        if (!item.is_current_homework) return false;
        if (item.topic_name.includes(' - Seite ')) {
          const parts = item.topic_name.split(' - Seite ');
          const bookTitle = parts[0].trim();
          const book = globalLehrwerke.find(g => g.title === bookTitle);
          const isBookAssigned = book && assignedLehrwerke.some(a => a.lehrwerkId === book.id);
          return !isBookAssigned;
        }
        return false;
      });

      if (unassignedHWItems.length > 0) {
        const unassignedIds = unassignedHWItems.map(item => item.id).filter(Boolean);
        if (unassignedIds.length > 0) {
          await supabase
            .from('progress_matrix')
            .update({ is_current_homework: false })
            .in('id', unassignedIds);
        }
      }

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
        const parsedNotes = JSON.parse(combinedHomeworkNotes || '[]');
        await syncHomeworkNotes(parsedNotes);

        if (targetHomework && !isCurrentHomework) {
          setIsCurrentHomework(true);
        }

        await fetchProgress();
        notifyHomeworkChange();
        setHomeworkNotes('');
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

      const parsedNotes = JSON.parse(combinedHomeworkNotes || '[]');
      const rowHomeworkNotes = finalTopicName.startsWith('Hausaufgabe KW ')
        ? combinedHomeworkNotes
        : JSON.stringify(parsedNotes.filter((n: string) => !n.startsWith('AUDIO:')));

      const row = {
        student_id: student.id,
        teacher_id: activeTId,
        topic_name: finalTopicName,
        status,
        is_current_homework: finalIsCurrentHomework,
        teacher_notes: teacherNotes.trim(),
        homework_notes: rowHomeworkNotes,
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

      await syncHomeworkNotes(parsedNotes);

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
          progress_percent: 0,
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
        progress_percent: 0,
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
        {/* Header - Apple-style compact redesign */}
        <div style={{
          padding: '16px 20px',
          background: useNotebookLayout 
            ? '#456355' 
            : 'rgba(255, 255, 255, 0.82)',
          backdropFilter: useNotebookLayout ? 'none' : 'blur(20px) saturate(190%)',
          borderBottom: useNotebookLayout 
            ? '1px solid rgba(50, 72, 62, 0.8)' 
            : '1px solid rgba(0, 0, 0, 0.06)',
          borderRadius: useNotebookLayout ? '24px 24px 0 0' : '0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px',
          zIndex: 50,
          boxShadow: useNotebookLayout 
            ? '0 2px 8px rgba(0,0,0,0.12)' 
            : '0 1px 0 rgba(0,0,0,0.04)'
        }}>
          {/* Left: Avatar + Student Info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
            <div 
              onClick={() => onProfileClick && onProfileClick(student)}
              title={onProfileClick ? 'Schülerprofil anzeigen' : undefined}
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                overflow: 'hidden',
                flexShrink: 0,
                boxShadow: useNotebookLayout ? '0 2px 6px rgba(0,0,0,0.25)' : '0 1px 4px rgba(0,0,0,0.08)',
                border: useNotebookLayout ? '1.5px solid rgba(255, 213, 79, 0.2)' : '1px solid rgba(0,0,0,0.06)',
                cursor: onProfileClick ? 'pointer' : 'default',
                transition: 'opacity 0.2s'
              }}
              onMouseEnter={(e) => {
                if (onProfileClick) e.currentTarget.style.opacity = '0.8';
              }}
              onMouseLeave={(e) => {
                if (onProfileClick) e.currentTarget.style.opacity = '1';
              }}
            >
              <img
                src={getInstrumentAvatarUrl(studentInstrument)}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                alt=""
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', minWidth: 0 }}>
              <h2 
                onClick={() => onProfileClick && onProfileClick(student)}
                title={onProfileClick ? 'Schülerprofil anzeigen' : undefined}
                style={{
                  margin: 0,
                  fontSize: '1rem',
                  fontWeight: 700,
                  color: useNotebookLayout ? '#ffffff' : '#1d1d1f',
                  letterSpacing: '-0.02em',
                  lineHeight: 1.2,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  cursor: onProfileClick ? 'pointer' : 'default',
                  transition: 'opacity 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (onProfileClick) e.currentTarget.style.opacity = '0.8';
                }}
                onMouseLeave={(e) => {
                  if (onProfileClick) e.currentTarget.style.opacity = '1';
                }}
              >
                {student.first_name} {student.last_name}
              </h2>
              <span style={{
                fontSize: '0.68rem',
                color: useNotebookLayout ? 'rgba(197,216,207,0.85)' : '#8e8e93',
                fontWeight: 500,
                letterSpacing: '0.01em'
              }}>
                Schüler-Protokoll
              </span>
            </div>
          </div>

          {/* Right: Design Toggle + Close */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            {/* Compact Design Toggle */}
            <button
              type="button"
              title={useNotebookLayout ? 'Modernes Design' : 'Notizbuch-Design'}
              onClick={() => {
                const nextVal = !useNotebookLayout;
                setUseNotebookLayout(nextVal);
                localStorage.setItem('meisterwerk_notebook_layout', String(nextVal));
              }}
              style={{
                background: useNotebookLayout ? 'rgba(0,0,0,0.18)' : 'rgba(120,120,128,0.08)',
                border: useNotebookLayout ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.07)',
                color: useNotebookLayout ? '#e0ede7' : '#3c3c43',
                padding: '6px 12px',
                borderRadius: '20px',
                fontSize: '0.72rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.18s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                letterSpacing: '0.01em'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = useNotebookLayout ? 'rgba(0,0,0,0.28)' : 'rgba(120,120,128,0.14)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = useNotebookLayout ? 'rgba(0,0,0,0.18)' : 'rgba(120,120,128,0.08)';
              }}
            >
              <Book size={12} style={{ opacity: 0.85 }} />
              <span>{useNotebookLayout ? 'Modern' : 'Notizbuch'}</span>
            </button>

            {/* Close Button */}
            <button
              onClick={handleClose}
              style={{
                background: useNotebookLayout ? 'rgba(0,0,0,0.18)' : 'rgba(120,120,128,0.08)',
                border: useNotebookLayout ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.05)',
                borderRadius: '50%',
                width: '30px',
                height: '30px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: useNotebookLayout ? '#c5d8cf' : '#8e8e93',
                transition: 'all 0.18s ease',
                flexShrink: 0
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = useNotebookLayout ? 'rgba(0,0,0,0.3)' : 'rgba(120,120,128,0.16)';
                e.currentTarget.style.color = useNotebookLayout ? '#ffd54f' : '#1d1d1f';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = useNotebookLayout ? 'rgba(0,0,0,0.18)' : 'rgba(120,120,128,0.08)';
                e.currentTarget.style.color = useNotebookLayout ? '#c5d8cf' : '#8e8e93';
              }}
              className="hover-scale"
            >
              <X size={13} />
            </button>
          </div>
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
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
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
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeIn 0.25s ease', overflowY: 'auto', padding: '24px' }}>
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
                    const existingWeeks = progressItems
                      .filter(item => item.updated_at)
                      .map(item => getItemWeek(item))
                      .filter(Boolean);

                    let weeks: string[] = [];
                    if (existingWeeks.length > 0) {
                      const sortedExisting = [...existingWeeks].sort();
                      const earliestWeek = sortedExisting[0];
                      const currentWeek = getISOWeek();
                      const latestExisting = sortedExisting[sortedExisting.length - 1];
                      const endWeek = currentWeek > latestExisting ? currentWeek : latestExisting;
                      weeks = getWeeksBetween(earliestWeek, endWeek);
                    } else {
                      weeks = [getISOWeek()];
                    }
                    
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
                      const weekItems = progressItems.filter(item => item.updated_at && getItemWeek(item) === wk);
                      const homeworkItemsCount = weekItems.filter(item => item.is_current_homework && !item.topic_name.startsWith('Hausaufgabe KW ')).length;
                      const isCompact = homeworkItemsCount === 0;
                      
                      return (
                        <div
                          key={wk}
                          onClick={() => setSelectedHistoryWeek(wk)}
                          style={{
                            background: isSelected ? '#f1f5f9' : 'white',
                            border: isSelected ? '1.5px solid #456355' : '1px solid #cbd5e1',
                            borderRadius: '16px',
                            padding: isCompact ? '10px 16px' : '16px',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: isCompact ? '0px' : '4px',
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
                          {!isCompact && (
                            <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 500 }}>
                              Dokumentiert in Woche {weekNum}
                            </span>
                          )}
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
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeIn 0.25s ease', flex: 1, overflowY: 'auto', padding: '24px' }}>
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
                        {pages.length > 60 && (
                          <div style={{ display: 'flex', gap: '6px', marginBottom: '8px', flexWrap: 'wrap' }}>
                            {Array.from({ length: Math.ceil(pages.length / 60) }).map((_, idx) => {
                              const startPage = idx * 60 + 1;
                              const endPage = Math.min((idx + 1) * 60, pages.length);
                              const totalChunks = Math.ceil(pages.length / 60);
                              const activeChunkIndex = Math.min(textbookPageChunkIndex, Math.max(0, totalChunks - 1));
                              const isSelected = activeChunkIndex === idx;
                              return (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => setPageChunk(idx)}
                                  style={{
                                    background: isSelected ? '#456355' : '#f1f5f9',
                                    color: isSelected ? 'white' : '#475569',
                                    border: 'none',
                                    padding: '6px 12px',
                                    borderRadius: '12px',
                                    fontSize: '0.74rem',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease',
                                    boxShadow: isSelected ? '0 2px 6px rgba(69, 99, 85, 0.2)' : 'none'
                                  }}
                                  className="hover-scale"
                                >
                                  {startPage}-{endPage}
                                </button>
                              );
                            })}
                          </div>
                        )}
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(44px, 1fr))',
                          gap: '8px',
                          maxHeight: '320px',
                          overflowY: 'auto',
                          padding: '4px'
                        }}>
                          {(() => {
                            const totalChunks = Math.ceil(pages.length / 60);
                            const activeChunkIndex = Math.min(textbookPageChunkIndex, Math.max(0, totalChunks - 1));
                            const displayedPages = pages.length > 60 ? pages.slice(activeChunkIndex * 60, (activeChunkIndex + 1) * 60) : pages;
                            return displayedPages.map(num => {
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
                                  onClick={() => {
                                    if (activeBrush !== 'NONE') {
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

                                      triggerDirectSave(activeLehrwerkId!, num, targetStatus, targetHomework);
                                      selectTextbookPage(activeLehrwerkId!, num, targetStatus, targetHomework);
                                      return;
                                    }

                                    const now = Date.now();
                                    if (lastClickRef.current && lastClickRef.current.pageNum === num && (now - lastClickRef.current.timestamp) < 250) {
                                      if (clickTimeoutRef.current) {
                                        clearTimeout(clickTimeoutRef.current);
                                        clickTimeoutRef.current = null;
                                      }
                                      lastClickRef.current = null;
                                      handlePageDoubleClick(activeLehrwerkId!, num);
                                    } else {
                                      lastClickRef.current = { pageNum: num, timestamp: now };
                                      if (clickTimeoutRef.current) {
                                        clearTimeout(clickTimeoutRef.current);
                                      }
                                      clickTimeoutRef.current = setTimeout(() => {
                                        clickTimeoutRef.current = null;
                                        lastClickRef.current = null;
                                        selectTextbookPage(activeLehrwerkId!, num);
                                      }, 250);
                                    }
                                  }}
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
                            });
                          })()}
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
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeIn 0.25s ease', flex: 1, overflowY: 'auto', padding: '24px' }}>
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
                          <div style={{ width: `${progress}%`, height: '100%', background: (status === 'MASTERED' || skill.is_stage_ready || progress === 100) ? 'hsl(130, 65%, 82%)' : 'hsl(47, 85%, 84%)', transition: 'width 0.4s ease' }} />
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
                            { mode: 'LOCKED', color: 'hsl(355, 75%, 84%)', label: 'Rot (unbearbeitet)', getActive: () => status === 'IN_PROGRESS' && !isCurrentHomework, action: () => {
                               setStatus('IN_PROGRESS');
                               setIsCurrentHomework(false);
                               setSongProgressPercent(25);
                               setRhythmVal(25);
                               setFingerVal(25);
                               setExpressionVal(25);
                               setHasChanges(true);
                               localStorage.setItem(`song_skills_detail_${student.id}_${selectedActiveSongId}`, JSON.stringify({
                                 rhythm: 25,
                                 finger: 25,
                                 expression: 25
                               }));
                               if (selectedActiveSongId) triggerDirectSongSave(selectedActiveSongId, 'IN_PROGRESS', false);
                             } },
                            { mode: 'HOMEWORK', color: 'hsl(47, 85%, 84%)', label: 'Gelb (Hausaufgabe)', getActive: () => status === 'IN_PROGRESS' && isCurrentHomework, action: () => {
                               setStatus('IN_PROGRESS');
                               setIsCurrentHomework(true);
                               setSongProgressPercent(25);
                               setRhythmVal(25);
                               setFingerVal(25);
                               setExpressionVal(25);
                               setHasChanges(true);
                               localStorage.setItem(`song_skills_detail_${student.id}_${selectedActiveSongId}`, JSON.stringify({
                                 rhythm: 25,
                                 finger: 25,
                                 expression: 25
                               }));
                               if (selectedActiveSongId) triggerDirectSongSave(selectedActiveSongId, 'IN_PROGRESS', true);
                             } },
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
                               if (selectedActiveSongId) triggerDirectSongSave(selectedActiveSongId, 'MASTERED', false);
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
                              setStatus('MASTERED');
                              setIsCurrentHomework(false);
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
                            accentColor: songProgressPercent === 100 ? 'hsl(130, 65%, 82%)' : 'hsl(47, 85%, 84%)',
                            height: '9px',
                            borderRadius: '4.5px',
                            cursor: 'pointer',
                            background: `linear-gradient(to right, ${songProgressPercent === 100 ? 'hsl(130, 65%, 82%)' : 'hsl(47, 85%, 84%)'} 0%, ${songProgressPercent === 100 ? 'hsl(130, 65%, 82%)' : 'hsl(47, 85%, 84%)'} ${songProgressPercent}%, #e8e8ed ${songProgressPercent}%, #e8e8ed 100%)`,
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
                            { label: 'Rhythmus & Timing', value: rhythmVal, type: 'rhythm', color: '#000000' },
                            { label: 'Finger & Technik', value: fingerVal, type: 'finger', color: '#000000' },
                            { label: 'Ausdruck & Performance', value: expressionVal, type: 'expression', color: '#000000' }
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
                                  } else {
                                    setStatus('MASTERED');
                                    setIsCurrentHomework(false);
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

                      {/* Claim Mastery Sticker Button */}
                      {(() => {
                        const skill = activeSongSkills.find(s => s.id === selectedActiveSongId);
                        const songTitle = skill?.songs?.title || '';
                        const songMasterInfo = collectedStickers['song-master'];
                        const isSongMasterStickerAwarded = songTitle && songMasterInfo?.details.some(
                          d => d.topic.toLowerCase().trim() === songTitle.toLowerCase().trim()
                        );
                        
                        if ((songProgressPercent === 100 || status === 'MASTERED') && songTitle && !isSongMasterStickerAwarded) {
                          return (
                            <button
                              type="button"
                              onClick={() => awardSticker('song-master', songTitle)}
                              style={{
                                marginTop: '12px',
                                width: '100%',
                                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                                color: 'white',
                                border: 'none',
                                padding: '10px 16px',
                                borderRadius: '20px',
                                fontWeight: 'bold',
                                fontSize: '0.82rem',
                                cursor: 'pointer',
                                boxShadow: '0 4px 15px rgba(245, 158, 11, 0.25)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                transition: 'all 0.15s ease'
                              }}
                              className="hover-scale"
                            >
                              <span>🏆 Neuen Sticker erhalten</span>
                            </button>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </div>
                );
              })()
            ) : (
              <>
                {/* Hub-view inner scrollable area */}
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px', padding: '24px', paddingBottom: '12px' }}>
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

                {(() => {
                    const activeSongs = activeSongSkills.filter(skill =>
                      !skill.is_stage_ready && (skill.progress_percent || 0) < 100
                    );
                    if (activeSongs.length === 0) return (
                      <div style={{ padding: '40px 16px', textAlign: 'center', border: '2px dashed #e8e8ed', borderRadius: '24px', color: '#7d7d82', fontSize: '0.82rem', fontWeight: 600 }}>
                        Keine aktiven Songs eingetragen.
                      </div>
                    );
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {activeSongs.map(skill => {
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
                                  background: (skill.is_stage_ready || progress === 100) ? 'hsl(130, 65%, 82%)' : 'hsl(47, 85%, 84%)',
                                  transition: 'width 0.3s ease'
                                }} />
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    </div>
                  );
                })()}

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
                </div>{/* close inner scrollable div */}

                {/* Meisterwerke & Sticker-Album Buttons - pinned at bottom */}
                <div style={{ padding: '12px 24px 24px 24px', display: 'flex', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setActiveModalTab('logbook')}
                    style={{
                      flex: 1, padding: '14px', borderRadius: '14px', border: 'none',
                      background: '#456355', color: 'white', fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer',
                      boxShadow: '0 4px 10px rgba(69, 99, 85, 0.2)',
                      transition: 'all 0.15s ease',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                    }}
                    className="hover-scale"
                  >
                    <Award size={15} />
                    Deine Meisterwerke
                  </button>
                  {isCampusActive && (
                    <button
                      type="button"
                      onClick={() => setActiveModalTab('stickeralbum')}
                      style={{
                        flex: 1, padding: '14px', borderRadius: '14px', border: 'none',
                        background: '#d97706', color: 'white', fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer',
                        boxShadow: '0 4px 10px rgba(217, 119, 6, 0.2)',
                        transition: 'all 0.15s ease',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                      }}
                      className="hover-scale"
                    >
                      <Star size={15} fill="#fff" />
                      Sticker-Album
                    </button>
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
                  item.updated_at && getItemWeek(item) === selectedHistoryWeek
                );

                // Group page numbers by book title
                const groupedLehrwerke: Record<string, { pages: number[] }> = {};
                const otherHWs: any[] = [];
                const allActive = weekItems.filter(item => 
                  (item.is_current_homework || item.status === 'THEORY_DONE') && 
                  !item.topic_name.startsWith('Hausaufgabe KW ')
                );

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

                // Sort pages for each textbook in ascending order
                Object.keys(groupedLehrwerke).forEach(title => {
                  groupedLehrwerke[title].pages.sort((a, b) => a - b);
                });

                // Extract unique non-empty homework notes
                const uniqueHomeworkNotes: string[] = [];
                weekItems.forEach(item => {
                  if (item.homework_notes && item.homework_notes.trim() !== '') {
                    try {
                      const parsed = JSON.parse(item.homework_notes);
                      if (Array.isArray(parsed)) {
                        parsed.forEach((n: string) => {
                          if (n.trim() !== '' && !n.startsWith('AUDIO:') && !n.startsWith('STICKER:') && !uniqueHomeworkNotes.includes(n.trim())) {
                            uniqueHomeworkNotes.push(n.trim());
                          }
                        });
                      } else if (typeof parsed === 'string' && parsed.trim() !== '' && !parsed.startsWith('AUDIO:') && !parsed.startsWith('STICKER:') && !uniqueHomeworkNotes.includes(parsed.trim())) {
                        uniqueHomeworkNotes.push(parsed.trim());
                      }
                    } catch (e) {
                      const trimmed = item.homework_notes.trim();
                      if (!trimmed.startsWith('AUDIO:') && !trimmed.startsWith('STICKER:') && !uniqueHomeworkNotes.includes(trimmed)) {
                        uniqueHomeworkNotes.push(trimmed);
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
                                <div style={{ 
                                  fontSize: '0.92rem', 
                                  color: '#09090b', 
                                  fontWeight: 900,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px'
                                }}>
                                  {(() => {
                                    const bookColor = getLehrwerkColor(title);
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
                                  <span>{title}</span> · <span style={{ color: '#4b5563', fontWeight: 700 }}>S. {info.pages.join(', ')}</span>
                                </div>
                                {(() => {
                                  const bookObj = globalLehrwerke.find(b => b.title === title);
                                  const assignedBook = bookObj ? assignedLehrwerke.find(a => a.lehrwerkId === bookObj.id) : null;
                                  if (!assignedBook) return null;
                                  
                                  const pagesWithNotes = info.pages.filter((p: number) => {
                                    const pState = assignedBook.pageStates?.[p];
                                    if (pState && getCleanPageNotes(pState.homeworkNotes || pState.homework_notes) !== '') return true;
                                    
                                    const dbItem = weekItems.find(x => x.topic_name === `${title} - Seite ${p}`);
                                    if (dbItem && getCleanPageNotes(dbItem.homework_notes) !== '') return true;
                                    return false;
                                  });
                                  
                                  if (pagesWithNotes.length === 0) return null;
                                  
                                  return (
                                    <div style={{
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: '4px',
                                      padding: '8px 12px',
                                      background: '#ffffff',
                                      border: '1px solid rgba(251, 191, 36, 0.15)',
                                      borderRadius: '12px',
                                      marginTop: '6px',
                                      marginLeft: '22px',
                                      boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)'
                                    }}>
                                      {pagesWithNotes.map((p: number) => {
                                        const pState = assignedBook.pageStates?.[p];
                                        let noteText = getCleanPageNotes(pState?.homeworkNotes || pState?.homework_notes);
                                        
                                        if (!noteText) {
                                          const dbItem = weekItems.find(x => x.topic_name === `${title} - Seite ${p}`);
                                          if (dbItem?.homework_notes) {
                                            noteText = getCleanPageNotes(dbItem.homework_notes);
                                          }
                                        }
                                        
                                        return (
                                          <div key={`p-note-${p}`} style={{ display: 'flex', gap: '6px', alignItems: 'flex-start', fontSize: '0.74rem', color: '#475569', lineHeight: '1.4' }}>
                                            <span style={{ fontWeight: 800, color: '#b45309', flexShrink: 0 }}>S. {p}:</span>
                                            <span style={{ fontWeight: 650, color: '#1e293b' }}>{noteText}</span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  );
                                })()}
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
                          { label: '⏱️ Tempo halten', text: 'Achte diese Woche besonders darauf, das Metronom bei X BPM zu halten.', hasPrompt: true },
                          { label: '✨ Sauber spielen', text: 'Achte auf eine präzise Ausführung und einen sauberen, klaren Klang.' },
                          { label: '🥁 Rhythmus-Metronom', text: 'Achte auf ein stabiles Rhythmus-Metronom und spiele genau auf den Schlag.' },
                          { label: '🖖 Fingersatz üben', text: 'Achte darauf, den vorgegebenen Fingersatz genau einzuhalten und zu üben.' }
                        ].map((tpl, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => {
                              let text = tpl.text;
                              if (tpl.hasPrompt) {
                                const bpm = prompt("Geben Sie die BPM-Zahl ein:", "120");
                                const bpmText = bpm ? `${bpm} BPM` : "X BPM";
                                text = `Achte diese Woche besonders darauf, das Metronom bei ${bpmText} zu halten.`;
                              }
                              setHomeworkNotes(prev => prev ? `${prev}\n\n${text}` : text);
                              setIsCurrentHomework(true);
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



                    {/* Live Preview Box */}
                    <div style={{
                      marginTop: '12px',
                      background: 'rgba(251, 191, 36, 0.05)',
                      border: '1.5px dashed rgba(251, 191, 36, 0.3)',
                      borderRadius: '16px',
                      padding: '12px 16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>👁️ Live-Vorschau (im Hausaufgaben-Widget):</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ fontSize: '0.86rem', color: '#09090b', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {(() => {
                            const book = globalLehrwerke.find(b => b.id === activeLehrwerkId);
                            const bookColor = getLehrwerkColor(book?.title || '');
                            return (
                              <div style={{
                                width: '14px',
                                height: '18px',
                                background: `linear-gradient(135deg, ${bookColor.from}, ${bookColor.to})`,
                                borderRadius: '3px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                              }}>
                                <BookOpen size={8} color={bookColor.text} />
                              </div>
                            );
                          })()}
                          <span>{globalLehrwerke.find(b => b.id === activeLehrwerkId)?.title}</span> · <span style={{ color: '#4b5563', fontWeight: 700 }}>S. {activePageNumber}</span>
                        </div>
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          background: '#ffffff',
                          color: '#475569',
                          padding: '4px 10px 4px 12px',
                          borderRadius: '999px',
                          fontSize: '0.74rem',
                          fontWeight: 900,
                          border: '1px solid rgba(251, 191, 36, 0.3)',
                          boxShadow: '0 3px 8px rgba(0,0,0,0.03), 0 0 12px rgba(251, 191, 36, 0.2)',
                          alignSelf: 'flex-start'
                        }}>
                          <span>📄 S. {activePageNumber}</span>
                        </div>
                        <div style={{ 
                          display: 'flex', 
                          gap: '6px', 
                          alignItems: 'flex-start', 
                          fontSize: '0.74rem', 
                          color: '#475569', 
                          lineHeight: '1.4',
                          background: '#ffffff',
                          border: '1px solid rgba(251, 191, 36, 0.15)',
                          borderRadius: '12px',
                          padding: '8px 12px',
                          marginTop: '2px',
                          boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)'
                        }}>
                          <span style={{ fontWeight: 800, color: '#b45309', flexShrink: 0 }}>S. {activePageNumber}:</span>
                          <span style={{ fontWeight: 650, color: homeworkNotes.trim() ? '#1e293b' : '#94a3b8', fontStyle: homeworkNotes.trim() ? 'normal' : 'italic', whiteSpace: 'pre-wrap' }}>
                            {homeworkNotes.trim() || 'Keine Hausaufgabe eingetragen'}
                          </span>
                        </div>
                      </div>
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
                             { mode: 'LOCKED', color: 'hsl(355, 75%, 84%)', label: 'Rot (unbearbeitet)', getActive: () => status === 'IN_PROGRESS' && !isCurrentHomework, action: () => { setStatus('IN_PROGRESS'); setIsCurrentHomework(false); setSongProgressPercent(25); setRhythmVal(25); setFingerVal(25); setExpressionVal(25); setHasChanges(true); if (selectedActiveSongId) triggerDirectSongSave(selectedActiveSongId, 'IN_PROGRESS', false); } },
                             { mode: 'HOMEWORK', color: 'hsl(47, 85%, 84%)', label: 'Gelb (Hausaufgabe)', getActive: () => status === 'IN_PROGRESS' && isCurrentHomework, action: () => { setStatus('IN_PROGRESS'); setIsCurrentHomework(true); setSongProgressPercent(25); setRhythmVal(25); setFingerVal(25); setExpressionVal(25); setHasChanges(true); if (selectedActiveSongId) triggerDirectSongSave(selectedActiveSongId, 'IN_PROGRESS', true); } },
                             { mode: 'MASTERED', color: 'hsl(130, 65%, 82%)', label: 'Grün (erledigt)', getActive: () => status === 'MASTERED', action: () => { setStatus('MASTERED'); setIsCurrentHomework(false); setSongProgressPercent(100); setRhythmVal(100); setFingerVal(100); setExpressionVal(100); setHasChanges(true); if (selectedActiveSongId) triggerDirectSongSave(selectedActiveSongId, 'MASTERED', false); } }
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
                        const existingWeeks = progressItems
                          .filter(item => item.updated_at)
                          .map(item => getItemWeek(item))
                          .filter(Boolean);
                        let weeks: string[] = [];
                        if (existingWeeks.length > 0) {
                          const sortedExisting = [...existingWeeks].sort();
                          const earliestWeek = sortedExisting[0];
                          const currentWeek = getISOWeek();
                          const latestExisting = sortedExisting[sortedExisting.length - 1];
                          const endWeek = currentWeek > latestExisting ? currentWeek : latestExisting;
                          weeks = getWeeksBetween(earliestWeek, endWeek);
                        } else {
                          weeks = [getISOWeek()];
                        }
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
                        border: isNotesExpanded ? 'none' : '1px solid #fef08a',
                        borderRadius: '16px',
                        padding: isNotesExpanded ? '0px' : '14px 16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: isNotesExpanded ? '0px' : '12px',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)',
                        maxHeight: isNotesExpanded ? '0px' : '1200px',
                        opacity: isNotesExpanded ? 0 : 1,
                        overflow: 'hidden',
                        marginTop: isNotesExpanded ? '-16px' : '0px',
                        transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)'
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
                            // Deduplicate progressItems by topic_name (latest wins)
                            const uniqueItemsMap = new Map<string, any>();
                            (progressItems || []).forEach(item => {
                              const name = (item.topic_name || '').trim().toLowerCase();
                              if (name && !uniqueItemsMap.has(name)) {
                                uniqueItemsMap.set(name, item);
                              }
                            });
                            const deduplicatedItems = Array.from(uniqueItemsMap.values());

                            const currentWeek = getISOWeek();
                            const activeHWs = deduplicatedItems.filter(item => {
                              if (item.topic_name.includes(' - Seite ')) {
                                const parts = item.topic_name.split(' - Seite ');
                                const bookTitle = parts[0].trim();
                                const pageNum = parseInt(parts[1], 10);
                                const book = globalLehrwerke.find(g => g.title === bookTitle);
                                if (book) {
                                  const assignment = assignedLehrwerke.find(a => a.lehrwerkId === book.id);
                                  const pageState = assignment?.pageStates?.[pageNum];
                                  return pageState?.status === 'homework';
                                }
                              }
                              return item.is_current_homework && !item.topic_name.startsWith('Hausaufgabe KW ');
                            });
                            const activeTheories = deduplicatedItems.filter(item => {
                              if (item.topic_name.includes(' - Seite ')) {
                                const parts = item.topic_name.split(' - Seite ');
                                const bookTitle = parts[0].trim();
                                const pageNum = parseInt(parts[1], 10);
                                const book = globalLehrwerke.find(g => g.title === bookTitle);
                                if (book) {
                                  const assignment = assignedLehrwerke.find(a => a.lehrwerkId === book.id);
                                  const pageState = assignment?.pageStates?.[pageNum];
                                  return pageState?.status === 'purple';
                                }
                              }
                              return item.status === 'THEORY_DONE' && 
                                     item.updated_at && 
                                     getISOWeek(item.updated_at) === currentWeek &&
                                     !item.topic_name.startsWith('Hausaufgabe KW ');
                            });
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
                                
                                // Only include if the book is assigned to this student
                                const book = globalLehrwerke.find(g => g.title === bookTitle);
                                const isBookAssigned = book && assignedLehrwerke.some(a => a.lehrwerkId === book.id);
                                if (!isBookAssigned) return;

                                const pageNum = parseInt(parts[1], 10);
                                if (!groupedLehrwerke[bookTitle]) {
                                  groupedLehrwerke[bookTitle] = { pages: [] };
                                }
                                if (!isNaN(pageNum) && !groupedLehrwerke[bookTitle].pages.includes(pageNum)) {
                                  groupedLehrwerke[bookTitle].pages.push(pageNum);
                                }
                              } else {
                                const cleanTopic = item.topic_name.replace(/\s*\([^)]*\)\s*$/, '');
                                if (!otherHWs.some(existing => existing.topic_name.replace(/\s*\([^)]*\)\s*$/, '') === cleanTopic)) {
                                  otherHWs.push(item);
                                }
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
                                            {original?.id && (
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
                                    {(() => {
                                      const bookObj = globalLehrwerke.find(b => b.title === item.title);
                                      const assignedBook = bookObj ? assignedLehrwerke.find(a => a.lehrwerkId === bookObj.id) : null;
                                      if (!assignedBook) return null;
                                      
                                      const pagesWithNotes = item.pages.filter((p: number) => {
                                        const pState = assignedBook.pageStates?.[p];
                                        if (pState && getCleanPageNotes(pState.homeworkNotes || pState.homework_notes) !== '') return true;
                                        
                                        const dbItem = allActive.find(x => x.topic_name === `${item.title} - Seite ${p}`);
                                        if (dbItem && getCleanPageNotes(dbItem.homework_notes) !== '') return true;
                                        return false;
                                      });
                                      
                                      if (pagesWithNotes.length === 0) return null;
                                      
                                      return (
                                        <div style={{
                                          display: 'flex',
                                          flexDirection: 'column',
                                          gap: '4px',
                                          padding: '8px 12px',
                                          background: '#ffffff',
                                          border: '1px solid rgba(251, 191, 36, 0.15)',
                                          borderRadius: '12px',
                                          marginTop: '6px',
                                          boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)'
                                        }}>
                                          {pagesWithNotes.map((p: number) => {
                                            const pState = assignedBook.pageStates?.[p];
                                            let noteText = getCleanPageNotes(pState?.homeworkNotes || pState?.homework_notes);
                                            
                                            if (!noteText) {
                                              const dbItem = allActive.find(x => x.topic_name === `${item.title} - Seite ${p}`);
                                              if (dbItem?.homework_notes) {
                                                noteText = getCleanPageNotes(dbItem.homework_notes);
                                              }
                                            }
                                            
                                            return (
                                              <div key={`p-note-${p}`} style={{ display: 'flex', gap: '6px', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.74rem', color: '#475569', lineHeight: '1.4' }}>
                                                <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-start', flex: 1 }}>
                                                  <span style={{ fontWeight: 800, color: '#b45309', flexShrink: 0 }}>S. {p}:</span>
                                                  <span style={{ fontWeight: 650, color: '#1e293b' }}>{noteText}</span>
                                                </div>
                                                <button
                                                  type="button"
                                                  onClick={() => handleDeletePageNote(item.title, p)}
                                                  style={{
                                                    border: 'none',
                                                    background: 'none',
                                                    color: '#ef4444',
                                                    cursor: 'pointer',
                                                    fontSize: '0.7rem',
                                                    fontWeight: 800,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    padding: '2px',
                                                    marginLeft: '6px',
                                                    flexShrink: 0
                                                  }}
                                                >
                                                  ✕
                                                </button>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      );
                                    })()}
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
                                          <span>🎵 {item.topic_name.replace(/\s*\([^)]*\)\s*$/, '')}</span>
                                          {item.id && (
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

                                {(() => {
                                  const visibleNotes = homeworkNotesList.filter(note => !note.startsWith("STICKER:"));
                                  if (visibleNotes.length === 0) return null;

                                  const audioNotes = homeworkNotesList.map((note, idx) => ({ note, idx })).filter(item => item.note.startsWith("AUDIO:"));
                                  const textNotes = homeworkNotesList.map((note, idx) => ({ note, idx })).filter(item => !item.note.startsWith("AUDIO:") && !item.note.startsWith("STICKER:"));

                                  return (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid rgba(251, 191, 36, 0.2)', paddingTop: '8px', marginTop: '4px' }}>
                                      <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                        Bemerkungen & Hinweise
                                      </span>
                                      
                                      {/* Audio Notes (Cassettes) side-by-side */}
                                      {audioNotes.length > 0 && (
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '4px', marginBottom: textNotes.length > 0 ? '6px' : '2px' }}>
                                          {audioNotes.map((item, index) => {
                                            const parts = item.note.substring(6).split('|');
                                            return (
                                              <div key={item.idx} style={{ position: 'relative', display: 'inline-block' }}>
                                                <InlineAudioPlayer 
                                                  url={parts[0]} 
                                                  label={`Play-Along #${index + 1}`}
                                                />
                                                <button
                                                  type="button"
                                                  onClick={() => handleDeleteNote(item.idx)}
                                                  style={{
                                                    position: 'absolute',
                                                    top: '-4px',
                                                    right: '-4px',
                                                    width: '18px',
                                                    height: '18px',
                                                    borderRadius: '50%',
                                                    background: '#ef4444',
                                                    color: 'white',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    fontSize: '9px',
                                                    fontWeight: 900,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                                                    zIndex: 20
                                                  }}
                                                >
                                                  ✕
                                                </button>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      )}

                                      {/* Text Notes stacked vertically */}
                                      {textNotes.length > 0 && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                          {textNotes.map((item) => (
                                            <div key={item.idx} style={{
                                              display: 'flex',
                                              alignItems: 'center',
                                              justifyContent: 'space-between',
                                              background: '#ffffff',
                                              border: '1px solid rgba(251, 191, 36, 0.15)',
                                              padding: '8px 12px',
                                              borderRadius: '12px',
                                              fontSize: '0.76rem',
                                              fontWeight: 650,
                                              color: '#1e293b',
                                              lineHeight: '1.4',
                                              boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)'
                                            }}>
                                              <div style={{ flex: 1, paddingRight: '8px' }}>
                                                {item.note}
                                              </div>
                                              <button
                                                type="button"
                                                onClick={() => handleDeleteNote(item.idx)}
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
                                                  alignSelf: 'center'
                                                }}
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
                            );
                          })()}
                        </div>
                      </div>

                      {/* General homework text notes */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>
                              📝 Zusätzliche Hausaufgaben-Bemerkungen
                            </label>
                            <button
                              type="button"
                              onClick={toggleSpeechRecognition}
                              style={{
                                background: isListening ? '#ef4444' : '#f1f5f9',
                                color: isListening ? 'white' : '#475569',
                                border: 'none',
                                padding: '4px 8px',
                                borderRadius: '12px',
                                fontSize: '0.7rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                transition: 'all 0.2s'
                              }}
                              title={isListening ? "Aufnahme stoppen..." : "Diktieren (Speech-to-AI)"}
                            >
                              <span>🎤</span>
                              <span>{isListening ? "Stopp..." : "Diktieren"}</span>
                            </button>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {isNotesExpanded && (
                              <button
                                type="button"
                                onClick={handleAddNote}
                                disabled={saving || !homeworkNotes.trim()}
                                style={{
                                  background: homeworkNotes.trim() ? '#456355' : '#cbd5e1',
                                  color: homeworkNotes.trim() ? 'white' : '#94a3b8',
                                  border: 'none',
                                  padding: '5px 10px',
                                  borderRadius: '8px',
                                  fontSize: '0.68rem',
                                  fontWeight: 800,
                                  cursor: homeworkNotes.trim() ? 'pointer' : 'not-allowed',
                                  boxShadow: homeworkNotes.trim() ? '0 2px 6px rgba(69, 99, 85, 0.15)' : 'none',
                                  transition: 'all 0.15s'
                                }}
                                className="hover-scale save-note-btn"
                              >
                                {saving ? 'Speichert...' : 'Bemerkung speichern'}
                              </button>
                            )}
                            {isNotesExpanded && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (homeworkNotes.trim()) {
                                    setHomeworkNotes('');
                                    setHasChanges(true);
                                  }
                                  setIsNotesFocused(false);
                                  if (document.activeElement instanceof HTMLElement) {
                                    document.activeElement.blur();
                                  }
                                }}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: '#64748b',
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  padding: '2px 6px'
                                }}
                              >
                                {homeworkNotes.trim() ? 'Entfernen' : 'Minimieren'}
                              </button>
                            )}
                          </div>
                        </div>
                        <textarea
                          placeholder="Trage hier zusätzliche Bemerkungen zur Hausaufgabe ein..."
                          value={homeworkNotes}
                          onChange={(e) => {
                            setHomeworkNotes(e.target.value);
                            setHasChanges(true);
                          }}
                          onFocus={() => setIsNotesFocused(true)}
                          onBlur={() => {
                            setTimeout(() => {
                              const activeEl = document.activeElement;
                              if (activeEl && (
                                activeEl.closest('.preset-btn') || 
                                activeEl.closest('.save-note-btn')
                              )) {
                                return;
                              }
                              setIsNotesFocused(false);
                            }, 200);
                          }}
                          style={{
                            width: '100%',
                            height: isNotesExpanded ? '280px' : '90px',
                            padding: '12px 14px',
                            borderRadius: '16px',
                            border: '1px solid #cbd5e1',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            outline: 'none',
                            resize: 'none',
                            background: 'white',
                            transition: 'height 0.35s cubic-bezier(0.4, 0, 0.2, 1)'
                          }}
                        />
                        {/* Schnellbaukasten Presets */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
                          <span style={{ fontSize: '0.68rem', fontWeight: 850, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                            ⚡ Schnellbaukasten Presets (Aktiviert Hausaufgabe):
                          </span>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))', gap: '6px' }}>
                            <button
                              type="button"
                              onClick={() => {
                                const bpm = prompt("Geben Sie die BPM-Zahl ein:", "120");
                                const bpmText = bpm ? `${bpm} BPM` : "X BPM";
                                const text = `Achte diese Woche besonders darauf, das Metronom bei ${bpmText} zu halten.`;
                                setHomeworkNotes(prev => prev ? `${prev}\n\n${text}` : text);
                                setIsCurrentHomework(true);
                                setHasChanges(true);
                              }}
                              style={{
                                background: '#f8fafc', color: '#1e293b', border: '1px solid #cbd5e1',
                                padding: '8px 10px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer',
                                display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px', textAlign: 'left',
                                transition: 'all 0.15s'
                              }}
                              className="hover-scale preset-btn"
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span>⏱️</span>
                                <span style={{ fontWeight: 800 }}>Tempo halten</span>
                              </div>
                              <span style={{ fontSize: '0.6rem', color: '#64748b' }}>Metronom BPM</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                const text = "Achte auf eine präzise Ausführung und einen sauberen, klaren Klang.";
                                setHomeworkNotes(prev => prev ? `${prev}\n\n${text}` : text);
                                setIsCurrentHomework(true);
                                setHasChanges(true);
                              }}
                              style={{
                                background: '#f8fafc', color: '#1e293b', border: '1px solid #cbd5e1',
                                padding: '8px 10px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer',
                                display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px', textAlign: 'left',
                                transition: 'all 0.15s'
                              }}
                              className="hover-scale preset-btn"
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span>✨</span>
                                <span>Sauber spielen</span>
                              </div>
                              <span style={{ fontSize: '0.6rem', color: '#64748b' }}>Klarer Klang</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                const text = "Achte auf ein stabiles Rhythmus-Metronom und spiele genau auf den Schlag.";
                                setHomeworkNotes(prev => prev ? `${prev}\n\n${text}` : text);
                                setIsCurrentHomework(true);
                                setHasChanges(true);
                              }}
                              style={{
                                background: '#f8fafc', color: '#1e293b', border: '1px solid #cbd5e1',
                                padding: '8px 10px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer',
                                display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px', textAlign: 'left',
                                transition: 'all 0.15s'
                              }}
                              className="hover-scale preset-btn"
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span>🥁</span>
                                <span style={{ fontWeight: 800 }}>Rhythmus-Metronom</span>
                              </div>
                              <span style={{ fontSize: '0.6rem', color: '#64748b' }}>Timing & Takt</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                const text = "Achte darauf, den vorgegebenen Fingersatz genau einzuhalten und zu üben.";
                                setHomeworkNotes(prev => prev ? `${prev}\n\n${text}` : text);
                                setIsCurrentHomework(true);
                                setHasChanges(true);
                              }}
                              style={{
                                background: '#f8fafc', color: '#1e293b', border: '1px solid #cbd5e1',
                                padding: '8px 10px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer',
                                display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px', textAlign: 'left',
                                transition: 'all 0.15s'
                              }}
                              className="hover-scale preset-btn"
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span>🖖</span>
                                <span style={{ fontWeight: 800 }}>Fingersatz üben</span>
                              </div>
                              <span style={{ fontSize: '0.6rem', color: '#64748b' }}>Fingersatz einhalten</span>
                            </button>
                          </div>
                        </div>

                        {/* Schnell-Textbausteine */}
                        {/* Schnell-Textbausteine & Submit button side-by-side */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginTop: '6px' }}>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                            {textbausteine
                              .filter((tb: any) => tb.active)
                              .map((tpl, i) => (
                              <button
                                key={tpl.id || i}
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
                        </div>
                      </div>

                        {/* Audio Play-Along Cassette Widget */}
                        {isCampusActive && (
                          <div style={{
                            margin: '12px 0',
                            padding: '16px',
                            background: '#f8fafc',
                            border: '1px solid #cbd5e1',
                            borderRadius: '20px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px'
                          }}>
                            {(() => {
                              const currentWeek = getISOWeek();
                              const audios = homeworkNotesList
                                .map((note, originalIdx) => ({ note, originalIdx }))
                                .filter(item => item.note.startsWith("AUDIO:"))
                                .map(item => {
                                  const parts = item.note.substring(6).split('|');
                                  return {
                                    url: parts[0],
                                    duration: parseInt(parts[1] || '0', 10),
                                    date: parts[2],
                                    originalIdx: item.originalIdx
                                  };
                                });
                              const currentWeekAudios = audios.filter(aud => {
                                if (!aud.date) return false;
                                return getISOWeek(aud.date) === currentWeek;
                              });
                              const isLimitReached = currentWeekAudios.length >= 1;

                              return (
                                <>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <span>📼</span> Play-Along Aufnahme (max. 60s)
                                    </span>
                                    {!isRecordingAudio ? (
                                      <button
                                        type="button"
                                        onClick={startRecordingAudio}
                                        disabled={isUploadingAudio || isLimitReached}
                                        style={{
                                          background: isLimitReached ? '#94a3b8' : '#000',
                                          color: '#fff',
                                          border: 'none',
                                          padding: '6px 12px',
                                          borderRadius: '12px',
                                          fontSize: '0.72rem',
                                          fontWeight: 800,
                                          cursor: isLimitReached ? 'not-allowed' : 'pointer',
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '4px'
                                        }}
                                      >
                                        🔴 Aufnahme starten
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => stopRecordingAudio()}
                                        style={{
                                          background: '#ef4444',
                                          color: '#fff',
                                          border: 'none',
                                          padding: '6px 12px',
                                          borderRadius: '12px',
                                          fontSize: '0.72rem',
                                          fontWeight: 800,
                                          cursor: 'pointer',
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '4px'
                                        }}
                                      >
                                        ⏹️ Stopp ({audioDuration}s / 60s)
                                      </button>
                                    )}
                                  </div>

                                  {isLimitReached && (
                                    <div style={{ fontSize: '0.74rem', color: '#ef4444', fontWeight: 800, marginTop: '2px' }}>
                                      ⚠️ Maximale Anzahl an Aufnahmen (1) für diese Kalenderwoche erreicht. Lösche die alte Aufnahme der aktuellen Woche, um eine neue zu machen.
                                    </div>
                                  )}

                                  {isUploadingAudio && (
                                    <div style={{ fontSize: '0.74rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <span>⏳</span> Lade Audio-Feedback hoch...
                                    </div>
                                  )}

                                  {/* Render Cassette Players for recorded audios */}
                                  {audios.length > 0 && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '6px' }}>
                                      {audios.map((aud, aIdx) => (
                                        <RetroCassettePlayer 
                                          key={aIdx} 
                                          url={aud.url} 
                                          duration={aud.duration} 
                                          index={aIdx} 
                                          onDelete={() => handleDeleteNote(aud.originalIdx)}
                                        />
                                      ))}
                                    </div>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        )}

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
      ) : activeModalTab === 'stickeralbum' && isCampusActive ? (
        /* STICKER SAMMELALBUM VIEW */
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
          
          <button
            type="button"
            onClick={() => { setActiveModalTab('document'); setActiveSubView('hub'); }}
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
              Sticker Sammelalbum
            </span>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: '20px',
            width: '100%'
          }}>
            {ALL_STICKERS.map(st => {
              const info = collectedStickers[st.id] || { count: 0, details: [] };
              const isCollected = info.count > 0;
              return (
                <div
                  key={st.id}
                  style={{
                    background: isCollected ? 'white' : 'rgba(241, 245, 249, 0.6)',
                    border: isCollected ? `2px solid ${st.color}` : '2px dashed #cbd5e1',
                    borderRadius: '24px',
                    padding: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    gap: '12px',
                    opacity: isCollected ? 1 : 0.6,
                    boxShadow: isCollected ? '0 10px 25px rgba(0,0,0,0.05)' : 'none',
                    transition: 'all 0.3s ease',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  {st.id !== 'song-master' && !st.auto && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const context = prompt(`Beschreibung für den Sticker "${st.title}" eingeben (z.B. Name des Auftritts):`);
                        if (context !== null) {
                          awardSticker(st.id, context || undefined);
                        }
                      }}
                      style={{
                        position: 'absolute',
                        top: '12px',
                        left: '12px',
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: st.color,
                        color: 'white',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        boxShadow: '0 2px 5px rgba(0,0,0,0.15)',
                        zIndex: 10,
                        fontWeight: 'bold',
                        fontSize: '1rem'
                      }}
                      title="Sticker manuell vergeben"
                      className="hover-scale"
                    >
                      +
                    </button>
                  )}

                  {isCollected && (
                    <div style={{
                      position: 'absolute',
                      top: '12px',
                      right: '12px',
                      background: st.color,
                      color: 'white',
                      fontWeight: 900,
                      fontSize: '0.75rem',
                      padding: '4px 10px',
                      borderRadius: '12px',
                      boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
                    }}>
                      x{info.count}
                    </div>
                  )}

                  {/* Icon / Badge Container */}
                  <div style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    background: isCollected ? st.bg : '#e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '2.5rem',
                    border: isCollected ? `2px solid ${st.color}` : '2px solid transparent',
                    filter: isCollected ? 'none' : 'grayscale(100%)',
                    boxShadow: isCollected ? `0 8px 20px ${st.bg}` : 'none',
                    transition: 'all 0.3s ease'
                  }}>
                    {st.emoji}
                  </div>

                  <div>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '0.94rem', fontWeight: 900, color: '#0f172a' }}>
                      {st.title}
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.74rem', color: '#64748b', fontWeight: 600, lineHeight: '1.4' }}>
                      {st.desc}
                    </p>
                  </div>

                  {isCollected && (
                    <div style={{
                      width: '100%',
                      borderTop: '1px solid #f1f5f9',
                      paddingTop: '10px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      alignItems: 'flex-start',
                      maxHeight: '120px',
                      overflowY: 'auto'
                    }}>
                      <span style={{ fontSize: '0.66rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>
                        Verlauf:
                      </span>
                      {info.details.map((dt, dIdx) => (
                        <div key={dIdx} style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: '0.68rem', color: '#475569', fontWeight: 650 }}>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '170px' }}>{dt.topic}</span>
                          <span style={{ color: '#94a3b8' }}>{dt.date}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
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
          <button
            type="button"
            onClick={() => { setActiveModalTab('document'); setActiveSubView('hub'); }}
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
              Deine Meisterwerke
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
                    masteredSongs.map((skill, idx) => {
                      const songColor = getSongColor(skill.songs?.title || 'Song');
                      return (
                        <div key={`m-song-${idx}`} style={{
                          background: 'white',
                          border: '1px solid #e2e8f0',
                          borderRadius: '20px',
                          padding: '12px 18px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '14px',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                        }}>
                          {/* Cover + Vinyl */}
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

                          {/* Content in a single line */}
                          <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                            <div style={{
                              fontSize: '0.86rem',
                              color: '#0f172a',
                              fontWeight: 900,
                              letterSpacing: '-0.02em',
                              fontFamily: '"Helvetica Neue", Helvetica, Inter, Arial, sans-serif',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}>
                              {skill.songs?.artist} - {skill.songs?.title}
                            </div>
                            <span style={{ fontSize: '0.72rem', background: '#f1f5f9', color: '#334155', padding: '3px 8px', borderRadius: '8px', fontWeight: 800, border: '1px solid #e2e8f0', flexShrink: 0 }}>
                              {skill.instrument}
                            </span>
                          </div>
                        </div>
                      );
                    })
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
                    masteredBooksList.map((item, idx) => {
                      const bookColor = getLehrwerkColor(item.title);
                      return (
                        <div key={`m-lw-${idx}`} style={{
                          background: 'white',
                          border: '1px solid #e2e8f0',
                          borderRadius: '20px',
                          padding: '12px 18px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '14px',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                        }}>
                          {/* Gradient cover book */}
                          <div style={{
                            width: '34px',
                            height: '44px',
                            background: `linear-gradient(135deg, ${bookColor.from}, ${bookColor.to})`,
                            borderRadius: '4px',
                            position: 'relative',
                            boxShadow: '0 3px 6px rgba(0,0,0,0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            <BookOpen size={16} color={bookColor.text} />
                            <div style={{
                              position: 'absolute',
                              left: 0,
                              top: 0,
                              bottom: 0,
                              width: '3px',
                              background: 'rgba(0,0,0,0.12)',
                              borderRight: '1px solid rgba(255,255,255,0.08)'
                            }} />
                          </div>

                          {/* Content in a single line */}
                          <div style={{
                            fontSize: '0.86rem',
                            color: '#0f172a',
                            fontWeight: 900,
                            letterSpacing: '-0.02em',
                            fontFamily: '"Helvetica Neue", Helvetica, Inter, Arial, sans-serif',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>
                            {item.title} - <span style={{ color: '#475569', fontWeight: 700 }}>S. {item.pages.join(', ')}</span>
                          </div>
                        </div>
                      );
                    })
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
                          if (activeBrush !== 'NONE') {
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
                            selectTextbookPage(assigned.lehrwerkId, num, targetStatus, targetHomework);
                            return;
                          }

                          const now = Date.now();
                          if (lastClickRef.current && lastClickRef.current.pageNum === num && (now - lastClickRef.current.timestamp) < 250) {
                            if (clickTimeoutRef.current) {
                              clearTimeout(clickTimeoutRef.current);
                              clickTimeoutRef.current = null;
                            }
                            lastClickRef.current = null;
                            handlePageDoubleClick(assigned.lehrwerkId, num);
                            setShowAllPagesGrid(false);
                          } else {
                            lastClickRef.current = { pageNum: num, timestamp: now };
                            if (clickTimeoutRef.current) {
                              clearTimeout(clickTimeoutRef.current);
                            }
                            clickTimeoutRef.current = setTimeout(() => {
                              clickTimeoutRef.current = null;
                              lastClickRef.current = null;
                              selectTextbookPage(assigned.lehrwerkId, num);
                              setShowAllPagesGrid(false);
                            }, 250);
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

const CassetteIcon: React.FC<{ isPlaying: boolean; color?: string }> = ({ isPlaying, color = 'currentColor' }) => {
  return (
    <svg 
      viewBox="0 0 24 24" 
      width="20" 
      height="20" 
      fill="none" 
      stroke={color} 
      strokeWidth="1.5" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      style={{
        display: 'block',
        flexShrink: 0
      }}
    >
      {/* Outer Cassette Shell */}
      <rect x="2" y="3" width="20" height="14" rx="2" strokeWidth="1.8" />
      {/* Bottom Trapezoid (exposed tape run) */}
      <path d="M6 17 L7.5 20.5 L16.5 20.5 L18 17" strokeWidth="1.5" />
      {/* Center label sticker area */}
      <rect x="4.5" y="5.5" width="15" height="9" rx="1" strokeWidth="1.2" opacity="0.85" />
      {/* The clear plastic window in the middle */}
      <rect x="7.5" y="7.5" width="9" height="5" rx="0.5" strokeWidth="1" opacity="0.8" />
      {/* Left rotating reel */}
      <g style={{ transformOrigin: '10px 10px', animation: isPlaying ? 'spin-clockwise 3s linear infinite' : 'none' }}>
        <circle cx="10" cy="10" r="1.8" strokeWidth="1.2" />
        <path d="M10 8.2 L10 11.8 M8.2 10 L11.8 10" strokeWidth="1" />
      </g>
      {/* Right rotating reel */}
      <g style={{ transformOrigin: '14px 10px', animation: isPlaying ? 'spin-clockwise 3s linear infinite' : 'none' }}>
        <circle cx="14" cy="10" r="1.8" strokeWidth="1.2" />
        <path d="M14 8.2 L14 11.8 M12.2 10 L15.8 10" strokeWidth="1" />
      </g>
      {/* Small details: screw holes in corners */}
      <circle cx="3.5" cy="4.5" r="0.4" fill={color} stroke="none" opacity="0.6" />
      <circle cx="20.5" cy="4.5" r="0.4" fill={color} stroke="none" opacity="0.6" />
      <circle cx="3.5" cy="15.5" r="0.4" fill={color} stroke="none" opacity="0.6" />
      <circle cx="20.5" cy="15.5" r="0.4" fill={color} stroke="none" opacity="0.6" />
      {/* Tape rolls inside window */}
      <circle cx="10" cy="10" r="3" strokeWidth="0.8" strokeDasharray="1 1" opacity="0.45" />
      <circle cx="14" cy="10" r="2.8" strokeWidth="0.8" strokeDasharray="1 1" opacity="0.45" />
    </svg>
  );
};

const InlineAudioPlayer: React.FC<{ url: string; label: string }> = ({ url, label }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  React.useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onEnded = () => setIsPlaying(false);
    audio.addEventListener('ended', onEnded);
    return () => {
      audio.removeEventListener('ended', onEnded);
    };
  }, []);

  return (
    <div 
      onClick={togglePlay}
      style={{ 
        position: 'relative',
        width: '160px',
        height: '95px',
        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
        border: '2px solid #334155',
        borderRadius: '8px',
        padding: '4px',
        boxShadow: isPlaying 
          ? '0 8px 20px rgba(217, 119, 6, 0.15), 0 0 10px rgba(217, 119, 6, 0.1)'
          : '0 4px 12px rgba(0,0,0,0.12)',
        cursor: 'pointer',
        userSelect: 'none',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        transform: isPlaying ? 'scale(1.02)' : 'none',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = isPlaying ? 'scale(1.04)' : 'translateY(-2px)';
        e.currentTarget.style.boxShadow = isPlaying
          ? '0 10px 24px rgba(217, 119, 6, 0.25), 0 0 14px rgba(217, 119, 6, 0.15)'
          : '0 6px 16px rgba(0,0,0,0.18)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = isPlaying ? 'scale(1.02)' : 'none';
        e.currentTarget.style.boxShadow = isPlaying
          ? '0 8px 20px rgba(217, 119, 6, 0.15), 0 0 10px rgba(217, 119, 6, 0.1)'
          : '0 4px 12px rgba(0,0,0,0.12)';
      }}
    >
      <audio ref={audioRef} src={url} />
      
      {/* 4 Screws in corners */}
      <div style={{ position: 'absolute', top: '4px', left: '4px', width: '3px', height: '3px', borderRadius: '50%', background: '#64748b', opacity: 0.8 }} />
      <div style={{ position: 'absolute', top: '4px', right: '4px', width: '3px', height: '3px', borderRadius: '50%', background: '#64748b', opacity: 0.8 }} />
      <div style={{ position: 'absolute', bottom: '4px', left: '4px', width: '3px', height: '3px', borderRadius: '50%', background: '#64748b', opacity: 0.8 }} />
      <div style={{ position: 'absolute', bottom: '4px', right: '4px', width: '3px', height: '3px', borderRadius: '50%', background: '#64748b', opacity: 0.8 }} />

      {/* Cassette Top Notch/Details */}
      <div style={{ display: 'flex', justifyContent: 'center', width: '100%', gap: '10px', marginTop: '1px' }}>
        <div style={{ width: '8px', height: '2px', background: '#334155', borderRadius: '0.5px' }} />
        <div style={{ width: '18px', height: '2px', background: '#334155', borderRadius: '0.5px' }} />
        <div style={{ width: '8px', height: '2px', background: '#334155', borderRadius: '0.5px' }} />
      </div>

      {/* Sticker Label Area */}
      <div style={{
        flex: 1,
        margin: '3px 4px',
        background: 'linear-gradient(to bottom, #ffffff 0%, #f8fafc 100%)',
        border: '1.2px solid #cbd5e1',
        borderRadius: '5px',
        padding: '4px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Retro Accent Stripes */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(to right, #ef4444 33%, #3b82f6 33%, #3b82f6 66%, #10b981 66%)', opacity: 0.8 }} />

        {/* Tape Reel Window */}
        <div style={{
          width: '74px',
          height: '22px',
          background: '#0f172a',
          border: '1.2px solid #475569',
          borderRadius: '3px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'relative',
          marginTop: '2px',
          padding: '0 6px',
          boxShadow: 'inset 0 1.5px 3px rgba(0,0,0,0.5)'
        }}>
          {/* Transparent window pane effect */}
          <div style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 50%)',
            pointerEvents: 'none'
          }} />

          {/* Left Reel Hub */}
          <div style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            border: '1.5px solid #64748b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#1e293b',
            position: 'relative',
            animation: isPlaying ? 'spin-clockwise 3s linear infinite' : 'none'
          }}>
            <div style={{ width: '1.5px', height: '9px', background: '#e2e8f0', position: 'absolute' }} />
            <div style={{ width: '9px', height: '1.5px', background: '#e2e8f0', position: 'absolute' }} />
            <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#0f172a', zIndex: 1 }} />
          </div>

          {/* Magnetic tape roll representation (left) */}
          <div style={{
            position: 'absolute',
            left: '4px',
            width: isPlaying ? '14px' : '16px',
            height: isPlaying ? '14px' : '16px',
            borderRadius: '50%',
            border: '1px dashed #78350f',
            opacity: 0.35,
            transition: 'all 5s ease'
          }} />

          {/* Center Play Button Overlay */}
          <div 
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #334155 0%, #0f172a 100%)',
              border: '2px solid #ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 6px rgba(0,0,0,0.6)',
              zIndex: 20,
              color: 'white',
              transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
              pointerEvents: 'none' // Clicks bubble up to trigger togglePlay on parent
            }}
          >
            {isPlaying ? (
              <svg viewBox="0 0 24 24" width="10" height="10" fill="currentColor">
                <rect x="5" y="5" width="4" height="14" rx="1" />
                <rect x="15" y="5" width="4" height="14" rx="1" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="10" height="10" fill="currentColor" style={{ marginLeft: '1.5px' }}>
                <path d="M7 4v16l13-8z" />
              </svg>
            )}
          </div>

          {/* Right Reel Hub */}
          <div style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            border: '1.5px solid #64748b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#1e293b',
            position: 'relative',
            animation: isPlaying ? 'spin-clockwise 3s linear infinite' : 'none'
          }}>
            <div style={{ width: '1.5px', height: '9px', background: '#e2e8f0', position: 'absolute' }} />
            <div style={{ width: '9px', height: '1.5px', background: '#e2e8f0', position: 'absolute' }} />
            <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#0f172a', zIndex: 1 }} />
          </div>
          
          {/* Magnetic tape roll representation (right) */}
          <div style={{
            position: 'absolute',
            right: '4px',
            width: isPlaying ? '16px' : '14px',
            height: isPlaying ? '16px' : '14px',
            borderRadius: '50%',
            border: '1px dashed #78350f',
            opacity: 0.35,
            transition: 'all 5s ease'
          }} />
        </div>

        {/* Text/Song Title Sticker Writing */}
        <div style={{
          fontFamily: '"Courier New", Courier, monospace',
          fontSize: '0.7rem',
          fontWeight: 800,
          color: '#1e293b',
          textAlign: 'center',
          marginTop: '3px',
          width: '100%',
          borderTop: '1px dashed #cbd5e1',
          paddingTop: '2px',
          letterSpacing: '-0.5px',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          overflow: 'hidden'
        }}>
          {label}
        </div>
      </div>

      {/* Cassette Bottom Run / Exposed Tape details */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0 10px',
        marginBottom: '1px'
      }}>
        {/* Play Status Flashing Indicator LED */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
          <div style={{
            width: '5px',
            height: '5px',
            borderRadius: '50%',
            background: isPlaying ? '#ef4444' : '#475569',
            boxShadow: isPlaying ? '0 0 6px #ef4444' : 'none',
            animation: isPlaying ? 'pulse 1s infinite alternate' : 'none'
          }} />
          <span style={{ fontSize: '0.5rem', fontWeight: 800, color: '#64748b', fontFamily: 'monospace' }}>
            {isPlaying ? 'PLAY' : 'STOP'}
          </span>
        </div>

        {/* Small Stop Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (audioRef.current) {
              audioRef.current.pause();
              audioRef.current.currentTime = 0;
              setIsPlaying(false);
            }
          }}
          style={{
            background: '#ef4444',
            border: 'none',
            borderRadius: '3px',
            width: '18px',
            height: '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            padding: 0,
            boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
            transition: 'transform 0.1s ease',
            zIndex: 10
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          title="Stop"
        >
          <div style={{ width: '7px', height: '7px', background: 'white', borderRadius: '1px' }} />
        </button>
        
        {/* Exposed tape path shapes */}
        <div style={{ display: 'flex', gap: '4px' }}>
          <div style={{ width: '5px', height: '3px', background: '#334155', borderRadius: '0.5px' }} />
          <div style={{ width: '5px', height: '3px', background: '#334155', borderRadius: '0.5px' }} />
        </div>
      </div>
    </div>
  );
};

const RetroCassettePlayer: React.FC<{ url: string; duration: number; index: number; onDelete?: () => void }> = ({ url, duration, index, onDelete }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const updateTime = () => setCurrentTime(audio.currentTime);
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('ended', onEnded);
    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('ended', onEnded);
    };
  }, []);

  return (
    <div style={{
      background: 'linear-gradient(135deg, #2c2a29 0%, #1a1817 100%)',
      borderRadius: '16px',
      padding: '16px',
      width: '100%',
      maxWidth: '340px',
      border: '4px solid #0f0e0d',
      boxShadow: '0 8px 20px rgba(0,0,0,0.3)',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      fontFamily: 'monospace',
      color: '#fff',
      alignSelf: 'center',
      position: 'relative'
    }}>
      <audio ref={audioRef} src={url} />
      
      <div style={{
        background: 'linear-gradient(to bottom, #dbeafe 0%, #eff6ff 100%)',
        border: '2px solid #000',
        borderRadius: '6px',
        padding: '8px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        position: 'relative'
      }}>
        <div style={{ height: '3px', background: '#ef4444', width: '100%' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.62rem', color: '#1e3a8a', fontWeight: 900 }}>
          <span>A / PLAY-ALONG #{index + 1}</span>
          <span>{Math.round(currentTime)}s / {duration}s</span>
        </div>
        
        <div style={{
          background: '#000',
          borderRadius: '4px',
          height: '28px',
          margin: '4px 0',
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          padding: '0 20px'
        }}>
          <div 
            className={isPlaying ? 'spinning' : ''} 
            style={{
              width: '18px',
              height: '18px',
              borderRadius: '50%',
              background: '#94a3b8',
              border: '3px dashed #334155',
              animation: isPlaying ? 'spin 4s linear infinite' : 'none'
            }} 
          />
          <div 
            className={isPlaying ? 'spinning' : ''} 
            style={{
              width: '18px',
              height: '18px',
              borderRadius: '50%',
              background: '#94a3b8',
              border: '3px dashed #334155',
              animation: isPlaying ? 'spin 4s linear infinite' : 'none'
            }} 
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
        <button
          type="button"
          onClick={togglePlay}
          style={{
            background: '#d97706',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            padding: '6px 12px',
            fontSize: '0.72rem',
            fontWeight: 800,
            cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          {isPlaying ? '⏸️ PAUSE' : '▶️ PLAY'}
        </button>
        <button
          type="button"
          onClick={() => {
            if (audioRef.current) {
              audioRef.current.pause();
              audioRef.current.currentTime = 0;
              setIsPlaying(false);
              setCurrentTime(0);
            }
          }}
          style={{
            background: '#475569',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            padding: '6px 12px',
            fontSize: '0.72rem',
            fontWeight: 800,
            cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          ⏹️ STOP
        </button>
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            style={{
              background: '#ef4444',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              padding: '6px 12px',
              fontSize: '0.72rem',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            🗑️ LÖSCHEN
          </button>
        )}
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}} />
    </div>
  );
};
