import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, Award, Flame, AlertCircle, BookOpen, Music, History, Plus, ChevronLeft, ChevronRight, ChevronDown, Book, Star, Sliders, RotateCcw, Mic, Square, Play, VolumeX, Volume2, Trash2, Headphones, Minimize2, Maximize2, Calendar, FileText, Zap, Clock, Info, Activity, ArrowLeft, Edit3, Disc, Search, Lock, Unlock, Share2, Sparkles, Radio, Download, Repeat, Timer, Scissors } from 'lucide-react';
import Confetti from 'react-confetti';
import { supabase } from '../lib/supabase';
// @ts-ignore
import * as lamejs from '@breezystack/lamejs';
import { GrooveLoopstation } from './groovelab/GrooveLoopstation';
import { GroovePracticeCompanion } from './groovelab/GroovePracticeCompanion';
import { CampusTuner } from './campus/CampusTuner';
import { AudioBiographyView, CustomPlaylist, CustomPlaylistTrack } from './campus/AudioBiographyView';
import { processPureRawBlob, processStudioMastering, TARGET_PURE_RAW_LUFS, TARGET_STUDIO_LUFS, TARGET_PEAK_DBTP } from '../utils/audioMasteringEngine';
import { storeBlob, getBlob } from '../utils/blobStorage';
import { AudioTrackCarousel } from './AudioTrackCarousel';
import { MeisterOhrSticker } from './MeisterOhrSticker';
import { AudioEditorModal } from './campus/AudioEditorModal';
import { synthesizeNeuralSpeech, playAudioBlob, stopNeuralSpeech, buildContinuousHomeworkNarrative, cleanTextForTts } from '../services/neuralTtsService';


const getSimulatedNow = (): Date => {
  const sim = localStorage.getItem('simulated_date');
  if (sim) {
    const d = new Date(sim);
    if (!isNaN(d.getTime())) return d;
  }
  return new Date();
};

import { 
  ALL_STICKERS, 
  getUnifiedStickerStatus, 
  getUnifiedStickersMap, 
  cleanNotesText, 
  checkIsAudioTresorActive,
  type StickerUnlockContext,
  type StickerUnlockResult
} from '../domain/stickersAndTresor';

export { 
  ALL_STICKERS, 
  getUnifiedStickerStatus, 
  getUnifiedStickersMap, 
  cleanNotesText, 
  checkIsAudioTresorActive 
};
export type { StickerUnlockContext, StickerUnlockResult };

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  photo_url?: string;
  school_id?: string;
  schoolId?: string;
  is_campus_active?: boolean;
  [key: string]: any;
}

interface MeisterwerkDocumentationModalProps {
  student: Student;
  onClose: () => void;
  teacherId?: string;
  initialLehrwerkId?: string;
  initialViewMode?: 'document' | 'recordings' | 'loopstation' | 'practice';
  initialModalTab?: 'document' | 'logbook' | 'stickeralbum' | 'skillradar' | 'audiobiography';
  onProfileClick?: (student: Student) => void;
  readOnly?: boolean;
  isEmbed?: boolean;
  isTeacherTools?: boolean;
  uiLevel?: 'junior' | 'teen' | 'pro';
  initialXp?: number;
  initialStreak?: number;
  initialPracticeMinutes?: number;
  initialMasteredSongsCount?: number;
  hasTresorStorage?: boolean;
}

interface ProgressItem {
  id?: string;
  topic_name: string;
  status: 'IN_PROGRESS' | 'THEORY_DONE' | 'MASTERED';
  is_current_homework: boolean;
  teacher_notes: string;
  homework_notes?: string;
  updated_at?: string;
  student_rating?: number | null;
  is_match_mode_enabled?: boolean;
  last_matched_at?: string | null;
  last_matched_teacher_percent?: number | null;
  last_matched_student_percent?: number | null;
  is_match_successful?: boolean | null;
}

const getISOWeekRaw = (dateInput?: string | Date, lessonDay: number = 1): string => {
  let date: Date;
  if (!dateInput) {
    date = new Date();
  } else if (dateInput instanceof Date) {
    date = dateInput;
  } else {
    date = new Date(dateInput);
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
    .filter((line: string) => {
      const trimmed = line.trim();
      return !trimmed.startsWith('AUDIO:') && 
             !trimmed.startsWith('STICKER:') && 
             !trimmed.startsWith('LOOP:') &&
             !trimmed.startsWith('LATENCY:') &&
             !trimmed.startsWith('STUDENT_NOTE_PUBLIC:') && 
             !trimmed.startsWith('STUDENT_NOTE_PRIVATE:');
    })
    .join('\n')
    .trim();
};

export const getCleanTeacherHomeworkText = (notes: any): string => {
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
    .filter((line: string) => {
      const trimmed = line.trim();
      return !trimmed.startsWith('AUDIO:') && 
             !trimmed.startsWith('STICKER:') && 
             !trimmed.startsWith('LOOP:') &&
             !trimmed.startsWith('LATENCY:') &&
             !trimmed.startsWith('STUDENT_NOTE_PUBLIC:') && 
             !trimmed.startsWith('STUDENT_NOTE_PRIVATE:');
    })
    .join('\n')
    .trim();
};

export const formatStudentNoteDisplay = (note: string): { isStudentNote: boolean; isPrivate: boolean; text: string } => {
  if (!note) return { isStudentNote: false, isPrivate: false, text: '' };
  
  if (note.startsWith('STUDENT_NOTE_PUBLIC:')) {
    const raw = note.replace(/^STUDENT_NOTE_PUBLIC:[^|]*\|/, '').trim();
    const clean = raw.replace(/^❓\s*Frage für den Unterricht:\s*/i, '').trim();
    return { isStudentNote: true, isPrivate: false, text: clean || raw };
  }
  
  if (note.startsWith('STUDENT_NOTE_PRIVATE:')) {
    const raw = note.replace(/^STUDENT_NOTE_PRIVATE:[^|]*\|/, '').trim();
    const clean = raw.replace(/^❓\s*Frage für den Unterricht:\s*/i, '').trim();
    return { isStudentNote: true, isPrivate: true, text: clean || raw };
  }
  
  return { isStudentNote: false, isPrivate: false, text: note };
};

const SKILL_TAGS = [
  { key: 'rhythmus', label: 'Rhythmus & Timing', shortLabel: 'Rhythmus', icon: '🥁', category: 'musical' },
  { key: 'technik', label: 'Spieltechnik & Motorik', shortLabel: 'Technik', icon: '⚡', category: 'musical' },
  { key: 'intonation', label: 'Klang & Intonation', shortLabel: 'Klang', icon: '🎵', category: 'musical' },
  { key: 'ausdruck', label: 'Ausdruck & Dynamik', shortLabel: 'Ausdruck', icon: '🎭', category: 'musical' },
  { key: 'repertoire', label: 'Repertoire & Performance', shortLabel: 'Repertoire', icon: '🌟', category: 'musical' },
];

export const SpeechDictationButton: React.FC<{
  onTranscript: (text: string) => void;
  title?: string;
  size?: 'sm' | 'md';
}> = ({ onTranscript, title = "Diktieren", size = 'sm' }) => {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const toggleListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Spracherkennung wird von Ihrem Browser leider nicht unterstützt (empfohlen: Google Chrome, Safari oder Microsoft Edge).");
      return;
    }

    if (isListening) {
      setIsListening(false);
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'de-DE';
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            transcript += event.results[i][0].transcript;
          }
        }
        if (!transcript && event.results?.[0]?.[0]?.transcript) {
          transcript = event.results[0][0].transcript;
        }
        if (transcript && transcript.trim()) {
          onTranscript(transcript.trim());
        }
      };

      recognition.onerror = (event: any) => {
        console.warn("[SpeechDictation] Error:", event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.error("[SpeechDictation] Start failed:", e);
      setIsListening(false);
    }
  };

  return (
    <button
      type="button"
      onClick={toggleListening}
      className="tactile-btn"
      title={isListening ? "Aufnahme stoppen..." : "Sprache zu Text diktieren"}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        padding: size === 'sm' ? '4px 10px' : '6px 12px',
        borderRadius: '999px',
        fontSize: size === 'sm' ? '0.70rem' : '0.76rem',
        fontWeight: 800,
        cursor: 'pointer',
        border: isListening ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
        background: isListening ? '#fef2f2' : '#ffffff',
        color: isListening ? '#dc2626' : '#475569',
        boxShadow: isListening ? '0 0 12px rgba(239, 68, 68, 0.4)' : '0 1px 3px rgba(0,0,0,0.04)',
        transition: 'all 0.2s ease',
        animation: isListening ? 'paniniGlow 1.2s infinite alternate' : 'none'
      }}
    >
      {isListening ? (
        <>
          <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#dc2626', display: 'inline-block' }} />
          <span>🔴 Hört zu... (Stopp)</span>
        </>
      ) : (
        <>
          <Mic size={size === 'sm' ? 12 : 14} style={{ color: '#0284c7' }} />
          <span>🎤 {title}</span>
        </>
      )}
    </button>
  );
};

export const MeisterwerkDocumentationModal: React.FC<MeisterwerkDocumentationModalProps> = ({ 
  student, 
  onClose, 
  teacherId, 
  initialLehrwerkId, 
  initialViewMode, 
  initialModalTab, 
  onProfileClick, 
  readOnly = false, 
  isEmbed = false, 
  isTeacherTools = false, 
  uiLevel = 'pro',
  initialXp,
  initialStreak,
  initialPracticeMinutes,
  initialMasteredSongsCount,
  hasTresorStorage: propHasTresor
}) => {
  const isTeacherMode = !readOnly || isTeacherTools;
  const studentFirstName = (student?.first_name || (student as any)?.name?.split(' ')[0] || 'Schüler').trim();
  const [isCampusActive, setIsCampusActive] = useState<boolean>(student.is_campus_active ?? true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showProtokollOnboarding, setShowProtokollOnboarding] = useState<boolean>(() => {
    try {
      const seen = localStorage.getItem('groovelab_protokoll_onboarding_seen');
      return seen !== 'true';
    } catch (e) {
      return false;
    }
  });
  const [onboardingStep, setOnboardingStep] = useState<number>(0);

  // Skill-Radar & Feedback-Tagging
  const [showSkillRadar, setShowSkillRadar] = useState(false);
  const [pendingFeedbackTags, setPendingFeedbackTags] = useState<string[]>([]);
  const [pendingTargetFocusTags, setPendingTargetFocusTags] = useState<string[]>([]);
  const [pendingFeedbackStatus, setPendingFeedbackStatus] = useState<'beherrscht' | 'in_entwicklung' | 'wiederholen' | null>(null);
  const [isSavingFeedback, setIsSavingFeedback] = useState(false);
  const [studentPracticeFeedback, setStudentPracticeFeedback] = useState<string | null>(() => {
    try {
      const currentWeekStr = getISOWeek();
      return localStorage.getItem(`groovelab_student_feedback_${student?.id || 'default'}_${currentWeekStr}`);
    } catch (e) {
      return null;
    }
  });
  const activePlat = typeof window !== 'undefined' ? localStorage.getItem('groovelab_active_platform') : 'campus';
  const [windowWidth, setWindowWidth] = useState(() => typeof window !== 'undefined' ? window.innerWidth : 1200);

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(typeof window !== 'undefined' ? window.innerWidth : 1200);
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('groovelab_orientation_changed', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('groovelab_orientation_changed', handleResize);
    };
  }, []);

  const isInsideSimMobile = typeof document !== 'undefined' && !!document.querySelector('.sim-viewport-mobile, .sim-viewport-portrait');
  const isInsideSimTabletLandscape = typeof document !== 'undefined' && !!document.querySelector('.sim-viewport-tablet, .sim-viewport-landscape');
  const isInsideSim = isInsideSimMobile || isInsideSimTabletLandscape;
  const isMobileView = (windowWidth <= 768 && !isInsideSimTabletLandscape) || isInsideSimMobile;
  const [mobileProtokollTab, setMobileProtokollTab] = useState<'repertoire' | 'homework'>((readOnly && uiLevel === 'junior') ? 'homework' : 'repertoire');
  const [hubTab, setHubTab] = useState<'modules' | 'protocol'>('modules');
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const modalContainerRef = useRef<HTMLDivElement>(null);
  const radarAnalysisCardsRef = useRef<HTMLDivElement>(null);

  const toggleFullscreen = () => {
    setIsFullscreen(prev => !prev);
  };

  // Tastatur-Shortcut: F-Taste toggelt Vollbild
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
         activeEl.tagName === 'TEXTAREA' ||
         activeEl.getAttribute('contenteditable') === 'true')
      ) return;

      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        setIsFullscreen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const displayedStudentName = useMemo(() => {
    return readOnly
      ? 'Aufgabenheft'
      : `${student.first_name}${student.last_name ? ' ' + student.last_name.trim().charAt(0) + '.' : ''}`;
  }, [readOnly, student.first_name, student.last_name]);

  const actualStudentName = useMemo(() => {
    const fName = (student.first_name || '').trim();
    if (!fName) return 'Musiker';
    const lInitial = student.last_name ? ' ' + student.last_name.trim().charAt(0) + '.' : '';
    return `${fName}${lInitial}`;
  }, [student.first_name, student.last_name]);

  const getSchoolYearString = (dateInput?: string | Date) => {
    let d = new Date();
    if (dateInput) {
      const parsed = new Date(dateInput);
      if (!isNaN(parsed.getTime())) {
        d = parsed;
      }
    }
    const year = d.getFullYear();
    const month = d.getMonth(); // 0-indexed (0 = Jan, 8 = Sept)
    if (month >= 8) {
      return `${year}/${year + 1}`;
    } else {
      return `${year - 1}/${year}`;
    }
  };

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
      .maybeSingle()
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
  const [teacherNotes, setTeacherNotes] = useState<string>(() => {
    try {
      return localStorage.getItem(`campus_teacher_notes_${student.id}`) || '';
    } catch {
      return '';
    }
  });
  const [generalHomeworkNotes, setGeneralHomeworkNotes] = useState<string>(() => {
    try {
      const cached = localStorage.getItem(`campus_homework_notes_${student.id}`);
      if (cached && cached.startsWith('[') && cached.endsWith(']')) {
        const parsed = JSON.parse(cached);
        return parsed.filter((n: string) => 
          typeof n === 'string' && 
          !n.startsWith('AUDIO:') && 
          !n.startsWith('STICKER:') && 
          !n.startsWith('FEEDBACK:') && 
          !n.startsWith('STUDENT_NOTE_')
        ).join('\n\n') || '';
      }
      return cached || '';
    } catch {
      return '';
    }
  });
  const [songHomeworkNotes, setSongHomeworkNotes] = useState<string>('');
  const [pageHomeworkNotes, setPageHomeworkNotes] = useState<string>('');
  const [homeworkNotes, setHomeworkNotes] = useState<string>('');
  const [homeworkNotesList, setHomeworkNotesList] = useState<string[]>(() => {
    try {
      const cached = localStorage.getItem(`campus_homework_notes_${student.id}`);
      if (cached && cached.startsWith('[') && cached.endsWith(']')) {
        return JSON.parse(cached);
      }
      return cached ? [cached] : [];
    } catch {
      return [];
    }
  });
  const [studentNotes, setStudentNotes] = useState('');
  const [isStudentNotePrivate, setIsStudentNotePrivate] = useState(false);
  const [studentNotesSavedToast, setStudentNotesSavedToast] = useState(false);
  const [isNotesFocused, setIsNotesFocused] = useState(false);
  const isNotesExpanded = isNotesFocused || !!generalHomeworkNotes.trim();
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
  const sortedAssignedLehrwerke = useMemo(() => {
    return [...assignedLehrwerke].sort((a, b) => {
      const timeA = a.assignedAt ? new Date(a.assignedAt).getTime() : 0;
      const timeB = b.assignedAt ? new Date(b.assignedAt).getTime() : 0;
      return timeB - timeA;
    });
  }, [assignedLehrwerke]);
  const [activeLehrwerkId, setActiveLehrwerkId] = useState<string | null>(null);
  const [activePageNumber, setActivePageNumber] = useState<number | null>(null);
  const [activeSubView, setActiveSubView] = useState<'hub' | 'lehrwerk' | 'song' | 'history'>('hub');
  const [selectedHistoryWeek, setSelectedHistoryWeek] = useState<string | null>(null);
  const [songProgressPercent, setSongProgressPercent] = useState<number>(25);

  // Dual-Metacognition Match Model State
  const [studentRating, setStudentRating] = useState<number | null>(null);
  const [isMatchModeEnabled, setIsMatchModeEnabled] = useState<boolean>(true);
  const [lastMatchedAt, setLastMatchedAt] = useState<string | null>(null);
  const [lastMatchedTeacherPercent, setLastMatchedTeacherPercent] = useState<number | null>(null);
  const [lastMatchedStudentPercent, setLastMatchedStudentPercent] = useState<number | null>(null);
  const [isMatchSuccessful, setIsMatchSuccessful] = useState<boolean | null>(null);
  const [isMatchRevealed, setIsMatchRevealed] = useState<boolean>(false);
  const [showMatchConfetti, setShowMatchConfetti] = useState<boolean>(false);
  const [matchFeedbackToast, setMatchFeedbackToast] = useState<string | null>(null);
  const [isStudentRatingCommitted, setIsStudentRatingCommitted] = useState<boolean>(false);
  const [studentRatingUpdatedAt, setStudentRatingUpdatedAt] = useState<string | null>(null);
  const [matchHistory, setMatchHistory] = useState<Array<{
    matched_at: string;
    teacher_percent: number;
    student_percent: number;
    xp_amount: number;
    tier: 'tier1' | 'tier2' | 'tier3';
  }>>([]);
  const [showdownState, setShowdownState] = useState<{
    isRunning: boolean;
    teacherTarget: number;
    studentTarget: number;
    currentTeacherVal: number;
    currentStudentVal: number;
    tier: 'tier1' | 'tier2' | 'tier3';
    xpAmount: number;
    matchedAt: string;
  } | null>(null);

  const [customTags, setCustomTags] = useState<string[]>([]);
  const [newCustomTagInput, setNewCustomTagInput] = useState<string>('');
  const [expandedTeacherAudioWeeks, setExpandedTeacherAudioWeeks] = useState<Record<string, boolean>>({});
  const [expandedStudentAudioWeeks, setExpandedStudentAudioWeeks] = useState<Record<string, boolean>>({});

  const toggleTeacherAudioWeek = (weekKey: string, defaultOpen: boolean = true) => {
    setExpandedTeacherAudioWeeks(prev => {
      const current = prev[weekKey] !== undefined ? prev[weekKey] : defaultOpen;
      return { ...prev, [weekKey]: !current };
    });
  };

  const toggleStudentAudioWeek = (weekKey: string, defaultOpen: boolean = true) => {
    setExpandedStudentAudioWeeks(prev => {
      const current = prev[weekKey] !== undefined ? prev[weekKey] : defaultOpen;
      return { ...prev, [weekKey]: !current };
    });
  };

  const handleAddCustomTag = () => {
    const val = newCustomTagInput.trim();
    if (!val) return;
    if (!SKILL_TAGS.some(st => st.key.toLowerCase() === val.toLowerCase()) && !customTags.some(ct => ct.toLowerCase() === val.toLowerCase())) {
      setCustomTags(prev => [...prev, val]);
    }
    if (pendingFeedbackTags.length < 2) {
      if (!pendingFeedbackTags.includes(val)) {
        setPendingFeedbackTags(prev => [...prev, val]);
      }
    }
    setNewCustomTagInput('');
  };

  // Feedback helpers
  const getFeedbackForWeek = (wk: string): { status: string; tags: string[]; at: string } | null => {
    const weekNum = wk.split('-W')[1] || '';
    const item = progressItems.find(item =>
      item.topic_name === `Hausaufgabe KW ${weekNum}` && item.homework_notes
    );
    if (!item) return null;
    try {
      const notes: string[] = JSON.parse(item.homework_notes || '[]');
      const fbStr = notes.find(n => n.startsWith('FEEDBACK:'));
      if (!fbStr) return null;
      return JSON.parse(fbStr.substring(9));
    } catch { return null; }
  };

  const saveFeedback = async (wk: string, tags: string[], fbStatus: string | null) => {
    const weekNum = wk.split('-W')[1] || '';
    const item = progressItems.find(it =>
      it.topic_name === `Hausaufgabe KW ${weekNum}` && it.id
    );
    const feedbackJson = `FEEDBACK:${JSON.stringify({ status: fbStatus, tags, at: new Date().toISOString() })}`;
    try {
      if (item?.id) {
        // Update existing Hausaufgabe-KW entry
        const notes: string[] = JSON.parse(item.homework_notes || '[]');
        const filteredNotes = notes.filter(n => !n.startsWith('FEEDBACK:'));
        if (fbStatus || tags.length > 0) filteredNotes.push(feedbackJson);
        const { error } = await supabase
          .from('progress_matrix')
          .update({ homework_notes: JSON.stringify(filteredNotes), updated_at: new Date().toISOString() })
          .eq('id', item.id);
        if (error) throw error;
        setProgressItems(prev => prev.map(p => p.id === item.id ? { ...p, homework_notes: JSON.stringify(filteredNotes) } : p));
      } else {
        // No Hausaufgabe-KW row yet — create one to hold the feedback
        const activeTId = await getCurrentTeacherId();
        const newNotes = (fbStatus || tags.length > 0) ? JSON.stringify([feedbackJson]) : '[]';
        const { data, error } = await supabase
          .from('progress_matrix')
          .insert({
            student_id: student.id,
            teacher_id: activeTId,
            topic_name: `Hausaufgabe KW ${weekNum}`,
            status: 'IN_PROGRESS',
            is_current_homework: false,
            teacher_notes: '',
            homework_notes: newNotes,
            updated_at: new Date().toISOString()
          })
          .select()
          .single();
        if (error) throw error;
        if (data) setProgressItems(prev => [...prev, data]);
      }
    } catch (e) {
      console.error('Error saving feedback:', e);
    }
  };

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
      { id: 'r1', label: '🥁 Puls-Master', text: 'Klopfe den Puls mit dem Fuß und klatsche den Rhythmus im Vorfeld. Spreche die Notenwerte laut mit – dein innerer Puls ist das Fundament jedes Grooves!', type: 'both', category: 'rhythm', active: true },
      { id: 'r2', label: '⏱️ Metronom-Buddy', text: 'Starte mit dem Metronom bei einem entspannten Entschleunigungs-Tempo. Erhöhe das Tempo erst in 5er-Schritten, wenn die Passage 3-mal in Folge makellos im Takt lag.', type: 'both', category: 'rhythm', active: true },
      { id: 'r3', label: '🐌 Schnecken-Tempo', text: 'Zerlege die schwierige Stelle in echtes Lupen-Tempo. Wenn du jede Bewegung extrem langsam und präzise ausführst, schaltet dein Gehirn automatisch in den Turbo-Modus!', type: 'both', category: 'rhythm', active: true },
      { id: 'r4', label: '🧩 Puzzle-Taktik', text: 'Verbinde Mikromodule: Übe nicht das ganze Stück auf einmal, sondern isoliere genau einen Takt. Erst wenn dieses Puzzleteil perfekt sitzt, baust du die Brücke zum nächsten Takt.', type: 'both', category: 'rhythm', active: true },
      { id: 't1', label: '🔂 Ritter-Dreierspiel', text: 'Mastery-Regel: Wiederhole den kniffligen Übergang exakt dreimal hintereinander ohne den kleinsten Fehler. Das brennt die Bewegung direkt ins Muskelgedächtnis ein!', type: 'both', category: 'technique', active: true },
      { id: 't2', label: '👁️ Blind-Flug', text: 'Schließe beim Spielen bewusst die Augen und aktiviere deine innere Klangvorstellung. Vertraue deinem Tastsinn und dem Raumgefühl deiner Hände!', type: 'both', category: 'technique', active: true },
      { id: 't3', label: '🏋️‍♂️ Fokus-Gym', text: 'Führe die Bewegungsabläufe in Zeitlupe bei minimalem Kraftaufwand aus. Achte auf maximale Lockerheit in Schultern, Handgelenken und Fingern.', type: 'both', category: 'technique', active: true },
      { id: 't4', label: '🕵️‍♂️ Detail-Detektiv', text: 'Verfolge das Notenbild mit geschärftem Blick: Prüfe Vorzeichen, Artikulation (Staccato/Legato) und Fingersätze haargenau. Kein akustisches Detail bleibt unentdeckt!', type: 'lehrwerke', category: 'technique', active: true },
      { id: 'p1', label: '🎵 Laut-Leise Zauber', text: 'Erschaffe dramaturgische Kontraste! Gestalte den dynamischen Bogen spürbar zwischen zartem Pianissimo und kraftvollem Forte – gib den Tönen Raum zum Atmen.', type: 'both', category: 'performance', active: true },
      { id: 'p2', label: '🌟 Eigener Remix', text: 'Kreativitäts-Challenge: Überlege dir eine eigene stilistische Variation, ein cooles Lick oder eine kleine Verzierung für diesen Abschnitt. Bring deine eigene musikalische Handschrift ein!', type: 'songs', category: 'performance', active: true },
      { id: 'p3', label: '🎭 Storyteller', text: 'Welche Emotion oder Geschichte steckt in diesen Takten? Forme jeden Ton so, als würdest du einer Zuhörerschaft ein spannendes oder berührendes Abenteuer erzählen.', type: 'both', category: 'performance', active: true },
      { id: 'p4', label: '🌊 Atem-Fluss', text: 'Forme Phrasen wie ein erfahrener Sänger: Atme vor dem Phrasenbeginn ein und führe den Bogen organisch bis zum Entspannungspunkt der Phrase.', type: 'both', category: 'performance', active: true }
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

  // Load existing feedback when a week is selected in the archive
  useEffect(() => {
    if (!selectedHistoryWeek) {
      setPendingFeedbackTags([]);
      setPendingFeedbackStatus(null);
      return;
    }
    const fb = getFeedbackForWeek(selectedHistoryWeek);
    setPendingFeedbackTags(fb?.tags || []);
    setPendingFeedbackStatus((fb?.status as any) || null);
  }, [selectedHistoryWeek, progressItems]);

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
      from: `hsl(${hue}, 85%, 92%)`,
      to: `hsl(${hue}, 80%, 82%)`,
      text: `hsl(${hue}, 90%, 25%)`,
      shadowFrom: `hsla(${hue}, 85%, 50%, 0.2)`,
      shadowTo: `hsla(${hue}, 80%, 40%, 0.15)`
    };
  };

  const renderSongVinylCover = (songColor: { from: string; to: string; text?: string }, size: 'sm' | 'md' | 'lg' = 'md') => {
    const isSm = size === 'sm';
    const isLg = size === 'lg';
    const sleeveSize = isSm ? 54 : isLg ? 102 : 94;
    const vinylSize = isSm ? 48 : isLg ? 92 : 84;
    const borderRadius = isSm ? 14 : isLg ? 25 : 23;
    const noteWidth = isSm ? 30 : isLg ? 52 : 46;
    const noteHeight = isSm ? 30 : isLg ? 52 : 46;
    const vinylRight = isSm ? -7 : isLg ? -13 : -11;

    const gradId = `fineVinylGrad_${(songColor?.from || 'blue').replace(/[^a-zA-Z0-9]/g, '')}_${size}`;
    const highId = `fineVinylHigh_${(songColor?.from || 'blue').replace(/[^a-zA-Z0-9]/g, '')}_${size}`;
    const headHigh1 = `fineHead1_${(songColor?.from || 'blue').replace(/[^a-zA-Z0-9]/g, '')}_${size}`;
    const headHigh2 = `fineHead2_${(songColor?.from || 'blue').replace(/[^a-zA-Z0-9]/g, '')}_${size}`;

    return (
      <div style={{
        position: 'relative',
        width: `${sleeveSize + (isSm ? 8 : 12)}px`,
        height: `${sleeveSize}px`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-start',
        marginLeft: isSm ? '-3px' : '-5px',
        flexShrink: 0
      }}>
        {/* 1. Sleek Black Vinyl Disc with Ultra-Fine Grooves */}
        <div style={{
          position: 'absolute',
          right: `${vinylRight}px`,
          width: `${vinylSize}px`,
          height: `${vinylSize}px`,
          borderRadius: '50%',
          boxShadow: '3px 5px 15px rgba(0, 0, 0, 0.32)',
          zIndex: 1,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <svg width={vinylSize} height={vinylSize} viewBox="0 0 100 100" fill="none">
            <defs>
              <radialGradient id={`discBase_${gradId}`} cx="50" cy="50" r="50" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#2c2c30" />
                <stop offset="25%" stopColor="#141416" />
                <stop offset="60%" stopColor="#08080a" />
                <stop offset="90%" stopColor="#18181b" />
                <stop offset="100%" stopColor="#050506" />
              </radialGradient>
              {/* Anisotropic Light Reflection Beams */}
              <linearGradient id={`discSheen1_${gradId}`} x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="rgba(255, 255, 255, 0.22)" />
                <stop offset="35%" stopColor="rgba(255, 255, 255, 0)" />
                <stop offset="65%" stopColor="rgba(255, 255, 255, 0)" />
                <stop offset="100%" stopColor="rgba(255, 255, 255, 0.18)" />
              </linearGradient>
              <linearGradient id={`discSheen2_${gradId}`} x1="100" y1="0" x2="0" y2="100" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="rgba(255, 255, 255, 0.15)" />
                <stop offset="40%" stopColor="rgba(255, 255, 255, 0)" />
                <stop offset="60%" stopColor="rgba(255, 255, 255, 0)" />
                <stop offset="100%" stopColor="rgba(255, 255, 255, 0.12)" />
              </linearGradient>
            </defs>
            {/* Disc Body */}
            <circle cx="50" cy="50" r="49.5" fill={`url(#discBase_${gradId})`} />
            <circle cx="50" cy="50" r="49.5" fill={`url(#discSheen1_${gradId})`} />
            <circle cx="50" cy="50" r="49.5" fill={`url(#discSheen2_${gradId})`} />
            
            {/* Distinct, Crisp Concentric Vinyl Grooves */}
            <circle cx="50" cy="50" r="46.5" stroke="rgba(255,255,255,0.32)" strokeWidth="0.85" />
            <circle cx="50" cy="50" r="44" stroke="rgba(0,0,0,0.65)" strokeWidth="0.85" />
            <circle cx="50" cy="50" r="41.5" stroke="rgba(255,255,255,0.26)" strokeWidth="0.85" />
            <circle cx="50" cy="50" r="39" stroke="rgba(0,0,0,0.6)" strokeWidth="0.85" />
            <circle cx="50" cy="50" r="36.5" stroke="rgba(255,255,255,0.28)" strokeWidth="0.85" />
            <circle cx="50" cy="50" r="34" stroke="rgba(0,0,0,0.6)" strokeWidth="0.85" />
            <circle cx="50" cy="50" r="31.5" stroke="rgba(255,255,255,0.22)" strokeWidth="0.85" />
            <circle cx="50" cy="50" r="29" stroke="rgba(0,0,0,0.6)" strokeWidth="0.85" />
            <circle cx="50" cy="50" r="26.5" stroke="rgba(255,255,255,0.18)" strokeWidth="0.85" />
            <circle cx="50" cy="50" r="24" stroke="rgba(0,0,0,0.5)" strokeWidth="0.85" />
            <circle cx="50" cy="50" r="21.5" stroke="rgba(255,255,255,0.16)" strokeWidth="0.85" />
            
            {/* Outer Rim Light Edge */}
            <circle cx="50" cy="50" r="49" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
          </svg>
        </div>

        {/* 2. Soft Pastel Rounded Square Sleeve */}
        <div style={{
          width: `${sleeveSize}px`,
          height: `${sleeveSize}px`,
          background: `linear-gradient(135deg, ${songColor.from} 0%, ${songColor.to} 100%)`,
          borderRadius: `${borderRadius}px`,
          boxShadow: '0 11px 24px -4px rgba(0, 0, 0, 0.1), 0 3px 7px -2px rgba(0, 0, 0, 0.05), inset 0 1.5px 2px rgba(255, 255, 255, 0.9)',
          border: '1.5px solid rgba(255, 255, 255, 0.8)',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2,
          boxSizing: 'border-box'
        }}>
          {/* 3. 10% Feiner 3D Double Music Note (Sleek, Glossy, Precision Engineered) */}
          <svg 
            width={noteWidth} 
            height={noteHeight} 
            viewBox="0 0 100 100" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
            style={{ filter: 'drop-shadow(0 4.5px 7px rgba(0, 0, 0, 0.25)) drop-shadow(0 1.5px 2.5px rgba(0, 0, 0, 0.14))' }}
          >
            <defs>
              {/* Main 3D Dark Graphite Body */}
              <linearGradient id={gradId} x1="25" y1="15" x2="75" y2="85" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#2c2c30" />
                <stop offset="35%" stopColor="#18181b" />
                <stop offset="75%" stopColor="#0f0f12" />
                <stop offset="100%" stopColor="#08080a" />
              </linearGradient>
              
              {/* Head 1 Specular Glow */}
              <radialGradient id={headHigh1} cx="34" cy="67" r="12" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="rgba(255, 255, 255, 0.45)" />
                <stop offset="45%" stopColor="rgba(255, 255, 255, 0.08)" />
                <stop offset="100%" stopColor="rgba(255, 255, 255, 0)" />
              </radialGradient>

              {/* Head 2 Specular Glow */}
              <radialGradient id={headHigh2} cx="67" cy="58" r="12" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="rgba(255, 255, 255, 0.45)" />
                <stop offset="45%" stopColor="rgba(255, 255, 255, 0.08)" />
                <stop offset="100%" stopColor="rgba(255, 255, 255, 0)" />
              </radialGradient>

              {/* Top Beam Highlight Line */}
              <linearGradient id={highId} x1="39" y1="21" x2="78" y2="13" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="rgba(255, 255, 255, 0.72)" />
                <stop offset="60%" stopColor="rgba(255, 255, 255, 0.26)" />
                <stop offset="100%" stopColor="rgba(255, 255, 255, 0.05)" />
              </linearGradient>
            </defs>

            {/* Left Note Head (10% feineres 3D-Oval) */}
            <ellipse cx="36" cy="68.5" rx="11.8" ry="8.8" transform="rotate(-19 36 68.5)" fill={`url(#${gradId})`} />
            <ellipse cx="36" cy="68.5" rx="11.8" ry="8.8" transform="rotate(-19 36 68.5)" fill={`url(#${headHigh1})`} />

            {/* Right Note Head (10% feineres 3D-Oval) */}
            <ellipse cx="68" cy="59.5" rx="11.8" ry="8.8" transform="rotate(-19 68 59.5)" fill={`url(#${gradId})`} />
            <ellipse cx="68" cy="59.5" rx="11.8" ry="8.8" transform="rotate(-19 68 59.5)" fill={`url(#${headHigh2})`} />

            {/* Left Stem (5.8px Schlanker Stab) */}
            <rect x="42" y="25" width="5.8" height="44" rx="2.9" fill={`url(#${gradId})`} />

            {/* Right Stem (5.8px Schlanker Stab) */}
            <rect x="74.2" y="16" width="5.8" height="44" rx="2.9" fill={`url(#${gradId})`} />

            {/* Top Beam (10% feinerer Verbindungsbalken) */}
            <path d="M 42 26 C 42 22 45 21 48.5 20.2 L 75.5 13.5 C 78.5 12.8 81.5 14.2 81.5 17.5 L 81.5 24.5 C 81.5 27.5 78.5 28.5 75.5 29.2 L 48.5 35.8 C 45 36.5 42 35.2 42 32 Z" fill={`url(#${gradId})`} />

            {/* Top Beam Specular Light Edge */}
            <path d="M 44.5 23 L 78.5 14.8" stroke={`url(#${highId})`} strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </div>
      </div>
    );
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
  const [activeBrush, setActiveBrush] = useState<'NONE' | 'LOCKED' | 'HOMEWORK' | 'MASTERED' | 'THEORY' | 'STUDENT_FOCUS'>('NONE');
  const [showAllPagesGrid, setShowAllPagesGrid] = useState(false);
  const [showAllPresets, setShowAllPresets] = useState(false);
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
  const [studentXP, setStudentXP] = useState<number>(initialXp ?? 0);
  const [studentStreak, setStudentStreak] = useState<number>(initialStreak ?? 0);
  const [studentPracticeMinutes, setStudentPracticeMinutes] = useState<number>(initialPracticeMinutes ?? 0);
  const [weeklyPracticeDays, setWeeklyPracticeDays] = useState<number>(0);

  useEffect(() => {
    if (initialXp !== undefined) setStudentXP(initialXp);
  }, [initialXp]);

  useEffect(() => {
    if (initialStreak !== undefined) setStudentStreak(initialStreak);
  }, [initialStreak]);

  useEffect(() => {
    if (initialPracticeMinutes !== undefined) setStudentPracticeMinutes(initialPracticeMinutes);
  }, [initialPracticeMinutes]);

  // Developer simulation states
  const [simulatedSongsCount, setSimulatedSongsCount] = useState<number | null>(null);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
  const [selectedSimSticker, setSelectedSimSticker] = useState<string>('fleiss-pionier');

  // Teacher Skill Level Overrides for Interactive Skill-Radar Cockpit
  const [skillOverrides, setSkillOverrides] = useState<{ [tagKey: string]: number }>(() => {
    try {
      const saved = localStorage.getItem(`groovelab_skill_overrides_${student?.id || 'default'}`);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const handleImproveSkill = (tagKey: string) => {
    setSkillOverrides(prev => {
      const currentOffset = prev[tagKey] ?? 0;
      const updated = { ...prev, [tagKey]: currentOffset - 1 };
      try {
        localStorage.setItem(`groovelab_skill_overrides_${student?.id || 'default'}`, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  const handleTriggerSkillQuest = (tagKey: string) => {
    setSkillOverrides(prev => {
      const currentOffset = prev[tagKey] ?? 0;
      
      // 3-Stufen-Zyklus: Stufe 5 (Offset <= 0) -> Stufe 4 (Offset 1) -> Stufe 3 (Offset 2) -> Reset auf Stufe 5 (Offset -10)
      let nextOffset: number;
      if (currentOffset <= 0) {
        // Prüfe Max-2-Sperre: Wie viele andere Säulen sind aktuell im Fokus (offset > 0)?
        const activeOtherKeys = Object.keys(prev).filter(k => k !== tagKey && (prev[k] ?? 0) > 0);
        if (activeOtherKeys.length >= 2) {
          return prev; // Max 2 erreicht
        }
        nextOffset = 1; // Stufe 4 (Wochenfokus)
      } else if (currentOffset === 1) {
        nextOffset = 2; // Stufe 3 (Vertiefte Quest)
      } else {
        nextOffset = -10; // Reset zurück auf Stufe 5 (100% Souverän)
      }

      const updated = { ...prev, [tagKey]: nextOffset };
      try {
        localStorage.setItem(`groovelab_skill_overrides_${student?.id || 'default'}`, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  const handleMasterAllSkills = () => {
    const updated: { [k: string]: number } = {};
    SKILL_TAGS.forEach(t => {
      updated[t.key] = -10; // Guarantees Stufe 5 (100% Souverän Meister-Level)
    });
    setSkillOverrides(updated);
    try {
      localStorage.setItem(`groovelab_skill_overrides_${student?.id || 'default'}`, JSON.stringify(updated));
    } catch (e) {}
  };

  // Helper for 2-Tier Auto-Detection of Custom Textbausteine to Skill-Radar Tags
  const detectSkillTagFromText = (label: string, text: string, category?: string): string | null => {
    const combined = ((label || '') + ' ' + (text || '')).trim().toLowerCase();
    if (!combined) return null;

    if (combined.includes('metronom') || combined.includes('bpm') || combined.includes('tempo') || combined.includes('entschleunig') || combined.includes('schnecke') || combined.includes('rhythmus') || combined.includes('takt') || combined.includes('puls') || combined.includes('groove') || combined.includes('timing') || combined.includes('einzählen')) {
      return 'rhythmus';
    }
    if (combined.includes('finger') || combined.includes('hand') || combined.includes('griff') || combined.includes('haltung') || combined.includes('lockerheit') || combined.includes('technik') || combined.includes('motorik') || combined.includes('ansatz') || combined.includes('bogen') || combined.includes('stick')) {
      return 'technik';
    }
    if (combined.includes('klang') || combined.includes('ton') || combined.includes('intonation') || combined.includes('sauber') || combined.includes('artikulation') || combined.includes('staccato') || combined.includes('legato') || combined.includes('rein')) {
      return 'intonation';
    }
    if (combined.includes('ausdruck') || combined.includes('dynamik') || combined.includes('gefühl') || combined.includes('lautstärke') || combined.includes('phrasierung') || combined.includes('blind-flug') || combined.includes('emotion')) {
      return 'ausdruck';
    }
    if (combined.includes('auswendig') || combined.includes('blatt') || combined.includes('gedächtnis') || combined.includes('ohne noten') || combined.includes('repertoire') || combined.includes('bühne') || combined.includes('performance') || combined.includes('spielfluss') || combined.includes('routine') || combined.includes('song') || combined.includes('selbst')) {
      return 'repertoire';
    }

    if (category === 'rhythm') return 'rhythmus';
    if (category === 'technique') return 'technik';
    return null;
  };

  // Robust Universal Song Title Normalization & Matcher
  const getNormalizedSongTitle = (skillOrItem: any): string => {
    if (!skillOrItem) return '';
    if (typeof skillOrItem === 'string') {
      return skillOrItem.replace(/\s*\([^)]*\)\s*$/, '').trim().toLowerCase();
    }
    
    // Check if it's a textbook page or general homework note
    const topic = skillOrItem.topic_name || '';
    if (topic.includes(' - Seite ') || topic.startsWith('Hausaufgabe KW ')) {
      return '';
    }

    if (topic) {
      return topic.replace(/\s*\([^)]*\)\s*$/, '').trim().toLowerCase();
    }

    const artist = (skillOrItem.songs?.artist || skillOrItem.artist || '').trim();
    const title = (skillOrItem.songs?.title || skillOrItem.song_title || skillOrItem.title || '').trim();
    if (artist && title) return `${artist} - ${title}`.toLowerCase();
    return (title || artist).toLowerCase();
  };

  const getCanonicalSongKey = (skillOrItem: any): string => {
    const raw = getNormalizedSongTitle(skillOrItem);
    if (!raw) return '';
    if (raw.includes(' - ')) {
      return raw.split(' - ')[1].trim().toLowerCase();
    }
    return raw.trim().toLowerCase();
  };

  const isSongMatch = (itemA: any, itemB: any): boolean => {
    if (!itemA || !itemB) return false;
    const titleA = getNormalizedSongTitle(itemA);
    const titleB = getNormalizedSongTitle(itemB);
    if (!titleA || !titleB) return false;
    if (titleA === titleB) return true;
    
    const keyA = getCanonicalSongKey(itemA);
    const keyB = getCanonicalSongKey(itemB);
    if (keyA && keyB && keyA === keyB) return true;

    // Check if one contains the other (e.g. "Seven Nation Army" matches "The White Stripes - Seven Nation Army")
    if (titleA.includes(titleB) || titleB.includes(titleA)) return true;

    return false;
  };

  const [simStickerContext, setSimStickerContext] = useState<string>('Simulation');
  const [selectedPreviewSticker, setSelectedPreviewSticker] = useState<any | null>(null);
  const [selectedStickerDetailIdx, setSelectedStickerDetailIdx] = useState<number | null>(null);
  const [isDevSimulationActive, setIsDevSimulationActive] = useState<boolean>(false);
  const [awardedStickerToAnimate, setAwardedStickerToAnimate] = useState<any | null>(null);
  const [schoolName, setSchoolName] = useState<string>('Campus-Groovelab');
  const [shareCardLayout, setShareCardLayout] = useState<'dark' | 'light'>('dark');
  const [sessionLogs, setSessionLogs] = useState<string[]>([]);
  const [lessonDay, setLessonDay] = useState<number>(1);
  const [activeModalTab, setActiveModalTab] = useState<'document' | 'logbook' | 'stickeralbum' | 'skillradar' | 'audiobiography'>(initialModalTab || 'document');

  useEffect(() => {
    if (initialModalTab) {
      setActiveModalTab(initialModalTab);
    }
  }, [initialModalTab]);
  const [simulatedStickers, setSimulatedStickers] = useState<Record<string, { count: number; details: { topic: string; date: string }[] }>>({});
  const currentSchoolYear = useMemo(() => getSchoolYearString(), []);
  const [selectedSchoolYear, setSelectedSchoolYear] = useState<string>(currentSchoolYear);
  const [simulatedSchoolYearData] = useState<Record<string, Record<string, { count: number; details: { topic: string; date: string }[] }>>>({
    '2023/2024': {
      'fleiss-pionier': { count: 1, details: [{ topic: 'Fleiß-Pionier (50 Min)', date: '2023-11-12' }] },
      'uebe-meister': { count: 1, details: [{ topic: 'Übe-Meister (250 Min)', date: '2024-03-15' }] },
      'xp-sammler': { count: 1, details: [{ topic: 'XP-Sammler', date: '2023-10-04' }] },
      'dranbleiber': { count: 1, details: [{ topic: 'Dranbleiber', date: '2023-09-20' }] },
      'erster-erfolg': { count: 1, details: [{ topic: 'Erster Erfolg', date: '2023-10-01' }] }
    },
    '2024/2025': {
      'fleiss-pionier': { count: 1, details: [{ topic: 'Fleiß-Pionier', date: '2024-09-18' }] },
      'uebe-meister': { count: 1, details: [{ topic: 'Übe-Meister', date: '2024-11-05' }] },
      'uebe-legende': { count: 1, details: [{ topic: 'Übe-Legende (1000 Min)', date: '2025-04-10' }] },
      'xp-sammler': { count: 1, details: [{ topic: 'XP-Sammler', date: '2024-09-22' }] },
      'xp-champion': { count: 1, details: [{ topic: 'XP-Champion', date: '2025-01-14' }] },
      'streak-koenig': { count: 1, details: [{ topic: 'Streak-König', date: '2025-02-02' }] },
      'song-sammler': { count: 1, details: [{ topic: 'Song-Sammler', date: '2024-12-01' }] },
      'stage-star': { count: 2, details: [{ topic: 'Stage-Star', date: '2025-06-20' }] }
    }
  });

  const simulateMultiYearProgress = () => {
    setSimulatedStickers({
      'fleiss-pionier': { count: 1, details: [{ topic: 'Fleiß-Pionier', date: '2025-09-10' }] },
      'uebe-meister': { count: 1, details: [{ topic: 'Übe-Meister', date: '2025-11-01' }] },
      'uebe-legende': { count: 1, details: [{ topic: 'Übe-Legende', date: '2026-02-15' }] },
      'uebe-grossmeister': { count: 1, details: [{ topic: 'Übe-Großmeister', date: '2026-05-20' }] },
      'xp-sammler': { count: 1, details: [{ topic: 'XP-Sammler', date: '2025-09-15' }] },
      'xp-champion': { count: 1, details: [{ topic: 'XP-Champion', date: '2025-11-20' }] },
      'xp-meister': { count: 1, details: [{ topic: 'XP-Meister', date: '2026-02-10' }] },
      'xp-legende': { count: 1, details: [{ topic: 'XP-Legende', date: '2026-06-01' }] },
      'streak-kaiser': { count: 1, details: [{ topic: 'Streak-Kaiser', date: '2026-03-01' }] },
      'repertoire-gigant': { count: 1, details: [{ topic: 'Repertoire-Gigant', date: '2026-06-15' }] },
      'stage-star': { count: 3, details: [{ topic: 'Stage-Star', date: '2026-07-01' }] }
    });
    alert('🎉 3 Schuljahre wurden simuliert! Nutze das Schuljahr-Dropdown im Header, um zwischen 2025/2026 (Aktuell), 2024/2025 (Hall of Fame) und 2023/2024 (Hall of Fame) umzuschalten.');
  };

  const triggerCelebrationTest = () => {
    const stickerToCelebrate = ALL_STICKERS.find(s => s.id === 'uebe-grossmeister') || ALL_STICKERS[0];
    setAwardedStickerToAnimate(stickerToCelebrate);
    setSelectedPreviewSticker(stickerToCelebrate);
  };

  // Persistent memory cache for sticker image assets to prevent garbage collection and eliminate loading flicker
  const preloadedStickerImagesRef = useRef<Record<string, HTMLImageElement>>({});

  useEffect(() => {
    ALL_STICKERS.forEach(st => {
      if (!preloadedStickerImagesRef.current[st.id]) {
        const img = new Image();
        img.src = `/stickers/${st.id}.png?v=1`;
        preloadedStickerImagesRef.current[st.id] = img;
      }
    });
  }, []);

  const [stickerCategoryFilter, setStickerCategoryFilter] = useState<'all' | 'ueben' | 'xp' | 'streaks' | 'songs' | 'spezial'>('all');
  const [isXpLegendOpen, setIsXpLegendOpen] = useState<boolean>(false);
  const [activeViewMode, setActiveViewMode] = useState<'document' | 'recordings' | 'loopstation' | 'practice' | 'tuner'>(initialViewMode || (isTeacherTools ? 'loopstation' : 'document'));

  // Speech Recognition & Audio play-along state
  const [isListening, setIsListening] = useState(false);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [audioLabel, setAudioLabel] = useState('');
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);
  const [localJuniorRecordingsTrigger, setLocalJuniorRecordingsTrigger] = useState(0);
  const [mediaRecorderInstance, setMediaRecorderInstance] = useState<MediaRecorder | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const useNotebookLayout = false;
  const recordingTimerRef = React.useRef<any>(null);
  const accumulatedTranscriptRef = React.useRef<string>('');

  // ⏱️ Mechanical Metronome Icon Component
  const MechanicalMetronomeIcon = ({ size = 18, color = "currentColor", strokeWidth = 2 }: { size?: number; color?: string; strokeWidth?: number }) => (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 21h12" />
      <path d="M7.5 21L11 3.5h2l3.5 17.5" />
      <path d="M12 4v17" />
      <path d="M9 13.5l5.5-3" />
      <circle cx="14.5" cy="10.5" r="1.8" fill={color} />
    </svg>
  );

  // 🔍 Unified Omnisearch, Favorites & Month Album States
  const [recordingSearchQuery, setRecordingSearchQuery] = useState<string>("");
  const [selectedTeacherMonth, setSelectedTeacherMonth] = useState<{ key: string; label: string } | null>(null);
  const [selectedStudentMonth, setSelectedStudentMonth] = useState<{ key: string; label: string } | null>(null);
  const [showTeacherFavoritesOnly, setShowTeacherFavoritesOnly] = useState<boolean>(false);
  const [showStudentFavoritesOnly, setShowStudentFavoritesOnly] = useState<boolean>(false);
  const [favoriteAudioUrls, setFavoriteAudioUrls] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(`campus_audio_favorites_${student?.id || "default"}`);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const toggleFavoriteAudio = (audioUrl: string) => {
    setFavoriteAudioUrls(prev => {
      const updated = prev.includes(audioUrl) ? prev.filter(u => u !== audioUrl) : [...prev, audioUrl];
      try {
        localStorage.setItem(`campus_audio_favorites_${student?.id || "default"}`, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  // 📅 KW Week Navigation Offset (0 = Current Week, -1 = Previous Week, etc.)
  const [viewingWeekOffset, setViewingWeekOffset] = useState<number>(0);

  // 🔊 Enterprise+ Sequential Phrase-Queue TTS Engine mit 4 wählbaren Varianten
  // 'neural_thorsten' = Option A: Neuronale KI-Stimme (Piper WASM Studio-Hörbuch)
  // 'neural_kerstin'  = Option A: Neuronale KI-Frauenstimme (Piper WASM)
  // 'cheerful'        = Option B: Fröhlich & Motivierend (Native Acoustic Tuning + Chime)
  // 'classic'         = Option C: Klassisch & Sachlich (Native Pitch 1.0)
  const [ttsMode, setTtsMode] = useState<'neural_thorsten' | 'neural_kerstin' | 'cheerful' | 'classic'>(() => {
    try {
      const saved = localStorage.getItem('campus_tts_mode');
      if (saved === 'neural_thorsten' || saved === 'neural_kerstin' || saved === 'cheerful' || saved === 'classic') {
        return saved;
      }
      return 'neural_thorsten';
    } catch {
      return 'neural_thorsten';
    }
  });

  const [ttsStatusText, setTtsStatusText] = useState<string | null>(null);

  const handleSetTtsMode = useCallback((mode: 'neural_thorsten' | 'neural_kerstin' | 'cheerful' | 'classic') => {
    setTtsMode(mode);
    try {
      localStorage.setItem('campus_tts_mode', mode);
    } catch {}
  }, []);

  const [isTtsSpeaking, setIsTtsSpeaking] = useState<boolean>(false);
  const [activeTtsKey, setActiveTtsKey] = useState<string | null>(null);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>(() => {
    try {
      return localStorage.getItem('campus_tts_voice_uri') || '';
    } catch {
      return '';
    }
  });
  const ttsSessionIdRef = useRef<number>(0);

  // 🎵 Web Audio API Motivational Intro Chime (100% Kostenlos, 0kb Netzwerklast, DSGVO-konform)
  const playMotivationalTtsIntroChime = useCallback((mode: string) => {
    if (mode === 'classic') return; // Kein Chime in Variante classic
    try {
      if (typeof window === 'undefined') return;
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const now = ctx.currentTime;

      // Fröhlicher 4-Ton-Aufgang (C5, E5, G5, C6)
      const notes = [
        { freq: 523.25, time: 0.00, dur: 0.10 },
        { freq: 659.25, time: 0.07, dur: 0.12 },
        { freq: 783.99, time: 0.14, dur: 0.14 },
        { freq: 1046.50, time: 0.21, dur: 0.24 }
      ];

      notes.forEach(({ freq, time, dur }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + time);
        gain.gain.setValueAtTime(0.001, now + time);
        gain.gain.exponentialRampToValueAtTime(0.15, now + time + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + time + dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + time);
        osc.stop(now + time + dur + 0.04);
      });

      setTimeout(() => {
        try {
          ctx.close();
        } catch {
          // ignore
        }
      }, 700);
    } catch (e) {
      console.warn('[TTS] Audio chime failed gracefully:', e);
    }
  }, []);

  // Pre-load and listen to dynamic browser voice registry
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const loadVoices = () => {
      try {
        const v = window.speechSynthesis.getVoices();
        if (v && v.length > 0) {
          setAvailableVoices(v);
        }
      } catch (e) {
        console.warn('[TTS] Failed to load voices:', e);
      }
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  const selectBestGermanVoice = (): SpeechSynthesisVoice | null => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
    const voices = availableVoices.length > 0 ? availableVoices : window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return null;

    const germanVoices = voices.filter(v => v.lang && v.lang.toLowerCase().startsWith('de'));
    if (germanVoices.length === 0) {
      return voices[0] || null;
    }

    // 1. Moderne Microsoft Edge / Azure Neural Voices
    const msNatural = germanVoices.find(v => 
      v.name.includes('Online (Natural)') || 
      (v.name.includes('Natural') && (v.name.includes('Katja') || v.name.includes('Amira') || v.name.includes('Conrad') || v.name.includes('Killian')))
    );
    if (msNatural) return msNatural;

    // 2. Apple Siri & Enhanced/Premium Stimmen
    const siriOrPremium = germanVoices.find(v => 
      v.name.toLowerCase().includes('siri') || 
      v.name.toLowerCase().includes('premium') || 
      v.name.toLowerCase().includes('enhanced') || 
      v.name.toLowerCase().includes('erweitert')
    );
    if (siriOrPremium) return siriOrPremium;

    // 3. Apple Anna / Helena / Martin
    const annaVoice = germanVoices.find(v => v.name.toLowerCase().includes('anna'));
    if (annaVoice) return annaVoice;
    const helenaVoice = germanVoices.find(v => v.name.toLowerCase().includes('helena'));
    if (helenaVoice) return helenaVoice;
    const martinVoice = germanVoices.find(v => v.name.toLowerCase().includes('martin'));
    if (martinVoice) return martinVoice;

    // 4. Google Neural / Android Stimmen
    const googleVoice = germanVoices.find(v => v.name.includes('Google') || v.name.includes('deg-network'));
    if (googleVoice) return googleVoice;

    // 5. Beliebte Synthesizer
    const friendlyVoice = germanVoices.find(v => 
      v.name.toLowerCase().includes('katja') || 
      v.name.toLowerCase().includes('amira') || 
      v.name.toLowerCase().includes('marlene') || 
      v.name.toLowerCase().includes('vicki')
    );
    if (friendlyVoice) return friendlyVoice;

    return germanVoices[0] || null;
  };

  const cleanTextForTts = (text: string): string => {
    if (!text) return '';
    return text
      // Kalenderwochen & Termine
      .replace(/KW\s*(\d+)/gi, 'Kalenderwoche $1')
      // Takte & Seiten mit Bindestrichen
      .replace(/Takt\s*(\d+)\s*[-–]\s*(\d+)/gi, 'Takt $1 bis $2')
      .replace(/S\.\s*(\d+)\s*[-–]\s*(\d+)/gi, 'Seite $1 bis $2')
      .replace(/S\.\s*(\d+)/gi, 'Seite $1')
      .replace(/Seite\s*(\d+)\s*[-–]\s*(\d+)/gi, 'Seite $1 bis $2')
      // Musikalische Taktarten
      .replace(/\b4\/4\s*(?:-?\s*Takt)?/gi, 'Vier-Viertel-Takt')
      .replace(/\b3\/4\s*(?:-?\s*Takt)?/gi, 'Drei-Viertel-Takt')
      .replace(/\b2\/4\s*(?:-?\s*Takt)?/gi, 'Zwei-Viertel-Takt')
      .replace(/\b6\/8\s*(?:-?\s*Takt)?/gi, 'Sechs-Achtel-Takt')
      .replace(/\b12\/8\s*(?:-?\s*Takt)?/gi, 'Zwölf-Achtel-Takt')
      // Dynamik & Spielanweisungen
      .replace(/\bp\/f\b|\bp \/ f\b/gi, 'piano und forte')
      .replace(/\bfff\b/gi, 'sehr sehr laut, fortississimo')
      .replace(/\bff\b/gi, 'fortissimo, sehr kräftig')
      .replace(/\bpp\b/gi, 'pianissimo, sehr leise')
      // Metronom & Einheiten
      .replace(/(\d+)\s*BPM/gi, '$1 Schläge pro Minute')
      .replace(/BPM/gi, 'Schläge pro Minute')
      .replace(/(\d+)\s*min\b/gi, '$1 Minuten')
      .replace(/(\d+)\s*sek\b/gi, '$1 Sekunden')
      .replace(/(\d+)\s*x\b/gi, '$1 mal')
      // Begrifflichkeiten
      .replace(/z\.\s*B\./gi, 'zum Beispiel')
      .replace(/bzw\./gi, 'beziehungsweise')
      .replace(/inkl\./gi, 'inklusive')
      .replace(/evtl\./gi, 'eventuell')
      .replace(/Übe-Timer/gi, 'Übe-Timer')
      .replace(/Play-Along/gi, 'Play Along')
      .replace(/•/g, ', ')
      .replace(/#/g, 'Nummer ')
      // Keine Emojis buchstabieren
      .replace(/[\u{1F300}-\u{1F9FF}]/gu, '')
      .replace(/[\u{2600}-\u{27BF}]/gu, '')
      // Bindestriche zu sanften Sprechpausen machen
      .replace(/\s*[-–—]\s*/g, ', ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const handleStopSpeaking = () => {
    ttsSessionIdRef.current += 1;
    stopNeuralSpeech();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsTtsSpeaking(false);
    setActiveTtsKey(null);
    setTtsStatusText(null);
  };

  // Ensure speech is cancelled on component unmount
  useEffect(() => {
    return () => {
      ttsSessionIdRef.current += 1;
      stopNeuralSpeech();
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleSpeakText = async (textOrPhrases: string | string[], elementKey: string = 'global') => {
    if (isTtsSpeaking && activeTtsKey === elementKey) {
      handleStopSpeaking();
      return;
    }

    handleStopSpeaking();

    // Raw phrase extraction
    const rawPhrases = Array.isArray(textOrPhrases)
      ? [...textOrPhrases]
      : textOrPhrases
          .split(/(?<=[.!?])\s+/)
          .filter(p => p.trim().length > 0);

    const phrases = rawPhrases
      .map(p => cleanTextForTts(p))
      .filter(p => p.length > 0);

    if (phrases.length === 0) return;

    const currentSessionId = ++ttsSessionIdRef.current;
    setIsTtsSpeaking(true);
    setActiveTtsKey(elementKey);

    // 🌟 Native Fallback / Native Tuning Engine (Web Speech API)
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      alert('Sprachausgabe wird in diesem Browser nicht unterstützt.');
      setIsTtsSpeaking(false);
      setActiveTtsKey(null);
      return;
    }

    const bestVoice = selectBestGermanVoice();

    // 🎵 Fröhlicher Chime
    playMotivationalTtsIntroChime('cheerful');
    await new Promise((r) => setTimeout(r, 220));

    for (let i = 0; i < phrases.length; i++) {
      if (ttsSessionIdRef.current !== currentSessionId) {
        break; // Cancelled
      }

      const phrase = phrases[i];
      await new Promise<void>((resolve) => {
        const utterance = new SpeechSynthesisUtterance(phrase);
        utterance.lang = 'de-DE';
        
        utterance.pitch = 1.04;
        utterance.rate = 0.91;
        utterance.volume = 0.65;

        if (bestVoice) {
          utterance.voice = bestVoice;
        }

        utterance.onend = () => {
          resolve();
        };

        utterance.onerror = (e) => {
          console.warn('[TTS] Phrase speech error:', e);
          resolve();
        };

        window.speechSynthesis.speak(utterance);
      });

      if (ttsSessionIdRef.current !== currentSessionId) {
        break; // Cancelled during utterance
      }

      if (i < phrases.length - 1) {
        await new Promise((r) => setTimeout(r, 260));
      }
    }

    if (ttsSessionIdRef.current === currentSessionId) {
      setIsTtsSpeaking(false);
      setActiveTtsKey(null);
      setTtsStatusText(null);
    }
  };

  const buildCompleteWeeklyHomeworkSpeechPhrases = (
    weekNumber: string,
    lehrwerkeList: { title: string; pages: number[]; notes?: string[] }[],
    songList: { title: string; note?: string }[],
    audioNotes: { label?: string }[],
    generalNoteText: string
  ): string[] => {
    if (lehrwerkeList.length === 0 && songList.length === 0 && (!audioNotes || audioNotes.length === 0) && (!generalNoteText || !generalNoteText.trim())) {
      return ['Für diese Woche sind noch keine Hausaufgaben eingetragen.'];
    }

    const narrative = buildContinuousHomeworkNarrative({
      teacherName: (student as any)?.teacher_name || (student as any)?.teacher?.name,
      instrument: (student as any)?.instrument || (student as any)?.instrument_type,
      books: lehrwerkeList.map(b => ({
        title: b.title,
        pageNums: b.pages,
        notes: b.notes
      })),
      songs: songList.map(s => ({
        title: s.title,
        note: s.note
      })),
      audioCount: audioNotes ? audioNotes.length : 0,
      generalNotes: generalNoteText
    });

    return [narrative];
  };

  const generateSmartAudioTitle = (isTeacher: boolean, customLabel?: string): string => {
    if (customLabel && customLabel.trim()) return customLabel.trim();

    const now = getSimulatedNow();
    const weekdayShort = now.toLocaleDateString("de-DE", { weekday: "short" });
    const dateShort = now.toLocaleDateString("de-DE", { day: "2-digit", month: "short" });
    const timeShort = now.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });

    // 1. Check if active piece / topic name exists
    const activePiece = (topicName || "").trim();
    if (activePiece && !activePiece.toLowerCase().startsWith("hausaufgabe") && !activePiece.toLowerCase().startsWith("allgemein")) {
      return `${activePiece} • ${weekdayShort}, ${timeShort}`;
    }

    // 2. Role-based smart naming
    if (isTeacher) {
      return `Unterrichts-Audio • ${weekdayShort}, ${dateShort}`;
    } else {
      return `Übe-Take • ${weekdayShort}, ${dateShort} (${timeShort})`;
    }
  };

  // ⏱️ Recording Metronome / Click State
  const [isRecordingMetronomeActive, setIsRecordingMetronomeActive] = useState<boolean>(false);
  const [recordingBpm, setRecordingBpm] = useState<number>(100);
  const [showRecordingMetronomePopup, setShowRecordingMetronomePopup] = useState<boolean>(false);
  const recordingMetronomeIntervalRef = useRef<any>(null);

  const playMetronomeTick = (isAccent: boolean) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(isAccent ? 1200 : 800, ctx.currentTime);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.045);
    } catch {}
  };

  useEffect(() => {
    if (isRecordingAudio && isRecordingMetronomeActive) {
      const intervalMs = (60 / recordingBpm) * 1000;
      let beat = 0;
      playMetronomeTick(true);
      recordingMetronomeIntervalRef.current = setInterval(() => {
        beat = (beat + 1) % 4;
        playMetronomeTick(beat === 0);
      }, intervalMs);
    } else {
      if (recordingMetronomeIntervalRef.current) {
        clearInterval(recordingMetronomeIntervalRef.current);
        recordingMetronomeIntervalRef.current = null;
      }
    }

    return () => {
      if (recordingMetronomeIntervalRef.current) {
        clearInterval(recordingMetronomeIntervalRef.current);
        recordingMetronomeIntervalRef.current = null;
      }
    };
  }, [isRecordingAudio, isRecordingMetronomeActive, recordingBpm]);

  const [hasTresorStorage, setHasTresorStorage] = useState<boolean>(() => {
    if (propHasTresor === true) return true;
    return checkIsAudioTresorActive(student);
  });

  useEffect(() => {
    if (propHasTresor === true) {
      setHasTresorStorage(true);
    } else {
      setHasTresorStorage(checkIsAudioTresorActive(student));
    }
  }, [propHasTresor, student]);

  useEffect(() => {
    let active = true;
    const checkTresor = async () => {
      if (propHasTresor === true || checkIsAudioTresorActive(student)) {
        if (active) setHasTresorStorage(true);
        return;
      }
      let targetSchoolId = 
        student?.school_id || 
        (student as any)?.schoolId || 
        (student as any)?.schools?.id ||
        (student as any)?.school?.id ||
        sessionStorage.getItem('groovelab_school_id') || 
        localStorage.getItem('groovelab_school_id') || 
        sessionStorage.getItem('campus_school_id') ||
        localStorage.getItem('campus_school_id') ||
        localStorage.getItem('groovelab_last_school_id') ||
        localStorage.getItem('school_id');

      if (!targetSchoolId) {
        try {
          const cachedUser = JSON.parse(localStorage.getItem('groovelab_cached_user') || '{}');
          if (cachedUser?.school_id) targetSchoolId = cachedUser.school_id;
        } catch (e) {}
      }

      if (!targetSchoolId && student?.id && student.id !== 'teacher-self') {
        try {
          const { data: stRec } = await supabase
            .from('users')
            .select('school_id')
            .eq('id', student.id)
            .maybeSingle();
          if (stRec?.school_id) targetSchoolId = stRec.school_id;
        } catch (e) {}
      }

      if (!targetSchoolId) {
        try {
          const currentUid = typeof window !== 'undefined' ? sessionStorage.getItem('groovelab_user_id') : null;
          if (currentUid) {
            const { data: uRec } = await supabase
              .from('users')
              .select('school_id')
              .eq('id', currentUid)
              .maybeSingle();
            if (uRec?.school_id) targetSchoolId = uRec.school_id;
          }
        } catch (e) {}
      }

      if (targetSchoolId) {
        try {
          const { data: sch } = await supabase
            .from('schools')
            .select('storage_addon_gb, storage_addon_status')
            .eq('id', targetSchoolId)
            .maybeSingle();
          if (active && sch && Number(sch.storage_addon_gb || 0) > 0 && sch.storage_addon_status !== 'cancelled') {
            setHasTresorStorage(true);
            return;
          }
        } catch (e) {}
      }

      // Fallback: check if the primary active school has booked Audio-Tresor
      try {
        const { data: activeSchools } = await supabase
          .from('schools')
          .select('id, storage_addon_gb, storage_addon_status')
          .gt('storage_addon_gb', 0)
          .neq('storage_addon_status', 'cancelled')
          .limit(1);
        if (active && activeSchools && activeSchools.length > 0) {
          setHasTresorStorage(true);
        }
      } catch (e) {}
    };
    checkTresor();
    return () => { active = false; };
  }, [student, propHasTresor]);

  const formatRecordTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
          mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        } catch (e) {
          console.warn("Failed to stop media recorder on unmount:", e);
        }
      }
      if ((window as any).recognitionInstance) {
        try {
          (window as any).recognitionInstance.stop();
        } catch (e) {
          console.warn("Failed to stop speech recognition on unmount:", e);
        }
      }
    };
  }, []);
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
      const textToAppend = data?.summary ? `• ${data.summary}` : `• ${textStr}`;
      
      if (activeInputTab === 'active_song') {
        setSongHomeworkNotes(prev => prev ? `${prev}\n${textToAppend}` : textToAppend);
      } else if (activeInputTab === 'lehrwerk_page') {
        setPageHomeworkNotes(prev => prev ? `${prev}\n${textToAppend}` : textToAppend);
      } else {
        setGeneralHomeworkNotes(prev => prev ? `${prev}\n${textToAppend}` : textToAppend);
      }
      setHasChanges(true);
      triggerDebouncedAutoSave(300);
    } catch (e) {
      console.error("Error summarizing voice notes:", e);
      const textToAppend = `• ${textStr}`;
      if (activeInputTab === 'active_song') {
        setSongHomeworkNotes(prev => prev ? `${prev}\n${textToAppend}` : textToAppend);
      } else if (activeInputTab === 'lehrwerk_page') {
        setPageHomeworkNotes(prev => prev ? `${prev}\n${textToAppend}` : textToAppend);
      } else {
        setGeneralHomeworkNotes(prev => prev ? `${prev}\n${textToAppend}` : textToAppend);
      }
      setHasChanges(true);
      triggerDebouncedAutoSave(300);
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
    const userRoleInSession = sessionStorage.getItem('groovelab_user_role') || localStorage.getItem('groovelab_user_role');
    const isStudentActor = !isTeacherTools && userRoleInSession?.toLowerCase() === 'student';
    if (isStudentActor) {
      const isAudioAllowed = (student as any)?.parent_allow_audio !== false && 
        (typeof window !== 'undefined' ? localStorage.getItem('campus_board_override_recordings') !== 'false' && localStorage.getItem('campus_allow_audio') !== 'false' : true);
      if (!isAudioAllowed) {
        alert('Die Aufnahme-Funktion ist im Eltern-Kontrollzentrum aktuell deaktiviert.');
        return;
      }
    }

    const audioNotesCount = homeworkNotesList.filter(note => note.startsWith("AUDIO:")).length;
    if (!hasTresorStorage && audioNotesCount >= 12) {
      alert("Limit erreicht! Du hast bereits 12 Sprachaufnahmen in diesem Protokoll. Bitte lösche eine alte Sprachaufnahme, bevor du eine neue aufnimmst.");
      return;
    }
    let durationInSeconds = 0;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          googEchoCancellation: false,
          googAutoGainControl: false,
          googNoiseSuppression: false,
          googHighpassFilter: false,
          googTypingNoiseDetection: false,
          channelCount: 1,
          sampleRate: 48000
        } as any
      });

      // 🌟 WebAudio Dual-Channel Center Bridge:
      // Takes raw microphone input and routes it 1:1 identically to Left and Right channels (100% centered stereo, 0 left-bias!)
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const recordAudioCtx = new AudioCtx();
      const sourceNode = recordAudioCtx.createMediaStreamSource(stream);
      const mergerNode = recordAudioCtx.createChannelMerger(2);
      sourceNode.connect(mergerNode, 0, 0); // Duplicate to Left
      sourceNode.connect(mergerNode, 0, 1); // Duplicate to Right
      const destNode = recordAudioCtx.createMediaStreamDestination();
      mergerNode.connect(destNode);
      const recordStream = destNode.stream;

      // 🎙️ Dynamic Audio Quality Adaptation based on Audio-Tresor Storage
      let targetSchoolId = student?.school_id || (student as any)?.schoolId || localStorage.getItem('groovelab_school_id') || localStorage.getItem('campus_school_id');
      let effectiveTresor = hasTresorStorage;
      if (targetSchoolId && !effectiveTresor) {
        try {
          const { data: sch } = await supabase
            .from('schools')
            .select('storage_addon_gb, storage_addon_status')
            .eq('id', targetSchoolId)
            .maybeSingle();
          if (sch && Number(sch.storage_addon_gb || 0) > 0 && sch.storage_addon_status !== 'cancelled') {
            effectiveTresor = true;
            setHasTresorStorage(true);
          }
        } catch (e) {}
      }

      // 256 kbps Crystal-Clear Studio Audio when Audio-Tresor is booked, else 128 kbps High-Quality Audio
      const targetBitrate = hasTresorStorage ? 256000 : 128000;
      let mimeType = 'audio/webm;codecs=opus';
      if (typeof MediaRecorder !== 'undefined') {
        if (!MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          if (MediaRecorder.isTypeSupported('audio/webm')) mimeType = 'audio/webm';
          else if (MediaRecorder.isTypeSupported('audio/mp4')) mimeType = 'audio/mp4';
          else if (MediaRecorder.isTypeSupported('audio/aac')) mimeType = 'audio/aac';
          else mimeType = '';
        }
      }

      let recorder: MediaRecorder;
      try {
        recorder = mimeType 
          ? new MediaRecorder(recordStream, { mimeType, audioBitsPerSecond: targetBitrate }) 
          : new MediaRecorder(recordStream, { audioBitsPerSecond: targetBitrate });
      } catch (recErr) {
        recorder = new MediaRecorder(recordStream);
      }
      const chunks: BlobPart[] = [];
      
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };
      
      recorder.onstop = async () => {
        try {
          stream.getTracks().forEach(track => track.stop());
          recordStream.getTracks().forEach(track => track.stop());
          if (recordAudioCtx && recordAudioCtx.state !== 'closed') {
            recordAudioCtx.close().catch(() => {});
          }
        } catch (e) {}

        const rawBlob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
        // 🎙️ 100% PURE RAW + EBU R128 Loudness Calibration (-14.5 LUFS / -1.0 dBTP):
        let blob = rawBlob;
        let url = '';
        try {
          const pureRawRes = await processPureRawBlob(rawBlob, { targetLufs: TARGET_PURE_RAW_LUFS, targetPeakDb: TARGET_PEAK_DBTP });
          blob = pureRawRes.processedBlob;
          url = pureRawRes.processedUrl;
          if (pureRawRes.durationSec) {
            durationInSeconds = Math.round(pureRawRes.durationSec);
          }
        } catch (dspErr) {
          console.warn('[MeisterwerkDocumentationModal] Pure RAW DSP fallback:', dspErr);
          url = URL.createObjectURL(rawBlob);
        }

        setAudioBlob(blob);
        setAudioUrl(url);
        
        setIsUploadingAudio(true);

        const saveAudioMetadata = async (audioUrlString: string) => {
          try {
            const userRoleInSession = sessionStorage.getItem('groovelab_user_role') || localStorage.getItem('groovelab_user_role');
            const isStudentSession = userRoleInSession === 'student' || readOnly || (!isTeacherTools && student.id !== 'teacher-self');
            
            if (blob) {
              await storeBlob(audioUrlString, blob).catch(() => {});
            }

            if (isStudentSession) {
              // 🎓 STUDENT RECORDING -> Stored on the RIGHT side in `campus_junior_recordings_${student.id}`
              const juniorKey = `campus_junior_recordings_${student.id}`;
              let existing: any[] = [];
              try {
                const stored = localStorage.getItem(juniorKey);
                if (stored) {
                  const parsed = JSON.parse(stored);
                  if (Array.isArray(parsed)) existing = parsed;
                }
              } catch {}

              const recDuration = durationInSeconds || Math.round(audioDuration) || 1;
              const smartTitle = generateSmartAudioTitle(false, audioLabel);
              const newRec = {
                id: `stud-${Date.now()}`,
                url: audioUrlString,
                duration: recDuration,
                date: new Date().toISOString(),
                title: smartTitle,
                label: smartTitle,
                visibility: 'private'
              };

              const updated = [newRec, ...existing];
              localStorage.setItem(juniorKey, JSON.stringify(updated));
              setLocalJuniorRecordingsTrigger(prev => prev + 1);
            } else {
              // 👨‍🏫 TEACHER NOTE -> Stored on the LEFT side in `homeworkNotesList`
              const creatorRole = 'teacher';
              const initialVisibility = 'shared_with_teacher';
              const smartTitle = generateSmartAudioTitle(true, audioLabel);
              const audioMetaStr = `AUDIO:${audioUrlString}|${durationInSeconds}|${new Date().toISOString()}|${smartTitle}|${creatorRole}|${initialVisibility}`;
              
              setHomeworkNotesList(prev => {
                const updated = [...prev, audioMetaStr];
                syncHomeworkNotes(updated).catch(err => console.warn('[saveAudioMetadata] syncHomeworkNotes note:', err));
                return updated;
              });
            }
            
            await fetchProgress().catch(() => {});
            notifyHomeworkChange();
            setAudioLabel('');
          } catch (saveErr) {
            console.warn("Failed to save audio metadata (fallback handled):", saveErr);
          }
        };

        try {
          const fileExt = hasTresorStorage ? 'wav' : (blob.type.includes('wav') ? 'wav' : blob.type.includes('webm') ? 'webm' : blob.type.includes('ogg') ? 'ogg' : 'mp3');
          const contentType = hasTresorStorage ? 'audio/wav' : (blob.type || 'audio/webm');
          const fileName = `${student.id}_feedback_${Date.now()}.${fileExt}`;
          const filePath = `recordings/${fileName}`;
          
          let uploadedUrl = url;
          try {
            const { error: uploadErr } = await supabase.storage
              .from('campus-assets')
              .upload(filePath, blob, { 
                contentType,
                cacheControl: 'private, max-age=3600' 
              });
              
            if (!uploadErr) {
              const { data: publicUrlData } = supabase.storage
                .from('campus-assets')
                .getPublicUrl(filePath);
              if (publicUrlData?.publicUrl) {
                uploadedUrl = publicUrlData.publicUrl;
              }
            } else {
              console.warn('[Meisterwerk] Supabase storage upload notice, storing locally in IndexedDB:', uploadErr);
              const localKey = `campus_blob_${fileName}`;
              await storeBlob(localKey, blob);
              uploadedUrl = localKey;
            }
          } catch (storageErr) {
            console.warn('[Meisterwerk] Storage notice, using local key:', storageErr);
            const localKey = `campus_blob_${fileName}`;
            await storeBlob(localKey, blob);
            uploadedUrl = localKey;
          }
            
          await saveAudioMetadata(uploadedUrl);

          // 🎙️ UPDATE AUDIO-TRESOR STORAGE QUOTA (Consumes school storage_used_bytes)
          let targetSchoolId = student?.school_id || (student as any)?.schoolId || localStorage.getItem('groovelab_school_id') || localStorage.getItem('campus_school_id');
          if (!targetSchoolId && student?.id) {
            try {
              const { data: stRec } = await supabase
                .from('students')
                .select('school_id')
                .eq('id', student.id)
                .maybeSingle();
              if (stRec?.school_id) targetSchoolId = stRec.school_id;
            } catch (stErr) {
              console.warn('[Meisterwerk] School lookup note:', stErr);
            }
          }
          if (targetSchoolId && blob?.size) {
            try {
              const { data: schoolData } = await supabase
                .from('schools')
                .select('storage_used_bytes')
                .eq('id', targetSchoolId)
                .maybeSingle();
              if (schoolData) {
                const currentBytes = Number(schoolData.storage_used_bytes || 0);
                const updatedBytes = currentBytes + blob.size;
                await supabase
                  .from('schools')
                  .update({ storage_used_bytes: updatedBytes })
                  .eq('id', targetSchoolId);

                // Keep local school overrides in sync
                try {
                  const overridesStr = localStorage.getItem('groovelab_school_overrides') || '{}';
                  const overrides = JSON.parse(overridesStr);
                  if (overrides[targetSchoolId]) {
                    overrides[targetSchoolId].storage_used_bytes = updatedBytes;
                    localStorage.setItem('groovelab_school_overrides', JSON.stringify(overrides));
                  }
                } catch (e) {}
              }
            } catch (quotaErr) {
              console.warn('[Meisterwerk] Storage quota update note:', quotaErr);
            }
          }
        } catch (err: any) {
          console.warn("Storage upload note, saving locally:", err);
          const localFallbackUrl = url || URL.createObjectURL(blob);
          await saveAudioMetadata(localFallbackUrl);
        } finally {
          setIsUploadingAudio(false);
        }
      };

      setAudioDuration(0);
      setIsRecordingAudio(true);
      recorder.start(250);
      setMediaRecorderInstance(recorder);
      mediaRecorderRef.current = recorder;
      
      const maxRecordSeconds = effectiveTresor ? 420 : 60;

      recordingTimerRef.current = setInterval(() => {
        durationInSeconds += 1;
        setAudioDuration(durationInSeconds);
        if (durationInSeconds >= maxRecordSeconds) {
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
      try {
        rec.requestData();
      } catch (e) {}
      rec.stop();
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }
    setIsRecordingAudio(false);
  };

  const awardSticker = async (stickerId: string, topicNameContext?: string) => {
    try {
      const st = ALL_STICKERS.find(s => s.id === stickerId);
      // Duplicate Protection: If single-award sticker (multi === false) is already collected, do not add duplicate
      if (st && st.multi === false && collectedStickers[stickerId] && collectedStickers[stickerId].count > 0) {
        if (st) setAwardedStickerToAnimate(st);
        return;
      }

      const targetTopic = topicNameContext || topicName || `Allgemein`;
      const dateStr = new Date().toISOString();

      // Update simulatedStickers state so the Sticker Board renders the sticker immediately
      setSimulatedStickers(prev => {
        const existing = prev[stickerId] || { count: 0, details: [] };
        return {
          ...prev,
          [stickerId]: {
            count: existing.count + 1,
            details: [...existing.details, { topic: targetTopic, date: dateStr }]
          }
        };
      });

      await fetchProgress();
      notifyHomeworkChange();
      
      // Trigger visual confetti animation modal
      if (st) {
        setAwardedStickerToAnimate(st);
      }
    } catch (e) {
      console.error("Error awarding sticker:", e);
    }
  };

  const handleClose = async () => {
    if (autoSaveDebounceTimerRef.current) {
      clearTimeout(autoSaveDebounceTimerRef.current);
    }
    if (hasChanges && !readOnly) {
      try {
        await handleSave(true);
      } catch (e) {
        console.warn('Auto-save on close error:', e);
      }
    }
    onClose();
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

  // Custom song & lehrwerk creation form states
  const [showCreateSongModal, setShowCreateSongModal] = useState(false);
  const [songModalTab, setSongModalTab] = useState<'catalog' | 'create'>('catalog');
  const [newSongTitle, setNewSongTitle] = useState('');
  const [newSongArtist, setNewSongArtist] = useState('');

  const [showCreateLehrwerkModal, setShowCreateLehrwerkModal] = useState(false);
  const [newLehrwerkTitle, setNewLehrwerkTitle] = useState('');
  const [newLehrwerkPages, setNewLehrwerkPages] = useState('50');
  const [newLehrwerkLoading, setNewLehrwerkLoading] = useState(false);

  // 💽 Share Audio Recording to Audio-Biografie Playlist State
  const [shareAudioModal, setShareAudioModal] = useState<{
    isOpen: boolean;
    audioUrl: string;
    duration: number;
    label: string;
    date?: string;
  } | null>(null);

  const [sharePlaylistId, setSharePlaylistId] = useState<string>('');
  const [shareProcessing, setShareProcessing] = useState<'raw' | 'master'>('master');
  const [shareCustomTitle, setShareCustomTitle] = useState<string>('');
  const [isSharingToPlaylist, setIsSharingToPlaylist] = useState<boolean>(false);
  const [showNewPlaylistInput, setShowNewPlaylistInput] = useState<boolean>(false);
  const [newPlaylistTitle, setNewPlaylistTitle] = useState<string>('');
  const [availablePlaylists, setAvailablePlaylists] = useState<CustomPlaylist[]>([]);

  const handleToggleAudioVisibility = async (originalIdx: number) => {
    const currentNote = homeworkNotesList[originalIdx];
    if (!currentNote || !currentNote.startsWith('AUDIO:')) return;
    const parts = currentNote.substring(6).split('|');
    const currentVis = parts[5] || 'private';
    const newVis = currentVis === 'shared_with_teacher' ? 'private' : 'shared_with_teacher';
    parts[5] = newVis;
    const updatedNote = `AUDIO:${parts.join('|')}`;
    const updatedList = [...homeworkNotesList];
    updatedList[originalIdx] = updatedNote;
    setHomeworkNotesList(updatedList);
    await syncHomeworkNotes(updatedList);
    notifyHomeworkChange();
  };

  const handleOpenShareModal = (aud: { url: string; duration: number; label: string; date?: string }) => {
    const playlistsKey = `campus_custom_playlists_${student.id}`;
    let playlists: CustomPlaylist[] = [];
    const saved = localStorage.getItem(playlistsKey);
    if (saved) {
      try {
        playlists = JSON.parse(saved);
      } catch {}
    }
    if (!playlists || playlists.length === 0) {
      playlists = [
        {
          id: 'pl_meilenstein_lp',
          title: '🏆 Meine Meilenstein-LP',
          vibeTheme: 'sunset_gold',
          iconName: 'trophy',
          createdAt: 'Schuljahr 2026/2027',
          tracks: []
        },
        {
          id: 'pl_lieblingssongs',
          title: '⭐ Meine Lieblingslieder-Playlist',
          vibeTheme: 'midnight_neon',
          iconName: 'heart',
          createdAt: 'Schuljahr 2026/2027',
          tracks: []
        },
        {
          id: 'pl_sommerhits',
          title: '☀️ Meine Sommerhits-Playlist',
          vibeTheme: 'ocean_cyan',
          iconName: 'sun',
          createdAt: 'Schuljahr 2026/2027',
          tracks: []
        }
      ];
      localStorage.setItem(playlistsKey, JSON.stringify(playlists));
    }

    setAvailablePlaylists(playlists);
    setSharePlaylistId(playlists[0]?.id || 'pl_meilenstein_lp');
    setShareProcessing('master');
    setShareCustomTitle(aud.label || 'Meine Aufnahme');
    setShowNewPlaylistInput(false);
    setNewPlaylistTitle('');
    setShareAudioModal({
      isOpen: true,
      audioUrl: aud.url,
      duration: aud.duration,
      label: aud.label,
      date: aud.date
    });
  };

  const handleSaveShareToPlaylist = async () => {
    if (!shareAudioModal) return;
    setIsSharingToPlaylist(true);

    try {
      const playlistsKey = `campus_custom_playlists_${student.id}`;
      let playlists: CustomPlaylist[] = [...availablePlaylists];
      const saved = localStorage.getItem(playlistsKey);
      if (saved) {
        try {
          playlists = JSON.parse(saved);
        } catch {}
      }

      let targetPlaylistId = sharePlaylistId;

      if (showNewPlaylistInput && newPlaylistTitle.trim()) {
        const newPl: CustomPlaylist = {
          id: `pl_custom_${Date.now()}`,
          title: newPlaylistTitle.trim(),
          vibeTheme: 'forest_emerald',
          iconName: 'music',
          createdAt: `Schuljahr 2026/2027`,
          tracks: []
        };
        playlists.push(newPl);
        targetPlaylistId = newPl.id;
      }

      const targetPl = playlists.find(p => p.id === targetPlaylistId) || playlists[0];
      if (!targetPl) throw new Error('Keine Playliste gefunden');

      const trackId = `track_${Date.now()}`;
      let rawBlob: Blob | null = null;
      let masterBlob: Blob | null = null;

      try {
        const resp = await fetch(shareAudioModal.audioUrl);
        rawBlob = await resp.blob();
      } catch (fetchErr) {
        console.warn('Could not fetch blob from URL directly:', fetchErr);
      }

      let masteredAudioUrl = shareAudioModal.audioUrl;

      if (rawBlob) {
        await storeBlob(`campus_audio_${trackId}_raw`, rawBlob);

        if (shareProcessing === 'master') {
          try {
            const masteredResult = await processStudioMastering(rawBlob, { 
              profile: 'acoustic_audiophile',
              targetLufs: TARGET_STUDIO_LUFS,
              targetPeakDb: TARGET_PEAK_DBTP
            });
            if (masteredResult && masteredResult.masteredBlob) {
              masterBlob = masteredResult.masteredBlob;
              await storeBlob(`campus_audio_${trackId}_master`, masterBlob);
              masteredAudioUrl = URL.createObjectURL(masterBlob);
            }
          } catch (dspErr) {
            console.warn('[Meisterwerk] DSP mastering fallback to raw:', dspErr);
          }
        }
      }

      const newTrack: CustomPlaylistTrack = {
        id: trackId,
        title: shareCustomTitle.trim() || shareAudioModal.label || 'Aufnahme',
        subtitle: shareProcessing === 'master' ? '✨ Studio Master' : '🎙️ Pure Raw',
        audioUrl: shareAudioModal.audioUrl,
        masteredAudioUrl: shareProcessing === 'master' ? masteredAudioUrl : undefined,
        duration: shareAudioModal.duration,
        recordedAt: shareAudioModal.date || new Date().toISOString(),
        preferredVersion: shareProcessing
      };

      if (!targetPl.tracks) targetPl.tracks = [];
      targetPl.tracks.push(newTrack);
      localStorage.setItem(playlistsKey, JSON.stringify(playlists));

      setIsSharingToPlaylist(false);
      setShareAudioModal(null);
      alert(`✨ Track "${newTrack.title}" erfolgreich zur Playliste "${targetPl.title}" hinzugefügt!`);
    } catch (err: any) {
      console.error('Failed to share track to playlist:', err);
      setIsSharingToPlaylist(false);
      alert('Fehler beim Hinzufügen zur Playliste: ' + (err?.message || 'Unbekannter Fehler'));
    }
  };

  const getCurrentTeacherId = async (): Promise<string> => {
    if (teacherId) return teacherId;
    if ((student as any).teacher_id) return (student as any).teacher_id;
    try {
      if (student.id && student.id !== 'teacher-self') {
        const { data: stUser } = await supabase.from('users').select('teacher_id').eq('id', student.id).maybeSingle();
        if (stUser?.teacher_id) return stUser.teacher_id;
      }
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
    // Valid teacher fallback UUID
    return '11079eae-664a-49a4-8692-771d83a3193c';
  };

  const [activeRhythmSong, setActiveRhythmSong] = useState<{ songTitle: string; targetBpm: number; songId?: string } | null>(null);

  const syncHomeworkNotes = async (notesList: string[]) => {
    if (student.id === 'teacher-self') {
      console.log("Teacher-self practice: skipping database homework notes synchronization.");
      return;
    }
    const currentWeek = getISOWeek();
    const allNotesJson = JSON.stringify(notesList);
    const cleanNotesJson = JSON.stringify(notesList.filter(n => !n.startsWith('AUDIO:')));

    // Always backup to localStorage
    try {
      localStorage.setItem(`campus_homework_notes_${student.id}`, allNotesJson);
      localStorage.setItem(`campus_teacher_notes_${student.id}`, teacherNotes.trim());
    } catch (lsErr) {
      console.warn('[Meisterwerk] localStorage cache notice:', lsErr);
    }

    try {
      const dummyWeeklyItem = progressItems.find(item => 
        item.topic_name.startsWith('Hausaufgabe KW ') && 
        getItemWeek(item) === currentWeek
      );

      if (dummyWeeklyItem) {
        const { error } = await supabase
          .from('progress_matrix')
          .update({ homework_notes: allNotesJson, teacher_notes: teacherNotes.trim(), updated_at: new Date().toISOString() })
          .eq('id', dummyWeeklyItem.id);
        if (error) console.warn('[syncHomeworkNotes] Supabase update warning:', error);
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
            teacher_notes: teacherNotes.trim(),
            homework_notes: allNotesJson,
            updated_at: new Date().toISOString()
          });
        if (error) console.warn('[syncHomeworkNotes] Supabase insert warning:', error);
      }
    } catch (dbErr) {
      console.warn('[syncHomeworkNotes] Supabase sync notice (cached locally):', dbErr);
    }
  };



  // Fetch student's school's songs catalog (Strictly Teacher's Campus Mediathek)
  useEffect(() => {
    async function loadSongs() {
      if (student.id === 'teacher-self') {
        setSongsLoading(false);
        return;
      }
      setSongsLoading(true);
      try {
        const { data: studentUser, error: studentError } = await supabase
          .from('users')
          .select('school_id, teacher_id')
          .eq('id', student.id)
          .maybeSingle();

        if (studentError) throw studentError;

        const effectiveSchoolId = studentUser?.school_id || (student as any)?.school_id || studentSchoolId;
        const activeTId = teacherId || studentUser?.teacher_id || await getCurrentTeacherId();

        if (effectiveSchoolId) {
          let sq = supabase
            .from('songs')
            .select('*')
            .eq('school_id', effectiveSchoolId)
            .eq('is_campus_active', true);
          
          if (activeTId) {
            sq = sq.eq('teacher_id', activeTId);
          }
          
          const { data: songsData, error: songsError } = await sq.order('title', { ascending: true });

          if (songsError) throw songsError;
          const cleanSongs = (songsData || []).filter(s => {
            const t = (s.title || '').toLowerCase().trim();
            return t !== 'test' && t !== 'test - test' && t !== 'test-test';
          });
          setSongs(cleanSongs);
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
  }, [student.id, teacherId]);

  useEffect(() => {
    const loadLessonDay = async () => {
      if (student.id === 'teacher-self') return;
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
      const schoolId = resolvedSchoolId || student?.school_id || (student as any)?.schoolId || studentSchoolId || localStorage.getItem('campus_school_id') || localStorage.getItem('groovelab_school_id') || localStorage.getItem('school_id');
      const effectiveTeacherId = teacherId || activeTId;

      let conditions: string[] = [];
      if (schoolId) conditions.push(`school_id.eq.${schoolId}`);
      if (effectiveTeacherId) conditions.push(`teacher_id.eq.${effectiveTeacherId}`);
      conditions.push(`school_id.is.null`);

      if (conditions.length > 0) {
        query = query.or(conditions.join(','));
      }
      const { data: lehrwerkeData, error } = await query.order('title');
      if (error) console.warn('Lehrwerke load note:', error);

      let mapped: any[] = [];
      if (lehrwerkeData && lehrwerkeData.length > 0) {
        mapped = lehrwerkeData.map((item: any) => ({
          ...item,
          totalPages: item.total_pages || 50,
          emoji: item.emoji || '📖',
          color: item.color || '#34a853'
        }));
      }

      // Merge locally cached custom Lehrwerke
      try {
        const storedCustom = localStorage.getItem('custom_lehrwerke');
        if (storedCustom) {
          const parsedCustom = JSON.parse(storedCustom);
          if (Array.isArray(parsedCustom)) {
            parsedCustom.forEach(c => {
              if (c && c.id && !mapped.some(m => String(m.id) === String(c.id))) {
                mapped.push({
                  ...c,
                  totalPages: c.totalPages || c.total_pages || 50,
                  emoji: c.emoji || '📖',
                  color: c.color || '#34a853'
                });
              }
            });
          }
        }
      } catch {}

      setGlobalLehrwerke(mapped);

      const storedAssigned = localStorage.getItem('student_lehrwerke_progress');
      if (storedAssigned) {
        const parsedAssigned = JSON.parse(storedAssigned);
        const filtered = parsedAssigned.filter((item: any) => String(item.studentId) === String(student.id));
        setAssignedLehrwerke(filtered);
      } else {
        setAssignedLehrwerke([]);
      }
    } catch (e) {
      console.error('Error loading Lehrwerke in modal:', e);
    }
  };

  // Load Student's active song skills (Strictly isolated to Teacher's Campus Mediathek)
  const loadActiveSongSkills = async () => {
    try {
      const activeTId = await getCurrentTeacherId();
      
      const { data: skillsData, error } = await supabase
        .from('user_song_skills')
        .select('*, songs(*)')
        .eq('user_id', student.id);
      
      if (error) throw error;

      // Filter: In Campus Hausaufgabenheft, ONLY songs from the teacher's Campus Mediathek must be shown!
      // GrooveLab module songs (is_campus_active: false/null) are strictly filtered out.
      const filteredSkills = (skillsData || []).filter((skill: any) => {
        if (!skill.songs) return false;
        // 1. Must be active on Campus
        if (skill.songs.is_campus_active !== true) return false;
        // 2. Must belong to current teacher if teacher is known
        if (teacherId && skill.songs.teacher_id && skill.songs.teacher_id !== teacherId) return false;
        if (activeTId && skill.songs.teacher_id && skill.songs.teacher_id !== activeTId) return false;
        return true;
      });

      // Deduplicate song skills so each unique song appears only once
      const uniqueMap = new Map<string, any>();
      filteredSkills.forEach((skill: any) => {
        const key = String(skill.song_id || skill.songs?.id || skill.songs?.title || skill.id);
        const existing = uniqueMap.get(key);
        if (!existing || (skill.progress_percent || 0) > (existing.progress_percent || 0)) {
          uniqueMap.set(key, skill);
        }
      });

      setActiveSongSkills(Array.from(uniqueMap.values()));
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

      // Scan and load custom tags from history
      const customFound: string[] = [];
      (data || []).forEach(item => {
        try {
          const notes: string[] = JSON.parse(item.homework_notes || '[]');
          const fbStr = notes.find((n: string) => n.startsWith('FEEDBACK:'));
          if (fbStr) {
            const fbObj = JSON.parse(fbStr.substring(9));
            if (Array.isArray(fbObj.tags)) {
              fbObj.tags.forEach((t: string) => {
                const normalized = t.trim();
                if (normalized && !SKILL_TAGS.some(st => st.key === normalized) && !customFound.includes(normalized)) {
                  customFound.push(normalized);
                }
              });
            }
          }
        } catch {}
      });
      setCustomTags(customFound);

      // Pre-populate homeworkNotes with the active general homework notes (KW item only)
      const currentWeek = getISOWeek();
      const currentWeekHomework = (data || []).find(item => 
        item.topic_name.startsWith('Hausaufgabe KW ') && 
        (getItemWeek(item) === currentWeek || (item.updated_at && getISOWeek(item.updated_at) === currentWeek))
      ) || (data || []).find(item => 
        item.topic_name.startsWith('Hausaufgabe KW ')
      );

      let loadedHomeworkNotes = '';
      let loadedHomeworkNotesList: string[] = [];
      let loadedTeacherNotes = '';

      if (currentWeekHomework) {
        if (currentWeekHomework.homework_notes) {
          const rawNotes = currentWeekHomework.homework_notes;
          try {
            if (rawNotes.startsWith('[') && rawNotes.endsWith(']')) {
              const parsed = JSON.parse(rawNotes);
              loadedHomeworkNotesList = parsed;
              loadedHomeworkNotes = parsed.filter((n: string) => 
                typeof n === 'string' && 
                !n.startsWith('AUDIO:') && 
                !n.startsWith('STICKER:') && 
                !n.startsWith('FEEDBACK:') && 
                !n.startsWith('STUDENT_NOTE_')
              ).join('\n\n');
            } else {
              const cleanNotes = rawNotes
                .split('\n')
                .filter((line: string) => !line.trim().startsWith('• 📖') && !line.trim().startsWith('• 🎵') && !line.trim().startsWith('• 🗑️'))
                .join('\n')
                .trim();
              if (cleanNotes) {
                loadedHomeworkNotesList = cleanNotes.split('\n\n').filter(Boolean);
                loadedHomeworkNotes = cleanNotes;
              }
            }
          } catch (e) {
            loadedHomeworkNotesList = [rawNotes];
            loadedHomeworkNotes = rawNotes;
          }
        }
        if (currentWeekHomework.teacher_notes) {
          loadedTeacherNotes = currentWeekHomework.teacher_notes;
        }
      }

      // LocalStorage fallback for instantaneous 100% data preservation
      if (!loadedHomeworkNotes || loadedHomeworkNotesList.length === 0) {
        try {
          const cachedHW = localStorage.getItem(`campus_homework_notes_${student.id}`);
          if (cachedHW) {
            if (cachedHW.startsWith('[') && cachedHW.endsWith(']')) {
              const parsed = JSON.parse(cachedHW);
              if (loadedHomeworkNotesList.length === 0) loadedHomeworkNotesList = parsed;
              if (!loadedHomeworkNotes) {
                loadedHomeworkNotes = parsed.filter((n: string) => 
                  typeof n === 'string' && 
                  !n.startsWith('AUDIO:') && 
                  !n.startsWith('STICKER:') && 
                  !n.startsWith('FEEDBACK:') && 
                  !n.startsWith('STUDENT_NOTE_')
                ).join('\n\n');
              }
            } else if (!loadedHomeworkNotes) {
              loadedHomeworkNotes = cachedHW;
              if (loadedHomeworkNotesList.length === 0) loadedHomeworkNotesList = [cachedHW];
            }
          }
        } catch (lsErr) {}
      }

      if (!loadedTeacherNotes) {
        try {
          const cachedTN = localStorage.getItem(`campus_teacher_notes_${student.id}`);
          if (cachedTN) {
            loadedTeacherNotes = cachedTN;
          }
        } catch (lsErr) {}
      }

      setHomeworkNotesList(loadedHomeworkNotesList);
      if (!hasChanges) {
        setGeneralHomeworkNotes(loadedHomeworkNotes);
        setHomeworkNotes(loadedHomeworkNotes);
        setTeacherNotes(loadedTeacherNotes);
      }
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
      setTimeout(() => supabase.removeChannel(channel), 1000);
    } catch (e) {
      console.warn('Realtime broadcast error:', e);
    }
  };


  useEffect(() => {
    if (student.id) {
      if (student.id === 'teacher-self') {
        setLoading(false);
        return;
      }
      fetchProgress();
      loadLehrwerke();
      loadActiveSongSkills();

      const fetchProfile = async () => {
        try {
          const { data, error } = await supabase
            .from('users')
            .select('instrument, school_id')
            .eq('id', student.id)
            .maybeSingle();
          if (!error && data) {
            if (data.instrument) {
              setStudentInstrument(data.instrument);
            }
            if (data.school_id) {
              setStudentSchoolId(data.school_id);
              loadLehrwerke(data.school_id);
              
              // Fetch school name
              const { data: schoolData } = await supabase
                .from('schools')
                .select('name')
                .eq('id', data.school_id)
                .maybeSingle();
              if (schoolData && schoolData.name) {
                setSchoolName(schoolData.name);
              }
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

          // Fetch fokus_logs and calculate total minutes & distinct practice days for the current week
          const { data: focusData, error: focusError } = await supabase
            .from('fokus_logs')
            .select('created_at, duration_seconds')
            .eq('user_id', student.id);

          if (!focusError && focusData) {
            const totalSeconds = focusData.reduce((sum, item) => sum + (item.duration_seconds || 0), 0);
            setStudentPracticeMinutes(Math.floor(totalSeconds / 60));

            const currentWeek = getISOWeek();
            const currentWeekDays = new Set(
              focusData
                .filter(item => item.created_at && getISOWeek(item.created_at) === currentWeek)
                .map(item => new Date(item.created_at).toISOString().split('T')[0])
            );
            setWeeklyPracticeDays(currentWeekDays.size);
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
      
      setSimulatedStickers(prev => {
        const existing = prev[stickerId] || { count: 0, details: [] };
        return {
          ...prev,
          [stickerId]: {
            count: existing.count + 1,
            details: [...existing.details, { topic: targetTopic, date: dateStr }]
          }
        };
      });
      await fetchProgress();
      notifyHomeworkChange();
    } catch (e) {
      console.error("Error silently awarding sticker:", e);
    }
  };

  const resetStickerAlbum = async () => {
    try {
      const itemsToUpdate = progressItems.filter(item => item.homework_notes);
      
      for (const item of itemsToUpdate) {
        if (!item.id || !item.homework_notes) continue;
        try {
          const notesArray = item.homework_notes.startsWith('[') && item.homework_notes.endsWith(']')
            ? JSON.parse(item.homework_notes)
            : [item.homework_notes];
            
          if (Array.isArray(notesArray)) {
            const filteredArray = notesArray.filter((note: string) => !note.startsWith("STICKER:"));
            const updatedNotesJson = JSON.stringify(filteredArray);
            
            await supabase
              .from('progress_matrix')
              .update({ homework_notes: updatedNotesJson, updated_at: new Date().toISOString() })
              .eq('id', item.id);
          }
        } catch (e) {
          // ignore
        }
      }
      
      setSimulatedSongsCount(null);
      await fetchProgress();
      notifyHomeworkChange();
      alert("Sticker-Sammelalbum wurde erfolgreich zurückgesetzt! 🧹");
    } catch (e) {
      console.error("Error resetting sticker album:", e);
      alert("Fehler beim Zurücksetzen des Sticker-Albums.");
    }
  };

  const downloadShareCard = (sticker: any, topicOverride?: string) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 1200;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const medalCenterY = 410;
    const tX = 160;
    const tY = 80;
    const tW = 880;
    const tH = 1040;

    const isLegendary = sticker.rarity === 'legendary';
    const isEpic = sticker.rarity === 'epic';
    const themeColor = sticker.color || '#34a853';

    // 1. Draw premium dark studio gradient background
    const bgGrad = ctx.createLinearGradient(0, 0, 1200, 1200);
    bgGrad.addColorStop(0, '#090d16');
    bgGrad.addColorStop(1, '#0f172a');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1200, 1200);

    // 2. Ambient radial background glow behind card
    const glowGrad = ctx.createRadialGradient(600, 600, 100, 600, 600, 550);
    glowGrad.addColorStop(0, isLegendary ? 'rgba(234, 179, 8, 0.25)' : 'rgba(52, 168, 83, 0.22)');
    glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glowGrad;
    ctx.fillRect(0, 0, 1200, 1200);

    // 3. Draw rounded 3D Panini Collector Card Container
    ctx.save();
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    if (typeof (ctx as any).roundRect === 'function') {
      (ctx as any).roundRect(tX, tY, tW, tH, 44);
    } else {
      ctx.rect(tX, tY, tW, tH);
    }
    ctx.fill();

    // 4. Draw Rainbow Holo-Foil diagonal stripes inside card for rare/epic/legendary stickers
    if (isLegendary || isEpic || sticker.rarity === 'rare') {
      ctx.save();
      ctx.clip(); // Clip inside card rounded bounds
      const holoGrad = ctx.createLinearGradient(tX, tY, tX + tW, tY + tH);
      holoGrad.addColorStop(0, 'rgba(255, 0, 128, 0.15)');
      holoGrad.addColorStop(0.25, 'rgba(0, 255, 255, 0.15)');
      holoGrad.addColorStop(0.5, 'rgba(255, 255, 0, 0.15)');
      holoGrad.addColorStop(0.75, 'rgba(0, 255, 128, 0.15)');
      holoGrad.addColorStop(1, 'rgba(255, 0, 255, 0.15)');
      ctx.fillStyle = holoGrad;
      ctx.fillRect(tX, tY, tW, tH);
      ctx.restore();
    }

    // 5. Card Metallic Glowing Border
    ctx.shadowColor = isLegendary ? '#eab308' : isEpic ? '#af52de' : themeColor;
    ctx.shadowBlur = 30;
    ctx.strokeStyle = isLegendary ? '#eab308' : isEpic ? '#af52de' : 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = isLegendary || isEpic ? 6 : 4;
    ctx.beginPath();
    if (typeof (ctx as any).roundRect === 'function') {
      (ctx as any).roundRect(tX, tY, tW, tH, 44);
    } else {
      ctx.rect(tX, tY, tW, tH);
    }
    ctx.stroke();
    ctx.restore();

    // 6. Header Rarity Tag & Schuljahr Stamp
    ctx.save();
    ctx.translate(600, tY + 50);
    const syStr = getSchoolYearString();
    const rarityText = `⭐ ${(sticker.rarityLabel || 'STANDARD').toUpperCase()} • SCHULJAHR ${syStr}`;
    ctx.font = '900 19px "Helvetica Neue", Inter, sans-serif';
    ctx.fillStyle = isLegendary ? '#facc15' : isEpic ? '#c084fc' : themeColor;
    ctx.textAlign = 'center';
    ctx.fillText(rarityText, 0, 0);
    ctx.restore();

    // 7. Header Action "GEMEISTERT!" Pill (slanted)
    ctx.save();
    ctx.translate(600, tY + 115);
    ctx.rotate(-2 * Math.PI / 180);
    ctx.fillStyle = themeColor;
    const pillText = 'GEMEISTERT!';
    ctx.font = '900 28px "Helvetica Neue", Arial, sans-serif';
    const pillTextWidth = ctx.measureText(pillText).width;
    const pillW = pillTextWidth + 44;
    const pillH = 48;
    ctx.beginPath();
    if (typeof (ctx as any).roundRect === 'function') {
      (ctx as any).roundRect(-pillW/2, -pillH/2, pillW, pillH, 24);
    } else {
      ctx.rect(-pillW/2, -pillH/2, pillW, pillH);
    }
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(pillText, 0, 0);
    ctx.restore();

    // 8. Student Details (Guaranteed ACTUAL student name, NEVER "Hausaufgabenheft")
    let textY = tY + 630;
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 52px "Helvetica Neue", Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(actualStudentName, 600, textY);

    if (studentInstrument) {
      textY += 38;
      ctx.fillStyle = '#94a3b8';
      ctx.font = '900 22px "Helvetica Neue", Inter, sans-serif';
      ctx.fillText(studentInstrument.toUpperCase(), 600, textY);
    }

    textY += 52;
    ctx.fillStyle = themeColor;
    ctx.font = 'italic 900 44px "Helvetica Neue", Arial, sans-serif';
    ctx.fillText(sticker.title.toUpperCase(), 600, textY);

    const cardTopic = topicOverride || (collectedStickers[sticker.id]?.details?.slice(-1)[0]?.topic);

    if (sticker.id === 'song-master' || cardTopic) {
      textY += 46;
      ctx.fillStyle = '#facc15';
      ctx.font = '900 28px "Helvetica Neue", Inter, sans-serif';
      ctx.fillText(`🎵 ${cardTopic || 'Song gemeistert'}`, 600, textY);
    } else {
      textY += 40;
      ctx.fillStyle = '#cbd5e1';
      ctx.font = 'bold 22px "Helvetica Neue", Inter, sans-serif';
      ctx.fillText(sticker.desc, 600, textY);

      if (sticker.equiv) {
        textY += 36;
        ctx.fillStyle = '#38bdf8'; // Sky blue highlight accent for tangible equivalencies
        ctx.font = '900 20px "Helvetica Neue", Inter, sans-serif';
        ctx.fillText(sticker.equiv, 600, textY);
      }
    }

    // 9. Translucent Badge Pill for School Name (dynamically positioned below text with zero overlap)
    const badgeText = schoolName.toUpperCase();
    ctx.font = 'bold 20px "Helvetica Neue", Inter, sans-serif';
    const textWidth = ctx.measureText(badgeText).width;
    const badgeW = textWidth + 60;
    const badgeH = 50;
    const badgeX = 600 - badgeW / 2;
    const badgeY = Math.max(tY + 860, textY + 36);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (typeof (ctx as any).roundRect === 'function') {
      (ctx as any).roundRect(badgeX, badgeY, badgeW, badgeH, 25);
    } else {
      ctx.rect(badgeX, badgeY, badgeW, badgeH);
    }
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(badgeText, 600, badgeY + badgeH / 2);
    ctx.textBaseline = 'alphabetic'; // reset

    // 10. Website URL footer (Campus-Groovelab Seal)
    ctx.fillStyle = themeColor;
    ctx.font = '900 24px "Helvetica Neue", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('campus-groovelab.de', 600, badgeY + badgeH + 42);

    // Helper stenciled sticker asset loader
    const drawStickerAsset = (imgOrEmoji: HTMLImageElement | string, isImg: boolean) => {
      ctx.save();
      ctx.translate(600, medalCenterY);

      // Sticker drop shadow
      ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
      ctx.shadowBlur = 18;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 10;

      // Circle sticker background
      ctx.fillStyle = sticker.bg || 'rgba(52, 168, 83, 0.2)';
      ctx.beginPath();
      ctx.arc(0, 0, 150, 0, Math.PI * 2);
      ctx.fill();

      // Outer sticker ring border
      ctx.shadowColor = 'transparent';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 8;
      ctx.stroke();

      if (isImg) {
        ctx.beginPath();
        ctx.arc(0, 0, 146, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(imgOrEmoji as HTMLImageElement, -146, -146, 292, 292);
      } else {
        ctx.font = '120px "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(sticker.emoji || '🏆', 0, 0);
      }

      ctx.restore();
      
      const filename = (topicOverride || sticker.title).toLowerCase().replace(/[^a-z0-9]/gi, '_');
      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      const link = document.createElement('a');
      link.download = `campus_sticker_${filename}.jpg`;
      link.href = dataUrl;
      link.click();
    };

    // Load sticker asset
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      drawStickerAsset(img, true);
    };
    img.onerror = () => {
      drawStickerAsset(sticker.emoji || '🏆', false);
    };
    img.src = `/stickers/${sticker.id}.png?v=1`;
  };

  const shareCard = async (sticker: any, topicOverride?: string) => {
    try {
      downloadShareCard(sticker, topicOverride);
    } catch (err) {
      console.log('Share action ended:', err);
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
      const parsed = stored ? JSON.parse(stored) : [];
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
      const activeIds = progressItems.filter(item => item.is_current_homework).map(item => item.id).filter(Boolean);
      if (activeIds.length > 0) {
        await supabase
          .from('progress_matrix')
          .update({ is_current_homework: false, status: 'IN_PROGRESS' })
          .in('id', activeIds);
      }

      // Reset Lehrwerke in localStorage
      const stored = localStorage.getItem('student_lehrwerke_progress');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          const updated = parsed.map((item: any) => {
            if (item.studentId === student.id && item.pageStates) {
              const pageStates = { ...item.pageStates };
              Object.keys(pageStates).forEach(pKey => {
                if (pageStates[pKey]?.status === 'homework' || pageStates[pKey]?.isCurrentHomework) {
                  pageStates[pKey] = {
                    ...pageStates[pKey],
                    status: 'locked',
                    isCurrentHomework: false,
                    updatedAt: new Date().toISOString()
                  };
                }
              });
              return { ...item, pageStates };
            }
            return item;
          });
          localStorage.setItem('student_lehrwerke_progress', JSON.stringify(updated));
          setAssignedLehrwerke(updated.filter((item: any) => item.studentId === student.id));
          loadLehrwerke();
        } catch (e) {}
      }

      // Clear local storage for song homeworks
      (activeSongSkills || []).forEach((skill: any) => {
        try {
          localStorage.setItem(`song_hw_${student.id}_${skill.id}`, 'false');
          if (skill.song_id) localStorage.setItem(`song_hw_${student.id}_${skill.song_id}`, 'false');
        } catch (e) {}
      });

      setIsCurrentHomework(false);
      setSessionLogs(prev => [...prev, `🗑️ Alle aktiven Hausaufgaben zurückgesetzt`]);
      await fetchProgress();
      await loadActiveSongSkills();
      notifyHomeworkChange();
    } catch (e) {
      console.error('Error resetting current homework:', e);
    }
  };

  const handleRemoveSinglePageHomework = async (bookTitle: string, pageNum: number) => {
    try {
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
              isCurrentHomework: false,
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

      // Update database progress_matrix for this single page
      const pageTopic = `${bookTitle} - Seite ${pageNum}`;
      const matchingItems = progressItems.filter(item => item.topic_name === pageTopic);
      const matchingIds = matchingItems.map(i => i.id).filter(id => id && !String(id).startsWith('temp-'));
      if (matchingIds.length > 0) {
        await supabase
          .from('progress_matrix')
          .update({ is_current_homework: false, status: 'IN_PROGRESS' })
          .in('id', matchingIds);
      }

      setProgressItems(prev => prev.map(item => {
        if (item.topic_name === pageTopic) {
          return { ...item, is_current_homework: false, status: 'IN_PROGRESS' };
        }
        return item;
      }));

      await fetchProgress();
      notifyHomeworkChange();
    } catch (e) {
      console.error('Error removing single page homework:', e);
    }
  };

  const handleRemoveBookHomework = async (bookTitle: string) => {
    try {
      const book = globalLehrwerke.find(b => b.title === bookTitle);
      if (book) {
        const stored = localStorage.getItem('student_lehrwerke_progress');
        const parsed = stored ? JSON.parse(stored) : [];
        
        const updated = parsed.map((item: any) => {
          if (item.studentId === student.id && item.lehrwerkId === book.id) {
            const pageStates = { ...item.pageStates };
            Object.keys(pageStates).forEach(pKey => {
              if (pageStates[pKey]?.status === 'homework' || pageStates[pKey]?.isCurrentHomework) {
                pageStates[pKey] = {
                  ...pageStates[pKey],
                  status: 'locked',
                  isCurrentHomework: false,
                  updatedAt: new Date().toISOString()
                };
              }
            });
            return { ...item, pageStates };
          }
          return item;
        });
        
        localStorage.setItem('student_lehrwerke_progress', JSON.stringify(updated));
        setAssignedLehrwerke(updated.filter((item: any) => item.studentId === student.id));
        loadLehrwerke();
      }

      // Update database progress_matrix for all pages of this book
      const matchingItems = progressItems.filter(item => item.topic_name && item.topic_name.startsWith(`${bookTitle} - Seite `));
      const matchingIds = matchingItems.map(i => i.id).filter(id => id && !String(id).startsWith('temp-'));
      if (matchingIds.length > 0) {
        await supabase
          .from('progress_matrix')
          .update({ is_current_homework: false, status: 'IN_PROGRESS' })
          .in('id', matchingIds);
      }

      setProgressItems(prev => prev.map(item => {
        if (item.topic_name && item.topic_name.startsWith(`${bookTitle} - Seite `)) {
          return { ...item, is_current_homework: false, status: 'IN_PROGRESS' };
        }
        return item;
      }));

      await fetchProgress();
      notifyHomeworkChange();
    } catch (e) {
      console.error('Error removing book homework:', e);
    }
  };

  const handleRemoveSongHomework = async (songItemOrSkill: any) => {
    try {
      const canonicalKey = getCanonicalSongKey(songItemOrSkill);
      const matchingSkill = activeSongSkills.find(s => isSongMatch(s, songItemOrSkill));
      const skillId = matchingSkill?.id || songItemOrSkill?.id;

      // 1. LocalStorage update
      try {
        if (student?.id) {
          if (skillId) localStorage.setItem(`song_hw_${student.id}_${skillId}`, 'false');
          if (matchingSkill?.id) localStorage.setItem(`song_hw_${student.id}_${matchingSkill.id}`, 'false');
          if (matchingSkill?.song_id) localStorage.setItem(`song_hw_${student.id}_${matchingSkill.song_id}`, 'false');
        }
      } catch (e) {}

      // 2. Database update: update all matching progress_matrix entries
      const matchingItems = progressItems.filter(item => isSongMatch(item, songItemOrSkill));
      const matchingIds = matchingItems.map(i => i.id).filter(id => id && !String(id).startsWith('temp-'));

      if (matchingIds.length > 0) {
        await supabase
          .from('progress_matrix')
          .update({ is_current_homework: false, status: 'IN_PROGRESS' })
          .in('id', matchingIds);
      }

      // 3. Optimistic local state update
      if (selectedActiveSongId && matchingSkill && (selectedActiveSongId === matchingSkill.id || selectedActiveSongId === matchingSkill.song_id)) {
        setIsCurrentHomework(false);
        setStatus('IN_PROGRESS');
      }

      setProgressItems(prev => prev.map(item => {
        if (isSongMatch(item, songItemOrSkill)) {
          return { ...item, is_current_homework: false, status: 'IN_PROGRESS' };
        }
        return item;
      }));

      await fetchProgress();
      await loadActiveSongSkills();
      notifyHomeworkChange();
    } catch (err) {
      console.error('Error removing song homework:', err);
    }
  };

  const handleRemoveHomeworkItem = async (itemId: string, bookTitle?: string, pageNum?: number) => {
    try {
      if (bookTitle && pageNum !== undefined) {
        await handleRemoveSinglePageHomework(bookTitle, pageNum);
        return;
      }
      const item = progressItems.find(i => i.id === itemId);
      if (item) {
        await handleRemoveSongHomework(item);
        return;
      }

      const { error } = await supabase
        .from('progress_matrix')
        .update({ is_current_homework: false, status: 'IN_PROGRESS' })
        .eq('id', itemId);

      if (error) throw error;

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
        const audioLabelString = parts[3] || 'Aufnahme';

        const confirmDelete = window.confirm(`Möchtest du die Aufnahme "${audioLabelString}" wirklich unwiderruflich löschen?`);
        if (!confirmDelete) return;

        if (audioUrlString && audioUrlString.startsWith("http")) {
          const marker = '/storage/v1/object/public/campus-assets/';
          const markerIndex = audioUrlString.indexOf(marker);
          if (markerIndex !== -1) {
            const filePath = audioUrlString.substring(markerIndex + marker.length);
            console.log("Deleting audio file from storage:", filePath);
            await supabase.storage.from('campus-assets').remove([filePath]);
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
      if (book && book.title) {
        // Set is_current_homework to false for all pages of this book
        const { error } = await supabase
          .from('progress_matrix')
          .update({ is_current_homework: false })
          .eq('student_id', student.id)
          .like('topic_name', `${book.title} - Seite %`);
        if (error) console.error('Error updating progress matrix:', error);
      }

      if (lehrwerkId.startsWith('custom-') || book?.is_custom) {
        try {
          await supabase
            .from('lehrwerke')
            .delete()
            .eq('id', lehrwerkId);
        } catch (err) {
          console.warn('Error deleting custom lehrwerk from DB:', err);
        }

        const globalStored = localStorage.getItem('campus_lehrwerke');
        if (globalStored) {
          try {
            const parsedGlobal = JSON.parse(globalStored);
            const updatedGlobal = parsedGlobal.filter((b: any) => b.id !== lehrwerkId);
            localStorage.setItem('campus_lehrwerke', JSON.stringify(updatedGlobal));
          } catch (err) {
            console.error(err);
          }
        }
      }

      const stored = localStorage.getItem('student_lehrwerke_progress');
      const parsed = stored ? JSON.parse(stored) : [];
      const updated = parsed.filter((item: any) => !(item.studentId === student.id && item.lehrwerkId === lehrwerkId));
      localStorage.setItem('student_lehrwerke_progress', JSON.stringify(updated));
      await loadLehrwerke();
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
    const book = globalLehrwerke.find(b => String(b.id) === String(lehrwerkId));
    if (!book) return;

    try {
      const stored = localStorage.getItem('student_lehrwerke_progress');
      const parsed = stored ? JSON.parse(stored) : [];
      
      if (parsed.some((item: any) => String(item.studentId) === String(student.id) && String(item.lehrwerkId) === String(lehrwerkId))) {
        return;
      }

      const newAssignment = {
        studentId: student.id,
        lehrwerkId: lehrwerkId,
        bookTitle: book.title,
        lehrwerkTitle: book.title,
        totalPages: book.totalPages || 50,
        assignedAt: new Date().toISOString(),
        visibility: 'private',
        pageStates: {}
      };

      const updated = [...parsed, newAssignment];
      localStorage.setItem('student_lehrwerke_progress', JSON.stringify(updated));
      setAssignedLehrwerke(prev => [...prev.filter(a => String(a.lehrwerkId) !== String(lehrwerkId)), newAssignment]);
      loadLehrwerke();
      setActiveLehrwerkId(lehrwerkId);
      setShowAssignDropdown(false);
    } catch (e) {
      console.error(e);
    }
  };

  const updateLehrwerkVisibility = (lehrwerkId: string, visibility: 'private' | 'read' | 'control') => {
    try {
      const stored = localStorage.getItem('student_lehrwerke_progress');
      const parsed = stored ? JSON.parse(stored) : [];
      const updated = parsed.map((item: any) => {
        if (item.studentId === student.id && item.lehrwerkId === lehrwerkId) {
          return { ...item, visibility };
        }
        return item;
      });
      localStorage.setItem('student_lehrwerke_progress', JSON.stringify(updated));
      setAssignedLehrwerke(updated.filter((item: any) => item.studentId === student.id));
    } catch (e) {
      console.error('Error updating lehrwerk visibility:', e);
    }
  };

  const toggleStudentFocusPage = (lehrwerkId: string, pageNum: number) => {
    try {
      const stored = localStorage.getItem('student_lehrwerke_progress');
      const parsed = stored ? JSON.parse(stored) : [];
      
      let isCurrentlyFocused = false;
      let totalFocusCount = 0;

      parsed.forEach((item: any) => {
        if (item.studentId === student.id && item.lehrwerkId === lehrwerkId) {
          if (item.pageStates?.[pageNum]?.studentFocus) {
            isCurrentlyFocused = true;
          }
          Object.values(item.pageStates || {}).forEach((pState: any) => {
            if (pState?.studentFocus) totalFocusCount++;
          });
        }
      });

      if (!isCurrentlyFocused && totalFocusCount >= 3) {
        alert("🎯 Pädagogischer Fokus: Du kannst maximal 3 Seiten gleichzeitig als deinen Übe-Fokus markieren.\n\nBitte hebe erst die Markierung einer anderen Seite auf, um eine neue zu fokussieren.");
        return;
      }

      const nextFocused = !isCurrentlyFocused;

      const updated = parsed.map((item: any) => {
        if (item.studentId === student.id && item.lehrwerkId === lehrwerkId) {
          const pageStates = { ...item.pageStates };
          const existing = pageStates[pageNum] || { status: 'locked' };
          pageStates[pageNum] = {
            ...existing,
            studentFocus: nextFocused,
            updatedAt: new Date().toISOString()
          };
          return {
            ...item,
            pageStates
          };
        }
        return item;
      });

      localStorage.setItem('student_lehrwerke_progress', JSON.stringify(updated));
      const filtered = updated.filter((item: any) => item.studentId === student.id);
      setAssignedLehrwerke(filtered);
    } catch (e) {
      console.error('Error toggling student focus:', e);
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
    let book = globalLehrwerke.find(b => b.id === lehrwerkId);
    if (!book) {
      const stored = localStorage.getItem('student_lehrwerke_progress');
      const parsed = stored ? JSON.parse(stored) : [];
      const assigned = parsed.find((a: any) => a.studentId === student.id && a.lehrwerkId === lehrwerkId);
      if (assigned || lehrwerkId.startsWith('custom-')) {
        book = {
          id: lehrwerkId,
          title: assigned?.title || 'Eigenes Lehrwerk',
          totalPages: 50,
          total_pages: 50,
          emoji: '📚',
          color: '#34a853',
          is_custom: true
        };
      } else {
        console.log('selectTextbookPage book not found:', lehrwerkId);
        return;
      }
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
        if (Array.isArray(parsed)) {
          loadedNote = parsed.map((line: string) => cleanNotesText(line)).filter(Boolean).join('\n');
        } else {
          loadedNote = cleanNotesText(String(parsed));
        }
      } catch {
        loadedNote = cleanNotesText(dbItem.homework_notes);
      }
    } else {
      loadedNote = cleanNotesText(pageState.homeworkNotes || pageState.homework_notes || '');
    }
    setHomeworkNotes(cleanNotesText(loadedNote));

    let loadedStudentNote = pageState.studentNotes || '';
    let loadedIsPrivate = pageState.studentNotesIsPrivate || false;

    if (dbItem?.homework_notes) {
      try {
        const parsedDB = JSON.parse(dbItem.homework_notes);
        if (Array.isArray(parsedDB)) {
          const pub = parsedDB.find((line: string) => typeof line === 'string' && line.startsWith('STUDENT_NOTE_PUBLIC:'));
          const priv = parsedDB.find((line: string) => typeof line === 'string' && line.startsWith('STUDENT_NOTE_PRIVATE:'));
          if (pub) {
            loadedStudentNote = pub.replace(/^STUDENT_NOTE_PUBLIC:[^|]*\|/, '');
            loadedIsPrivate = false;
          } else if (priv) {
            loadedStudentNote = priv.replace(/^STUDENT_NOTE_PRIVATE:[^|]*\|/, '');
            loadedIsPrivate = true;
          }
        }
      } catch {}
    }

    setStudentNotes(loadedStudentNote);
    setIsStudentNotePrivate(loadedIsPrivate);

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
    
    const songArtist = skill.songs?.artist || skill.artist || '';
    const songTitle = skill.songs?.title || skill.title || skill.song_title || 'Song';
    const songInstrument = skill.instrument ? ` (${skill.instrument})` : '';
    const fullTitle = songArtist ? `${songArtist} - ${songTitle}${songInstrument}` : `${songTitle}${songInstrument}`;
    setTopicName(fullTitle);
    
    // Look up existing database notes in progressItems for THIS song with robust matcher
    const matchingItems = progressItems.filter(item => isSongMatch(item, skill));
    const isAnyHw = matchingItems.some(item => Boolean(item.is_current_homework));
    const dbItem = matchingItems[0];

    const cachedTeacherNote = localStorage.getItem(`song_teacher_note_${student.id}_${skill.id}`) ||
                              localStorage.getItem(`song_teacher_note_${student.id}_${skill.song_id}`) || '';
    setTeacherNotes(cachedTeacherNote || (dbItem ? (dbItem.teacher_notes || '') : ''));

    // Load song homework notes (strictly isolated from general homework notes)
    const cachedSongNote = localStorage.getItem(`song_note_${student.id}_${skill.id}`) ||
                           localStorage.getItem(`song_note_${student.id}_${skill.song_id}`) || '';
    if (cachedSongNote) {
      setSongHomeworkNotes(cachedSongNote);
    } else if (dbItem && dbItem.homework_notes) {
      const cleanSongNote = getCleanPageNotes(dbItem.homework_notes);
      setSongHomeworkNotes(cleanSongNote);
    } else {
      setSongHomeworkNotes('');
    }
    
    if (skill.is_stage_ready || skill.progress_percent === 100 || (dbItem && dbItem.status === 'MASTERED')) {
      setStatus('MASTERED');
      setIsCurrentHomework(false);
    } else {
      setStatus('IN_PROGRESS');
      const localHw = localStorage.getItem(`song_hw_${student.id}_${skill.id}`);
      const isHw = isAnyHw || (localHw === 'true');
      setIsCurrentHomework(isHw);
    }

    // Load Dual Match Model State
    const localMatchMode = localStorage.getItem(`song_match_mode_${student.id}_${skill.id}`);
    const matchEnabled = localMatchMode !== null ? localMatchMode === 'true' : (skill.is_match_mode_enabled !== false);
    setIsMatchModeEnabled(matchEnabled);

    const localStudentRating = localStorage.getItem(`song_student_rating_${student.id}_${skill.id}`);
    const sRating = localStudentRating !== null && localStudentRating !== undefined ? parseInt(localStudentRating, 10) : (skill.student_rating ?? (dbItem?.student_rating ?? null));
    setStudentRating(sRating);

    const sUpdated = skill.student_rating_updated_at || localStorage.getItem(`song_student_rating_updated_at_${student.id}_${skill.id}`);
    setStudentRatingUpdatedAt(sUpdated || null);
    setIsStudentRatingCommitted(Boolean(sRating !== null && sRating !== undefined && sUpdated));

    const lastMatchDate = skill.last_matched_at || dbItem?.last_matched_at || localStorage.getItem(`song_last_matched_at_${student.id}_${skill.id}`);
    setLastMatchedAt(lastMatchDate || null);

    const lastTeacherP = skill.last_matched_teacher_percent ?? dbItem?.last_matched_teacher_percent ?? null;
    setLastMatchedTeacherPercent(lastTeacherP);

    const lastStudentP = skill.last_matched_student_percent ?? dbItem?.last_matched_student_percent ?? null;
    setLastMatchedStudentPercent(lastStudentP);

    const lastMatchSuccess = skill.is_match_successful ?? dbItem?.is_match_successful ?? (lastMatchDate && lastTeacherP !== null && lastStudentP !== null ? Math.abs(lastTeacherP - lastStudentP) <= 10 : null);
    setIsMatchSuccessful(lastMatchSuccess);
    const isUpToDateMatch = Boolean(lastMatchDate && (!sUpdated || new Date(lastMatchDate).getTime() >= new Date(sUpdated).getTime()));
    setIsMatchRevealed(isUpToDateMatch);

    // Load persistent 3-slot match history
    const rawHistory = (skill as any).match_history || (dbItem as any)?.match_history || localStorage.getItem(`song_match_history_${student.id}_${skill.id}`);
    let parsedHistory: any[] = [];
    if (Array.isArray(rawHistory)) {
      parsedHistory = rawHistory;
    } else if (typeof rawHistory === 'string') {
      try { parsedHistory = JSON.parse(rawHistory); } catch (e) {}
    }
    if (parsedHistory.length === 0 && lastMatchDate && lastTeacherP !== null && lastStudentP !== null) {
      const diff = Math.abs(lastTeacherP - lastStudentP);
      parsedHistory = [{
        matched_at: lastMatchDate,
        teacher_percent: lastTeacherP,
        student_percent: lastStudentP,
        xp_amount: diff <= 10 ? 50 : (diff <= 20 ? 25 : 5),
        tier: diff <= 10 ? 'tier1' : (diff <= 20 ? 'tier2' : 'tier3')
      }];
    }
    setMatchHistory(parsedHistory.slice(0, 3));
  };

  // Sync active song homework status whenever progressItems finishes loading from Supabase (without overwriting typed notes)
  useEffect(() => {
    if (activeInputTab === 'active_song' && selectedActiveSongId && progressItems.length > 0) {
      const skill = activeSongSkills.find(s => s.id === selectedActiveSongId || s.song_id === selectedActiveSongId);
      if (skill) {
        const matchingItems = progressItems.filter(item => isSongMatch(item, skill));
        if (matchingItems.length > 0) {
          const isHw = matchingItems.some(item => Boolean(item.is_current_homework));
          setIsCurrentHomework(isHw);
          const newest = matchingItems[0];
          if (newest.status === 'MASTERED' || skill.is_stage_ready) {
            setStatus('MASTERED');
          } else {
            setStatus('IN_PROGRESS');
          }
          if (newest.student_rating !== undefined && newest.student_rating !== null) {
            setStudentRating(prev => (prev === null ? newest.student_rating! : prev));
          }
          if (newest.last_matched_at) {
            setLastMatchedAt(newest.last_matched_at);
            setLastMatchedTeacherPercent(newest.last_matched_teacher_percent ?? null);
            setLastMatchedStudentPercent(newest.last_matched_student_percent ?? null);
            setIsMatchSuccessful(newest.is_match_successful ?? null);
            setIsMatchRevealed(true);
          }
        }
      }
    }
  }, [progressItems, activeInputTab, selectedActiveSongId, activeSongSkills]);

  // Find former notes matching the current topic Name automatically!
  const formerNotes = useMemo(() => {
    if (!topicName.trim()) return [];
    return progressItems.filter(item => item.topic_name.toLowerCase().trim() === topicName.toLowerCase().trim());
  }, [topicName, progressItems]);

  const effectiveMasteredSongsCount = useMemo(() => {
    const fromSkills = (activeSongSkills || []).filter(s => s.progress === 100 || s.status === 'MASTERED' || s.is_stage_ready).length;
    const fromItems = (progressItems || []).filter(item => {
      const t = (item.topic_name || '').toLowerCase().trim();
      return !t.includes(' - seite ') && t !== 'test' && t !== 'test - test' && t !== 'test-test' && item.status === 'MASTERED';
    }).length;
    const fromInitial = initialMasteredSongsCount || 0;
    const fromSim = simulatedSongsCount !== null ? simulatedSongsCount : 0;
    return Math.max(fromSkills, fromItems, fromInitial, fromSim);
  }, [activeSongSkills, progressItems, initialMasteredSongsCount, simulatedSongsCount]);

  // Scan all database entries for awarded stickers & compute milestone stickers synchronously
  const collectedStickers = useMemo(() => {
    return getUnifiedStickersMap({
      practiceMinutes: studentPracticeMinutes,
      xp: studentXP,
      streakDays: studentStreak,
      masteredSongsCount: effectiveMasteredSongsCount,
      progressItems,
      simulatedStickers
    });
  }, [studentPracticeMinutes, studentXP, studentStreak, effectiveMasteredSongsCount, progressItems, simulatedStickers]);

  useEffect(() => {
    if (!student.id || loading || progressItems.length === 0) return;

    const runAutoStickerCheck = async () => {
      const collectedIds = new Set(Object.keys(collectedStickers).filter(id => collectedStickers[id].count > 0));
      const completedSongsCount = simulatedSongsCount !== null 
        ? simulatedSongsCount 
        : activeSongSkills.filter(s => s.progress === 100 || s.status === 'MASTERED').length;

      const autoAwards = [
        { id: 'fleiss-pionier', value: isDemoMode ? 5 : 20, current: studentPracticeMinutes, context: `${studentPracticeMinutes} Min. geübt` },
        { id: 'uebe-meister', value: isDemoMode ? 15 : 100, current: studentPracticeMinutes, context: `${studentPracticeMinutes} Min. geübt` },
        { id: 'uebe-legende', value: isDemoMode ? 30 : 500, current: studentPracticeMinutes, context: `${studentPracticeMinutes} Min. geübt` },
        { id: 'uebe-grossmeister', value: isDemoMode ? 40 : 1500, current: studentPracticeMinutes, context: `${studentPracticeMinutes} Min. geübt` },

        { id: 'xp-sammler', value: isDemoMode ? 50 : 100, current: studentXP, context: `${studentXP} XP erreicht` },
        { id: 'xp-champion', value: isDemoMode ? 150 : 500, current: studentXP, context: `${studentXP} XP erreicht` },
        { id: 'xp-meister', value: isDemoMode ? 300 : 1500, current: studentXP, context: `${studentXP} XP erreicht` },
        { id: 'xp-legende', value: isDemoMode ? 500 : 3500, current: studentXP, context: `${studentXP} XP erreicht` },

        { id: 'dranbleiber', value: isDemoMode ? 1 : 3, current: studentStreak, context: `${studentStreak} Tage Streak` },
        { id: 'wochen-held', value: isDemoMode ? 2 : 7, current: studentStreak, context: `${studentStreak} Tage Streak` },
        { id: 'streak-koenig', value: isDemoMode ? 3 : 21, current: studentStreak, context: `${studentStreak} Tage Streak` },
        { id: 'streak-kaiser', value: isDemoMode ? 4 : 30, current: studentStreak, context: `${studentStreak} Tage Streak` },

        { id: 'erster-erfolg', value: 1, current: completedSongsCount, context: `${completedSongsCount} Songs gemeistert` },
        { id: 'song-sammler', value: isDemoMode ? 2 : 3, current: completedSongsCount, context: `${completedSongsCount} Songs gemeistert` },
        { id: 'repertoire-riese', value: isDemoMode ? 3 : 5, current: completedSongsCount, context: `${completedSongsCount} Songs gemeistert` },
        { id: 'repertoire-gigant', value: isDemoMode ? 4 : 10, current: completedSongsCount, context: `${completedSongsCount} Songs gemeistert` }
      ];

      for (const award of autoAwards) {
        if (!collectedIds.has(award.id) && award.current >= award.value) {
          console.log(`Auto-awarding sticker: ${award.id}`);
          await awardStickerSilent(award.id, award.context);
        }
      }
    };

    runAutoStickerCheck();
  }, [student.id, progressItems, activeSongSkills, studentPracticeMinutes, studentXP, studentStreak, loading, collectedStickers, isDemoMode, simulatedSongsCount]);

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
      const currentWeek = getISOWeek();
      const existingThisWeek = progressItems.find(item => 
        item.topic_name === `${book.title} - Seite ${pageNum}` && 
        item.updated_at && 
        getISOWeek(item.updated_at) === currentWeek
      );

      const assignedBook = (updated || []).find((item: any) => item.studentId === student.id && item.lehrwerkId === lehrwerkId);
      const existingPageState = assignedBook?.pageStates?.[pageNum];

      const existingPageNote = (activeLehrwerkId === lehrwerkId && activePageNumber === pageNum && pageHomeworkNotes)
        ? pageHomeworkNotes.trim()
        : (existingThisWeek?.homework_notes ? getCleanPageNotes(existingThisWeek.homework_notes) : (existingPageState?.homeworkNotes || ''));

      const row = {
        student_id: student.id,
        teacher_id: activeTId,
        topic_name: `${book.title} - Seite ${pageNum}`,
        status: targetStatus,
        is_current_homework: targetHomework,
        teacher_notes: existingThisWeek ? (existingThisWeek.teacher_notes || '') : (existingPageState?.notes || ''),
        homework_notes: existingPageNote,
        updated_at: new Date().toISOString()
      };

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

      // Automatically award +15 Campus-XP when a textbook page is freshly mastered
      if (targetStatus === 'MASTERED') {
        const pageKey = `xp_awarded_page_${student.id}_${lehrwerkId}_${pageNum}`;
        const alreadyAwarded = localStorage.getItem(pageKey);
        if (!alreadyAwarded) {
          localStorage.setItem(pageKey, 'true');
          await awardCampusXP(15, `Lehrwerk gemeistert: ${book.title} - S. ${pageNum}`);
        }
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

  const handleBackToHub = async () => {
    if (activeInputTab === 'active_song' && selectedActiveSongId) {
      await triggerDirectSongSave(selectedActiveSongId, status, isCurrentHomework, songHomeworkNotes);
    } else if (activeInputTab === 'lehrwerk_page' && activeLehrwerkId && activePageNumber !== null) {
      await handleSave(true);
    }
    setActiveSubView('hub');
    setActiveInputTab('free');
    setSelectedActiveSongId('');
    setActiveLehrwerkId(null);
    setActivePageNumber(null);
    setHasChanges(false);
    setSongHomeworkNotes('');
    setPageHomeworkNotes('');
  };

  const awardCampusXP = async (amount: number, reason: string) => {
    try {
      if (!student.id || amount <= 0) return;
      const nowIso = new Date().toISOString();

      // 1. Fetch current user XP
      const { data: userProfile } = await supabase
        .from('users')
        .select('id, campus_xp, xp')
        .eq('id', student.id)
        .single();

      const currentCampusXP = userProfile?.campus_xp || userProfile?.xp || 0;
      const newCampusXP = currentCampusXP + amount;

      // Update users table
      await supabase
        .from('users')
        .update({
          campus_xp: newCampusXP,
          xp: newCampusXP,
          updated_at: nowIso
        })
        .eq('id', student.id);

      // 2. Fetch & update student_stats record
      const { data: statsRecord } = await supabase
        .from('student_stats')
        .select('*')
        .eq('student_id', student.id)
        .maybeSingle();

      const currentStatsXp = (statsRecord?.current_xp || 0) + amount;
      await supabase
        .from('student_stats')
        .upsert({
          student_id: student.id,
          current_xp: currentStatsXp,
          updated_at: nowIso
        }, { onConflict: 'student_id' });

      // 3. Update avatars table
      try {
        await supabase
          .from('avatars')
          .update({
            xp: currentStatsXp,
            updated_at: nowIso
          })
          .or(`user_id.eq.${student.id},student_id.eq.${student.id}`);
      } catch (avErr) {}

      // 4. Insert log entry in fokus_logs for transparency & auditing
      try {
        await supabase.from('fokus_logs').insert({
          student_id: student.id,
          duration_minutes: 0,
          duration_seconds: 0,
          xp_earned: amount,
          is_extra: true,
          created_at: nowIso
        });
      } catch (logErr) {}

      // 5. Dispatch real-time custom event so open student widgets instantly update
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('campus-xp-awarded', {
          detail: { studentId: student.id, amount, newTotal: newCampusXP, reason }
        }));
      }
    } catch (err) {
      console.warn('Campus XP update note:', err);
    }
  };


  const handleStudentRatingChange = (val: number) => {
    setStudentRating(val);
    setIsStudentRatingCommitted(false);
    setIsMatchRevealed(false);
    setHasChanges(true);
    if (selectedActiveSongId) {
      try {
        localStorage.setItem(`song_student_rating_${student.id}_${selectedActiveSongId}`, String(val));
      } catch (err) {}
    }
  };

  const handleCommitStudentRating = async () => {
    const val = studentRating ?? 0;
    const nowIso = new Date().toISOString();
    setIsStudentRatingCommitted(true);
    setIsMatchRevealed(false);
    setStudentRatingUpdatedAt(nowIso);
    setMatchFeedbackToast('🔒 Tipp abgeschickt! Deine Lehrkraft sieht sofort deine Abgabe.');
    setTimeout(() => setMatchFeedbackToast(null), 3500);

    if (selectedActiveSongId) {
      try {
        localStorage.setItem(`song_student_rating_${student.id}_${selectedActiveSongId}`, String(val));
        localStorage.setItem(`song_student_rating_updated_at_${student.id}_${selectedActiveSongId}`, nowIso);

        if (!String(selectedActiveSongId).startsWith('temp-')) {
          await supabase
            .from('user_song_skills')
            .update({
              student_rating: val,
              student_rating_updated_at: nowIso
            })
            .eq('id', selectedActiveSongId);
        }
        const matchingItems = progressItems.filter(item => isSongMatch(item, { id: selectedActiveSongId }));
        const validIds = matchingItems.map(i => i.id).filter(id => id && !String(id).startsWith('temp-'));
        if (validIds.length > 0) {
          await supabase
            .from('progress_matrix')
            .update({
              student_rating: val,
              updated_at: nowIso
            })
            .in('id', validIds);
        }
      } catch (e) {
        console.error('Error committing student rating:', e);
      }
    }
  };


  const handleToggleMatchMode = async () => {
    const nextVal = !isMatchModeEnabled;
    setIsMatchModeEnabled(nextVal);
    if (selectedActiveSongId) {
      try {
        localStorage.setItem(`song_match_mode_${student.id}_${selectedActiveSongId}`, String(nextVal));
        if (!String(selectedActiveSongId).startsWith('temp-')) {
          await supabase
            .from('user_song_skills')
            .update({ is_match_mode_enabled: nextVal })
            .eq('id', selectedActiveSongId);
        }
      } catch (err) {}
    }
  };

  const handleCheckMatch = async () => {
    if (studentRating === null || studentRating === undefined) return;
    if (matchHistory.length >= 3) {
      setMatchFeedbackToast('🏆 Alle 3 Meilenstein-Matches für diesen Song sind bereits abgeschlossen!');
      setTimeout(() => setMatchFeedbackToast(null), 3500);
      return;
    }

    const teacherPercent = songProgressPercent;
    const studPercent = studentRating;
    const diff = Math.abs(teacherPercent - studPercent);
    const isTier1 = diff <= 10;
    const isTier2 = diff > 10 && diff <= 20;
    const isTier3 = diff > 20;
    const tier: 'tier1' | 'tier2' | 'tier3' = isTier1 ? 'tier1' : (isTier2 ? 'tier2' : 'tier3');
    const isSuccess = isTier1;
    const xpWon = isTier1 ? 50 : (isTier2 ? 25 : 5);
    const nowIso = new Date().toISOString();

    const activeSongObj = activeSongSkills.find(s => s.id === selectedActiveSongId || s.song_id === selectedActiveSongId);
    const songTitle = activeSongObj?.songs?.title || 'Song';

    // 1. Trigger Dual-Balken Showdown Race Animation (1.2s)
    setShowdownState({
      isRunning: true,
      teacherTarget: teacherPercent,
      studentTarget: studPercent,
      currentTeacherVal: 0,
      currentStudentVal: 0,
      tier,
      xpAmount: xpWon,
      matchedAt: nowIso
    });

    const startTime = performance.now();
    const duration = 1200; // 1.2 seconds

    const animateRace = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      // Ease out cubic
      const ease = 1 - Math.pow(1 - progress, 3);
      const curT = teacherPercent * ease;
      const curS = studPercent * ease;

      setShowdownState(prev => prev ? {
        ...prev,
        currentTeacherVal: curT,
        currentStudentVal: curS
      } : null);

      if (progress < 1) {
        requestAnimationFrame(animateRace);
      } else {
        // Race complete! Finalize match result
        finalizeMatchResult(teacherPercent, studPercent, isTier1, isTier2, isTier3, tier, isSuccess, xpWon, nowIso, songTitle);
      }
    };

    requestAnimationFrame(animateRace);
  };

  const finalizeMatchResult = async (
    teacherPercent: number,
    studPercent: number,
    isTier1: boolean,
    isTier2: boolean,
    isTier3: boolean,
    tier: 'tier1' | 'tier2' | 'tier3',
    isSuccess: boolean,
    xpWon: number,
    nowIso: string,
    songTitle: string
  ) => {
    setShowdownState(prev => prev ? {
      ...prev,
      isRunning: false,
      currentTeacherVal: teacherPercent,
      currentStudentVal: studPercent
    } : null);

    setLastMatchedAt(nowIso);
    setLastMatchedTeacherPercent(teacherPercent);
    setLastMatchedStudentPercent(studPercent);
    setIsMatchSuccessful(isSuccess);
    setIsMatchRevealed(true);

    const newEntry = {
      matched_at: nowIso,
      teacher_percent: teacherPercent,
      student_percent: studPercent,
      xp_amount: xpWon,
      tier
    };
    const updatedHistory = [...matchHistory.filter(h => h.matched_at !== nowIso), newEntry].slice(0, 3);
    setMatchHistory(updatedHistory);

    try {
      if (selectedActiveSongId) {
        localStorage.setItem(`song_last_matched_at_${student.id}_${selectedActiveSongId}`, nowIso);
        localStorage.setItem(`song_last_matched_teacher_percent_${student.id}_${selectedActiveSongId}`, String(teacherPercent));
        localStorage.setItem(`song_last_matched_student_percent_${student.id}_${selectedActiveSongId}`, String(studPercent));
        localStorage.setItem(`song_is_match_successful_${student.id}_${selectedActiveSongId}`, String(isSuccess));
        localStorage.setItem(`song_match_history_${student.id}_${selectedActiveSongId}`, JSON.stringify(updatedHistory));

        if (!String(selectedActiveSongId).startsWith('temp-')) {
          await supabase
            .from('user_song_skills')
            .update({
              last_matched_at: nowIso,
              last_matched_teacher_percent: teacherPercent,
              last_matched_student_percent: studPercent,
              is_match_successful: isSuccess,
              teacher_rating_updated_at: nowIso,
              match_history: updatedHistory
            })
            .eq('id', selectedActiveSongId);
        }
        const matchingItems = progressItems.filter(item => isSongMatch(item, { id: selectedActiveSongId }));
        const validIds = matchingItems.map(i => i.id).filter(id => id && !String(id).startsWith('temp-'));
        if (validIds.length > 0) {
          await supabase
            .from('progress_matrix')
            .update({
              last_matched_at: nowIso,
              last_matched_teacher_percent: teacherPercent,
              last_matched_student_percent: studPercent,
              is_match_successful: isSuccess,
              match_history: updatedHistory
            })
            .in('id', validIds);
        }
      }
    } catch (e) {
      console.error('Error saving match result:', e);
    }

    // 1. Broadcast over Supabase Realtime channel for live in-app celebration on student device
    try {
      const channel = supabase.channel(`realtime_student_progress_${student.id}`);
      channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.send({
            type: 'broadcast',
            event: 'song-matched',
            payload: {
              songTitle,
              tier,
              xpAmount: xpWon,
              teacherPercent,
              studentPercent: studPercent,
              matchedAt: nowIso,
              matchNumber: updatedHistory.length
            }
          });
          supabase.removeChannel(channel);
        }
      });
    } catch (bcErr) {
      console.warn('Realtime broadcast error:', bcErr);
    }

    // 2. Insert notification record for PWA / WebPush
    try {
      await supabase.from('notifications').insert({
        user_id: student.id,
        title: isTier1 ? '🎯 Volltreffer! Meister-Ohr freigeschaltet!' : (isTier2 ? '✨ Super Gehör! +25 XP gesammelt!' : '🚀 Neues Song-Match mit deiner Lehrkraft!'),
        message: `Für "${songTitle}": Du hast +${xpWon} Campus-XP erhalten! (Meilenstein ${updatedHistory.length}/3)`,
        type: 'song_match',
        is_read: false,
        created_at: nowIso
      });
    } catch (notifErr) {}

    // 3. XP Awarding & Teacher UI feedback
    if (isTier1) {
      setShowMatchConfetti(true);
      setTimeout(() => setShowMatchConfetti(false), 4500);
      await awardCampusXP(50, 'Meister-Ohr Volltreffer');
      setMatchFeedbackToast(`🎯 VOLLTREFFER! +50 Campus-XP & Meister-Ohr freigeschaltet! (Match ${updatedHistory.length}/3)`);
      setTimeout(() => setMatchFeedbackToast(null), 4500);
    } else if (isTier2) {
      setShowMatchConfetti(true);
      setTimeout(() => setShowMatchConfetti(false), 4000);
      await awardCampusXP(25, 'Super Gehör Match');
      setMatchFeedbackToast(`✨ SUPER GEHÖR! +25 Campus-XP gesammelt! (Match ${updatedHistory.length}/3)`);
      setTimeout(() => setMatchFeedbackToast(null), 4500);
    } else {
      await awardCampusXP(5, 'Weiter-Rocker Motivations-Bonus');
      setMatchFeedbackToast(`🚀 WEITER-ROCKER! +5 Campus-XP fürs Mitmachen & Weitermachen! (Match ${updatedHistory.length}/3)`);
      setTimeout(() => setMatchFeedbackToast(null), 4500);
    }
  };

  const songSaveTimeoutRef = useRef<any>(null);
  const triggerDebouncedSongSave = (val: string) => {
    if (songSaveTimeoutRef.current) clearTimeout(songSaveTimeoutRef.current);
    songSaveTimeoutRef.current = setTimeout(() => {
      if (selectedActiveSongId) {
        const isHw = val.trim().length > 0 ? true : isCurrentHomework;
        triggerDirectSongSave(selectedActiveSongId, status, isHw, val, teacherNotes);
      }
    }, 450);
  };

  const triggerDebouncedTeacherNoteSave = (val: string) => {
    if (songSaveTimeoutRef.current) clearTimeout(songSaveTimeoutRef.current);
    songSaveTimeoutRef.current = setTimeout(() => {
      if (selectedActiveSongId) {
        triggerDirectSongSave(selectedActiveSongId, status, isCurrentHomework, songHomeworkNotes, val);
      }
    }, 450);
  };

  const triggerDirectSongSave = async (skillId: string, targetStatus: 'IN_PROGRESS' | 'THEORY_DONE' | 'MASTERED', targetHomework: boolean, songNoteOverride?: string, teacherNoteOverride?: string) => {
    try {
      const skill = activeSongSkills.find(s => s.id === skillId || s.song_id === skillId || s.songs?.id === skillId);
      const skillPercent = songProgressPercent !== undefined ? songProgressPercent : (skill?.progress_percent || 0);

      const songArtist = skill?.songs?.artist || skill?.artist || '';
      const songTitle = skill?.songs?.title || skill?.title || skill?.song_title || topicName.replace(/\s*\([^)]*\)\s*$/, '').trim() || 'Song';
      const songInstrument = skill?.instrument ? ` (${skill.instrument})` : '';
      const fullTitle = songArtist ? `${songArtist} - ${songTitle}${songInstrument}` : `${songTitle}${songInstrument}`;

      const noteToSave = songNoteOverride !== undefined
        ? songNoteOverride
        : (songHomeworkNotes !== undefined ? songHomeworkNotes : '');

      const teacherNoteToSave = teacherNoteOverride !== undefined
        ? teacherNoteOverride
        : (teacherNotes !== undefined ? teacherNotes : '');

      // Local storage backup for instant sync
      try {
        if (skillId) {
          localStorage.setItem(`song_hw_${student.id}_${skillId}`, targetHomework ? 'true' : 'false');
          localStorage.setItem(`song_note_${student.id}_${skillId}`, noteToSave);
          localStorage.setItem(`song_teacher_note_${student.id}_${skillId}`, teacherNoteToSave);
        }
        if (skill?.id) {
          localStorage.setItem(`song_hw_${student.id}_${skill.id}`, targetHomework ? 'true' : 'false');
          localStorage.setItem(`song_note_${student.id}_${skill.id}`, noteToSave);
          localStorage.setItem(`song_teacher_note_${student.id}_${skill.id}`, teacherNoteToSave);
        }
        if (skill?.song_id) {
          localStorage.setItem(`song_hw_${student.id}_${skill.song_id}`, targetHomework ? 'true' : 'false');
          localStorage.setItem(`song_note_${student.id}_${skill.song_id}`, noteToSave);
          localStorage.setItem(`song_teacher_note_${student.id}_${skill.song_id}`, teacherNoteToSave);
        }
      } catch (e) {}

      if (skillId && !String(skillId).startsWith('temp-')) {
        await supabase
          .from('user_song_skills')
          .update({
            is_stage_ready: targetStatus === 'MASTERED',
            progress_percent: skillPercent
          })
          .eq('id', skillId);
      }

      setTopicName(fullTitle);
      setStatus(targetStatus);
      setIsCurrentHomework(targetHomework);

      const activeTId = await getCurrentTeacherId();
      
      // Look for ALL existing progress_matrix items for this student with this song
      const matchingExistingItems = progressItems.filter(item => isSongMatch(item, skill || { topic_name: fullTitle }));
      const existingItem = matchingExistingItems[0];

      const row = {
        student_id: student.id,
        teacher_id: activeTId,
        topic_name: fullTitle,
        status: targetStatus,
        is_current_homework: targetHomework,
        teacher_notes: teacherNoteToSave,
        homework_notes: noteToSave,
        updated_at: new Date().toISOString()
      };

      const validMatchingIds = matchingExistingItems
        .map(i => i.id)
        .filter(id => id && !String(id).startsWith('temp-'));

      let savedItem: any = null;
      if (validMatchingIds.length > 0) {
        const { data, error } = await supabase
          .from('progress_matrix')
          .update(row)
          .in('id', validMatchingIds)
          .select();
        if (!error && data && data.length > 0) {
          savedItem = data[0];
        }
      } else {
        const { data, error } = await supabase
          .from('progress_matrix')
          .insert(row)
          .select()
          .single();
        if (!error && data) {
          savedItem = data;
        }
      }

      // Optimistic update of progressItems so preview and dashboard show note instantly
      const finalItem = savedItem || { id: existingItem?.id || ('temp-' + Date.now()), ...row };
      setProgressItems(prev => {
        const remaining = prev.filter(item => !isSongMatch(item, skill || { topic_name: fullTitle }));
        return [finalItem, ...remaining];
      });

      // Automatically award +100 Campus-XP when a song is freshly marked as 100% MASTERED
      if (targetStatus === 'MASTERED' || skillPercent === 100) {
        const songXpKey = `xp_awarded_song_${student.id}_${skillId || songTitle}`;
        const alreadyAwarded = localStorage.getItem(songXpKey);
        if (!alreadyAwarded) {
          localStorage.setItem(songXpKey, 'true');
          await awardCampusXP(100, `Song zu 100% gemeistert: ${songTitle}`);
        }
      }

      // Add to session log
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

      notifyHomeworkChange();
    } catch (e) {
      console.error('Error saving song status directly:', e);
    }
  };

  const handleSaveStudentNotes = async () => {
    if (!activeLehrwerkId || activePageNumber === null) return;
    try {
      setSaving(true);
      const stored = localStorage.getItem('student_lehrwerke_progress');
      const parsed = stored ? JSON.parse(stored) : [];

      const updated = parsed.map((item: any) => {
        if (item.studentId === student.id && item.lehrwerkId === activeLehrwerkId) {
          const existingPageState = item.pageStates?.[activePageNumber] || {};
          return {
            ...item,
            pageStates: {
              ...item.pageStates,
              [activePageNumber]: {
                ...existingPageState,
                studentNotes: studentNotes.trim(),
                studentNotesIsPrivate: isStudentNotePrivate,
                updatedAt: new Date().toISOString()
              }
            }
          };
        }
        return item;
      });

      localStorage.setItem('student_lehrwerke_progress', JSON.stringify(updated));
      setAssignedLehrwerke(updated.filter((item: any) => item.studentId === student.id));

      const notePrefix = isStudentNotePrivate ? 'STUDENT_NOTE_PRIVATE' : 'STUDENT_NOTE_PUBLIC';
      const formattedEntry = `${notePrefix}:${new Date().toISOString()}|${studentNotes.trim()}`;

      const updatedNotesList = homeworkNotesList.filter(
        n => typeof n === 'string' && !n.startsWith('STUDENT_NOTE_PUBLIC:') && !n.startsWith('STUDENT_NOTE_PRIVATE:')
      );

      if (studentNotes.trim()) {
        updatedNotesList.push(formattedEntry);
      }
      setHomeworkNotesList(updatedNotesList);

      await syncHomeworkNotes(updatedNotesList);
      setStudentNotesSavedToast(true);
      setTimeout(() => setStudentNotesSavedToast(false), 2500);
    } catch (err) {
      console.error('Fehler beim Speichern der Schüler-Notiz:', err);
      alert('Fehler beim Speichern der Schüler-Notiz.');
    } finally {
      setSaving(false);
    }
  };

  const autoSaveDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const triggerDebouncedAutoSave = (delayMs: number = 350) => {
    if (readOnly) return;
    setHasChanges(true);
    if (autoSaveDebounceTimerRef.current) {
      clearTimeout(autoSaveDebounceTimerRef.current);
    }
    autoSaveDebounceTimerRef.current = setTimeout(() => {
      handleSave(true);
    }, delayMs);
  };

  const triggerImmediateAutoSave = () => {
    if (readOnly) return;
    if (autoSaveDebounceTimerRef.current) {
      clearTimeout(autoSaveDebounceTimerRef.current);
    }
    handleSave(true);
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
            const existingPageState = item.pageStates?.[activePageNumber] || {};
            return {
              ...item,
              pageStates: {
                ...item.pageStates,
                [activePageNumber]: {
                  ...existingPageState,
                  status: pageStatus,
                  notes: teacherNotes.trim(),
                  homeworkNotes: homeworkNotes.trim(),
                  studentNotes: studentNotes.trim(),
                  studentNotesIsPrivate: isStudentNotePrivate,
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

    // Save to active song skills and progress matrix if active song selected
    if (activeInputTab === 'active_song' && selectedActiveSongId) {
      try {
        const noteToSave = songHomeworkNotes.trim();
        const finalHw = isCurrentHomework || noteToSave.length > 0;
        await triggerDirectSongSave(selectedActiveSongId, status, finalHw, noteToSave);
        setStudentNotesSavedToast(true);
        setTimeout(() => setStudentNotesSavedToast(false), 2500);
        if (!keepOpen) {
          setActiveSubView('hub');
          setActiveInputTab('free');
        }
        setSaving(false);
        return;
      } catch (err) {
        console.error('Error updating song skill and notes:', err);
      }
    }

    const isLehrwerkPage = (activeInputTab === 'lehrwerk_page');
    const isSong = (activeInputTab === 'active_song');

    const specialNotes = homeworkNotesList.filter(n => typeof n === 'string' && (n.startsWith('AUDIO:') || n.startsWith('STICKER:') || n.startsWith('FEEDBACK:') || n.startsWith('STUDENT_NOTE_')));
    const finalNotesList = [...specialNotes];
    if (!isLehrwerkPage && !isSong && generalHomeworkNotes.trim().length > 0) {
      finalNotesList.push(generalHomeworkNotes.trim());
    }
    const combinedHomeworkNotes = JSON.stringify(finalNotesList);

    const hasHomeworkText = isSong ? songHomeworkNotes.trim().length > 0 : (isLehrwerkPage ? pageHomeworkNotes.trim().length > 0 : finalNotesList.length > 0);
    const isExplicitHomework = targetHomework !== undefined ? targetHomework : isCurrentHomework;
    const finalIsCurrentHomework = isSong 
      ? (isCurrentHomework || songHomeworkNotes.trim().length > 0)
      : (isLehrwerkPage
          ? (isCurrentHomework || pageHomeworkNotes.trim().length > 0)
          : (isExplicitHomework || hasHomeworkText));

    const payload = {
      id: activeItem?.id,
      studentId: student.id,
      topicName: finalTopicName,
      status,
      isCurrentHomework: finalIsCurrentHomework,
      teacherNotes: teacherNotes.trim(),
      homeworkNotes: isSong ? songHomeworkNotes.trim() : (isLehrwerkPage ? pageHomeworkNotes.trim() : combinedHomeworkNotes)
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

      // Direct reliable Supabase persistence
      const activeTId = await getCurrentTeacherId();
      const currentWeek = getISOWeek();

      const rowHomeworkNotes = isSong
        ? songHomeworkNotes.trim()
        : (isLehrwerkPage
            ? pageHomeworkNotes.trim()
            : (finalTopicName.startsWith('Hausaufgabe KW ')
                ? combinedHomeworkNotes
                : JSON.stringify(finalNotesList.filter((n: string) => !n.startsWith('AUDIO:')))));

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

      // Immediate local backup (only for general homework notes)
      if (!isLehrwerkPage && !isSong) {
        try {
          localStorage.setItem(`campus_homework_notes_${student.id}`, combinedHomeworkNotes);
          localStorage.setItem(`campus_teacher_notes_${student.id}`, teacherNotes.trim());
        } catch (lsErr) {
          console.warn('[Meisterwerk] localStorage backup notice:', lsErr);
        }
      }

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

      if (!isLehrwerkPage && !isSong) {
        await syncHomeworkNotes(finalNotesList);
      }

      if (targetHomework && !isCurrentHomework) {
        setIsCurrentHomework(true);
      }

      await fetchProgress();
      notifyHomeworkChange();
      setStudentNotesSavedToast(true);
      setTimeout(() => setStudentNotesSavedToast(false), 2500);

      setHomeworkNotesList(finalNotesList);
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

      // 1. Insert into songs catalog (Teacher's Campus Mediathek)
      const activeTId = teacherId || await getCurrentTeacherId();
      const { data: createdSong, error: songError } = await supabase
        .from('songs')
        .insert({
          title: newSongTitle.trim(),
          artist: newSongArtist.trim(),
          school_id: schoolId,
          is_campus_active: true,
          is_groovelab_active: false,
          teacher_id: activeTId || null
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
      setError('Fehler beim Erstellen des Songs.');
    }
  };

  const handleCreateAndAssignLehrwerk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLehrwerkTitle.trim()) return;

    setNewLehrwerkLoading(true);
    try {
      const schoolId = student?.school_id || (student as any)?.schoolId || studentSchoolId || localStorage.getItem('campus_school_id') || localStorage.getItem('groovelab_school_id') || localStorage.getItem('school_id');
      const totalPages = parseInt(newLehrwerkPages, 10) || 50;

      let createdId = `custom-${Date.now()}`;
      let createdBook: any = null;

      try {
        const { data: newLehrwerk, error } = await supabase
          .from('lehrwerke')
          .insert({
            title: newLehrwerkTitle.trim(),
            total_pages: totalPages,
            school_id: schoolId || null,
            teacher_id: teacherId || null
          })
          .select('*')
          .single();

        if (!error && newLehrwerk) {
          createdId = newLehrwerk.id;
          createdBook = {
            ...newLehrwerk,
            totalPages: newLehrwerk.total_pages || totalPages,
            emoji: '📚',
            color: '#34a853'
          };
        }
      } catch (err) {
        console.warn('Supabase insert lehrwerke fallback to local:', err);
      }

      if (!createdBook) {
        createdBook = {
          id: createdId,
          title: newLehrwerkTitle.trim(),
          total_pages: totalPages,
          totalPages: totalPages,
          emoji: '📚',
          color: '#34a853'
        };
      }

      // 1. Cache custom book in local storage
      try {
        const storedCustom = localStorage.getItem('custom_lehrwerke');
        const parsedCustom = storedCustom ? JSON.parse(storedCustom) : [];
        const updatedCustom = [...parsedCustom.filter((b: any) => b.id !== createdBook.id), createdBook];
        localStorage.setItem('custom_lehrwerke', JSON.stringify(updatedCustom));
      } catch {}

      // 2. Assign to student in localStorage & state with title
      const stored = localStorage.getItem('student_lehrwerke_progress');
      const parsed = stored ? JSON.parse(stored) : [];
      const isStudentCreator = readOnly || !teacherId;
      if (!parsed.some((item: any) => item.studentId === student.id && item.lehrwerkId === createdId)) {
        const newAssignment = {
          studentId: student.id,
          lehrwerkId: createdId,
          bookTitle: newLehrwerkTitle.trim(),
          lehrwerkTitle: newLehrwerkTitle.trim(),
          totalPages: totalPages,
          assignedAt: new Date().toISOString(),
          createdByRole: isStudentCreator ? 'student' : 'teacher',
          isStudentCreated: isStudentCreator,
          pageStates: {}
        };
        const updated = [...parsed, newAssignment];
        localStorage.setItem('student_lehrwerke_progress', JSON.stringify(updated));
      }

      await loadLehrwerke();
      setGlobalLehrwerke(prev => [...prev.filter(b => b.id !== createdId), createdBook]);
      setActiveLehrwerkId(createdId);
      setShowCreateLehrwerkModal(false);
      setNewLehrwerkTitle('');
      setNewLehrwerkPages('50');
    } catch (err: any) {
      console.error('Error creating custom lehrwerk:', err);
    } finally {
      setNewLehrwerkLoading(false);
    }
  };

  const assignSongToStudent = async (song: any, schoolId: string) => {
    // Refresh catalog local list
    const activeTId = teacherId || await getCurrentTeacherId();
    let sq = supabase
      .from('songs')
      .select('*')
      .eq('school_id', schoolId)
      .eq('is_campus_active', true);
    if (activeTId) {
      sq = sq.eq('teacher_id', activeTId);
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

  // Unified canonical active songs resolver (combines user_song_skills, progressItems/homework, songs catalog, and localStorage)
  const resolvedActiveSongs = useMemo(() => {
    const songsMap = new Map<string, any>();

    // 1. From activeSongSkills (Direct user assignments in user_song_skills)
    (activeSongSkills || []).forEach((skill: any) => {
      const songObj = skill.songs || {};
      const title = songObj.title || skill.title || skill.song_title || '';
      const artist = songObj.artist || skill.artist || 'Unbekannt';
      const id = skill.id || songObj.id || skill.song_id;
      if (title) {
        const normKey = getNormalizedSongTitle(skill) || title.toLowerCase().trim();
        const localHw = localStorage.getItem(`song_hw_${student.id}_${id}`) ??
                        (skill.song_id ? localStorage.getItem(`song_hw_${student.id}_${skill.song_id}`) : null) ??
                        (songObj.id ? localStorage.getItem(`song_hw_${student.id}_${songObj.id}`) : null);
        const isHw = (localHw === 'true') || (localHw !== 'false' && Boolean(skill.is_current_homework));
        const localNote = localStorage.getItem(`song_note_${student.id}_${id}`) ||
                          (skill.song_id ? localStorage.getItem(`song_note_${student.id}_${skill.song_id}`) : '') ||
                          (songObj.id ? localStorage.getItem(`song_note_${student.id}_${songObj.id}`) : '') ||
                          skill.homework_notes;

        songsMap.set(normKey, {
          ...skill,
          id,
          title,
          artist,
          progress_percent: skill.progress_percent || 0,
          is_stage_ready: Boolean(skill.is_stage_ready || skill.progress_percent === 100),
          status: skill.status || (skill.progress_percent === 100 ? 'MASTERED' : 'IN_PROGRESS'),
          is_current_homework: isHw,
          homework_notes: localNote,
          songs: songObj.title ? songObj : { id: skill.song_id || id, title, artist, teacher_id: skill.teacher_id }
        });
      }
    });

    // 2. From progressItems (Direct assignments in progress_matrix / homework notes for assigned songs)
    (progressItems || []).forEach((item: any) => {
      const rawTopic = (item.topic_name || item.title || '').trim();
      if (!rawTopic || rawTopic.startsWith('Hausaufgabe KW ') || rawTopic.includes(' - Seite ') || rawTopic.toLowerCase().trim() === 'test') return;

      const normKey = getNormalizedSongTitle(item) || rawTopic.toLowerCase().trim();
      const existing = songsMap.get(normKey) || Array.from(songsMap.values()).find(s => isSongMatch(item, s));

      if (existing) {
        const localHw = localStorage.getItem(`song_hw_${student.id}_${item.id}`) ??
                        (item.song_id ? localStorage.getItem(`song_hw_${student.id}_${item.song_id}`) : null);
        const isHw = (localHw === 'true') || (localHw !== 'false' && Boolean(item.is_current_homework));
        const localNote = localStorage.getItem(`song_note_${student.id}_${item.id}`) ||
                          (item.song_id ? localStorage.getItem(`song_note_${student.id}_${item.song_id}`) : '') ||
                          item.homework_notes;

        if (isHw) existing.is_current_homework = true;
        if (item.status === 'MASTERED') {
          existing.status = 'MASTERED';
          existing.is_stage_ready = true;
          existing.progress_percent = 100;
        }
        if (localNote) existing.homework_notes = localNote;
      }
    });

    return Array.from(songsMap.values());
  }, [activeSongSkills, progressItems, student.id]);

  const activeBook = activeLehrwerkId ? globalLehrwerke.find(g => g.id === activeLehrwerkId) : null;
  const activeSong = selectedActiveSongId ? (resolvedActiveSongs.find(s => s.id === selectedActiveSongId || s.song_id === selectedActiveSongId) || activeSongSkills.find(s => s.id === selectedActiveSongId)) : null;
  const bookColor = (activeBook && activeSubView === 'lehrwerk') 
    ? getLehrwerkColor(activeBook.title) 
    : (activeSong && activeSubView === 'song') 
      ? getSongColor(activeSong.songs?.title || activeSong.title || 'Song') 
      : null;

  const renderArchivButton = (isMobile: boolean = false) => {
    if (isTeacherTools) return null;
    const isHistoryActive = activeSubView === 'history' && activeViewMode === 'document';
    return (
      <button
        type="button"
        onClick={() => {
          if (isHistoryActive) {
            setActiveSubView('hub');
          } else {
            setActiveModalTab('document');
            setActiveViewMode('document');
            setActiveSubView('history');
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
          }
        }}
        style={{
          background: isHistoryActive ? '#34a853' : 'rgba(255,255,255,0.15)',
          border: '1px solid rgba(255,255,255,0.08)',
          color: '#ffffff',
          padding: '6px 12px',
          borderRadius: '20px',
          fontSize: '0.75rem',
          fontWeight: 800,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          transition: 'all 0.2s ease',
          marginRight: '4px',
          flexShrink: 0
        }}
        className="hover-scale"
      >
        <History size={14} />
        <span>Archiv</span>
      </button>
    );
  };

  const renderSkillRadarButton = (isMobile: boolean = false) => {
    if (isTeacherTools) return null;
    return (
      <button
        type="button"
        onClick={() => { setActiveModalTab('skillradar'); setActiveSubView('hub'); }}
        title="Skill-Radar"
        style={{
          background: activeModalTab === 'skillradar' ? '#34a853' : 'rgba(255,255,255,0.15)',
          border: isMobile ? 'none' : '1px solid rgba(255,255,255,0.08)',
          borderRadius: '20px',
          height: isMobile ? 'auto' : '30px',
          padding: isMobile ? '6px 12px' : '0 10px 0 8px',
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          cursor: 'pointer',
          color: '#ffffff',
          fontSize: isMobile ? '0.74rem' : '0.72rem',
          fontWeight: isMobile ? 800 : 700,
          transition: 'all 0.18s ease',
          flexShrink: 0,
          marginRight: isMobile ? '0' : '4px',
          whiteSpace: 'nowrap'
        }}
        className="hover-scale"
      >
        <Activity size={isMobile ? 12 : 13} />
        <span>Skill-Radar</span>
      </button>
    );
  };

  const renderSkillRadarTabContent = () => {
    const feedbackEntries = (progressItems || [])
      .map((item: any) => {
        try {
          const notes: string[] = JSON.parse(item.homework_notes || '[]');
          const fbStr = notes.find(n => n.startsWith('FEEDBACK:'));
          if (!fbStr) return null;
          return JSON.parse(fbStr.substring(9));
        } catch { return null; }
      })
      .filter(Boolean)
      .slice(0, 12);

    const currentWeekStr = getISOWeek();
    const allActiveNotesText = [
      homeworkNotes || '',
      ...(homeworkNotesList || []),
      ...((progressItems || [])
        .filter((item: any) => item.is_current_homework && (item.updated_at ? getISOWeek(item.updated_at) === currentWeekStr : true))
        .map((item: any) => item.homework_notes || ''))
    ].join(' ');

    const counts = SKILL_TAGS.map(tag => {
      let baseInterventions = 0;
      
      // Match feedbackEntries tags with legacy aliases
      feedbackEntries.forEach((fb: any) => {
        if (Array.isArray(fb.tags)) {
          fb.tags.forEach((t: string) => {
            const mappedKey = 
              (t === 'tempo' || t === 'rhythmus') ? 'rhythmus' :
              (t === 'fingersatz' || t === 'technik') ? 'technik' :
              (t === 'intonation' || t === 'toene') ? 'intonation' :
              (t === 'ausdruck' || t === 'dynamik') ? 'ausdruck' :
              (t === 'auswendig' || t === 'repertoire' || t === 'kontinuitaet' || t === 'selbststaendigkeit') ? 'repertoire' : t;
            if (mappedKey === tag.key) {
              baseInterventions++;
            }
          });
        }
      });

      const offset = skillOverrides[tag.key] ?? 0;
      const effectiveInterventions = Math.max(0, baseInterventions + offset);
      
      // Smooth organic growth percentage (min 0.60 for Level 3 up to 1.0 for Level 5 Meister)
      const level = effectiveInterventions === 0 ? 5 : (effectiveInterventions === 1 ? 4 : (effectiveInterventions === 2 ? 3 : 2));
      const pct = effectiveInterventions === 0 ? 1.0 : (effectiveInterventions === 1 ? 0.84 : (effectiveInterventions === 2 ? 0.70 : 0.58));
      
      const rankTitle = 
        tag.key === 'rhythmus' ? (level === 5 ? 'Groove-Meister' : (level === 4 ? 'Timing-Sicher' : (level === 3 ? 'Puls-Entdecker' : 'Rhythmus-Fundament'))) :
        tag.key === 'technik' ? (level === 5 ? 'Meister-Virtuose' : (level === 4 ? 'Feinmotoriker' : (level === 3 ? 'Technik-Aufsteiger' : 'Technik-Fundament'))) :
        tag.key === 'intonation' ? (level === 5 ? 'Klang-Künstler' : (level === 4 ? 'Klang-Bewusst' : (level === 3 ? 'Klang-Gestalter' : 'Klang-Fundament'))) :
        tag.key === 'ausdruck' ? (level === 5 ? 'Bühnen-Magier' : (level === 4 ? 'Ausdrucksstark' : (level === 3 ? 'Gefühls-Pionier' : 'Ausdrucks-Fundament'))) :
        (level === 5 ? 'Repertoire-Profi' : (level === 4 ? 'Spielfluss-Star' : (level === 3 ? 'Song-Entdecker' : 'Repertoire-Fundament')));

      return {
        ...tag,
        baseInterventions,
        interventions: effectiveInterventions,
        count: effectiveInterventions,
        level,
        pct,
        rankTitle
      };
    });

    const tagCounts = counts;

    // Single Source of Truth: Aktive Wochenschwerpunkte (Max. 2)
    // 1. Manuelle UI-Auswahl oder 2. Säulen mit Entwicklungsbedarf (< 5)
    const activeGrowthTags = tagCounts.filter(t => t.level < 5).map(t => t.key);

    const activeWeeklyTargetTags = SKILL_TAGS.filter(tag => {
      // Priorität 1: Temporär in der UI angewählt
      if (pendingTargetFocusTags.includes(tag.key)) return true;
      // Priorität 2: Durch Lehrer aktiv gesetzte Entwicklungs-Säule (Stufe < 5)
      if (activeGrowthTags.includes(tag.key)) return true;
      // Priorität 3: Nur falls alle 5 Säulen auf Stufe 5 stehen, gezielte Textbausteine prüfen
      if (activeGrowthTags.length === 0) {
        const cleanNotes = allActiveNotesText.trim();
        if (!cleanNotes) return false;
        const lowerText = cleanNotes.toLowerCase();
        if (tag.key === 'rhythmus' && (lowerText.includes('rhythmus-fokus') || lowerText.includes('rhythmustraining') || lowerText.includes('pulsfest'))) return true;
        if (tag.key === 'technik' && (lowerText.includes('fingersatz-fokus') || lowerText.includes('technik-übung') || lowerText.includes('handhaltung'))) return true;
        if (tag.key === 'intonation' && (lowerText.includes('intonations-fokus') || lowerText.includes('klangübung') || lowerText.includes('tonbildung'))) return true;
        if (tag.key === 'ausdruck' && (lowerText.includes('ausdrucks-fokus') || lowerText.includes('dynamik-übung') || lowerText.includes('phrasierungs-fokus'))) return true;
        if (tag.key === 'repertoire' && (lowerText.includes('repertoire-fokus') || lowerText.includes('auswendig-spiel') || lowerText.includes('bühnentraining'))) return true;
      }
      return false;
    }).map(t => t.key).slice(0, 2);
    const topStrength = tagCounts.find(t => t.level >= 4) || tagCounts[0];
    const currentFocus = tagCounts.reduce((prev, curr) => curr.interventions > prev.interventions ? curr : prev, tagCounts[0]);

    const customTagCounts: { key: string; count: number }[] = [];
    feedbackEntries.forEach((fb: any) => {
      if (Array.isArray(fb.tags)) {
        fb.tags.forEach((t: string) => {
          if (!SKILL_TAGS.some(st => st.key === t)) {
            const existing = customTagCounts.find(c => c.key === t);
            if (existing) {
              existing.count++;
            } else {
              customTagCounts.push({ key: t, count: 1 });
            }
          }
        });
      }
    });

    const N = SKILL_TAGS.length;
    const cx = 260, cy = 250, rMax = 135;
    const getPoint = (index: number, val: number) => {
      const angle = (Math.PI * 2 / N) * index - Math.PI / 2;
      return {
        x: cx + rMax * val * Math.cos(angle),
        y: cy + rMax * val * Math.sin(angle),
        angle
      };
    };

    const dataPoints = tagCounts.map((t, i) => getPoint(i, Math.max(t.pct, 0.20)));
    const dataPath = dataPoints.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ') + ' Z';
    const gridLevels = [0.25, 0.5, 0.75, 1.0];
    const gridPaths = gridLevels.map(lvl => {
      const pts = SKILL_TAGS.map((_, i) => getPoint(i, lvl));
      return pts.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ') + ' Z';
    });

    const isMobileOrTabletView = (windowWidth <= 768 && !isInsideSimTabletLandscape) || isInsideSimMobile;
    return (
      <div style={{ flex: 1, width: '100%', display: 'flex', flexDirection: isMobileOrTabletView ? 'column' : 'row', overflowY: isMobileOrTabletView ? 'auto' : 'hidden', background: useNotebookLayout ? '#fcfaf7' : '#ffffff' }} className="modal-content-container custom-scrollbar">
        {/* LINKE BUCHSEITE: 5-PENTAGON SKILL-RADAR */}
        <div style={{
          flex: isMobileOrTabletView ? 'none' : '1 1 0%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderRight: isMobileOrTabletView ? 'none' : '1px solid #e8e8ed',
          borderBottom: isMobileOrTabletView ? '1.5px solid #e8e8ed' : 'none',
          padding: isMobileOrTabletView ? '16px 14px' : '24px 28px',
          position: 'relative',
          background: '#ffffff'
        }}>
          {/* Apple Glassmorphic Legend Pill */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            padding: '6px 16px',
            fontSize: '0.76rem',
            fontWeight: 700,
            background: 'rgba(245, 245, 247, 0.85)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(0, 0, 0, 0.06)',
            borderRadius: '100px',
            zIndex: 5
          }}>
            <span style={{ color: '#1d1d1f', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#34c759', display: 'inline-block' }} />
              <strong>Außen</strong> = Meisterstufe (Stufe 4–5)
            </span>
            <span style={{ color: '#d2d2d7' }}>•</span>
            <span style={{ color: '#1d1d1f', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#0a84ff', display: 'inline-block' }} />
              <strong>Innen</strong> = Aufstiegs-Stufe
            </span>
            {activeWeeklyTargetTags.length > 0 && (
              <>
                <span style={{ color: '#d2d2d7' }}>•</span>
                <span style={{ color: '#b45309', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ff9f0a', display: 'inline-block' }} />
                  <strong>🎯</strong> = Aktiver Wochenfokus
                </span>
              </>
            )}
          </div>

          {/* Screenreader Accessible Data Table (WCAG 2.2 AA) */}
          <div style={{ position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', border: 0 }} aria-live="polite">
            <table>
              <caption>Musikalische Fähigkeiten und Wochen-Lernziele (5 Säulen)</caption>
              <thead>
                <tr>
                  <th scope="col">Musikalische Säule</th>
                  <th scope="col">Aktuelle Stufe</th>
                  <th scope="col">Status-Titel</th>
                  <th scope="col">Wochenschwerpunkt</th>
                </tr>
              </thead>
              <tbody>
                {tagCounts.map(tag => (
                  <tr key={tag.key}>
                    <td>{tag.label}</td>
                    <td>Stufe {tag.level} von 5</td>
                    <td>{tag.rankTitle}</td>
                    <td>{activeWeeklyTargetTags.includes(tag.key) ? 'Aktiver Wochenschwerpunkt' : 'Reguläre Übung'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* SVG Radar Center Container (Apple Health / Watch Aesthetic) */}
          <div style={{
            margin: 'auto 0',
            width: '100%',
            maxHeight: isMobileOrTabletView ? '340px' : '440px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative'
          }}>
            <svg
              width="100%"
              height="100%"
              viewBox="-20 -20 560 520"
              style={{
                maxWidth: '520px',
                maxHeight: '490px',
                display: 'block',
                overflow: 'visible'
              }}
            >
              <defs>
                {/* Apple Liquid-Glass Gradient */}
                <linearGradient id="appleHealthGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#30d158" stopOpacity="0.32" />
                  <stop offset="100%" stopColor="#0a84ff" stopOpacity="0.12" />
                </linearGradient>

                {/* Soft Apple Polygon Shadow */}
                <filter id="applePolyShadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="4" stdDeviation="8" floodColor="#34c759" floodOpacity="0.22" />
                </filter>
              </defs>

              {/* 1. Concentric Chronometer Grid Pentagons */}
              {gridPaths.map((d, i) => {
                const isOuter = i === 3;
                return (
                  <path
                    key={i}
                    d={d}
                    fill="none"
                    stroke={isOuter ? "#d2d2d7" : "#e5e5ea"}
                    strokeWidth={isOuter ? "1.4" : "0.9"}
                  />
                );
              })}

              {/* 2. Axis Spokes (Fine Precision Lines) */}
              {SKILL_TAGS.map((_, i) => {
                const pt = getPoint(i, 1);
                return (
                  <line
                    key={i}
                    x1={cx}
                    y1={cy}
                    x2={pt.x}
                    y2={pt.y}
                    stroke="#e5e5ea"
                    strokeWidth="0.9"
                  />
                );
              })}

              {/* 3. Primary Apple Liquid-Glass Radar Polygon */}
              <path
                d={dataPath}
                fill="url(#appleHealthGradient)"
                stroke="#34c759"
                strokeWidth="2.8"
                strokeLinejoin="round"
                strokeLinecap="round"
                filter="url(#applePolyShadow)"
                style={{ transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)' }}
              />

              {/* 4. Apple Minimalist Nodes */}
              {tagCounts.map((tag, i) => {
                const p = getPoint(i, Math.max(tag.pct, 0.20));
                const isSuperkraft = tag.level >= 4;
                const isTargetFocus = activeWeeklyTargetTags.includes(tag.key);
                return (
                  <g key={i}>
                    {isTargetFocus ? (
                      <g>
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r="15"
                          fill="rgba(255, 159, 10, 0.16)"
                          stroke="#ff9f0a"
                          strokeWidth="1.5"
                        />
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r="6.5"
                          fill="#ff9f0a"
                          stroke="#ffffff"
                          strokeWidth="2.5"
                          style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.15))' }}
                        />
                      </g>
                    ) : isSuperkraft ? (
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r="5.5"
                        fill="#34c759"
                        stroke="#ffffff"
                        strokeWidth="2.5"
                        style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.12))' }}
                      />
                    ) : (
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r="5"
                        fill="#0a84ff"
                        stroke="#ffffff"
                        strokeWidth="2"
                        style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.12))' }}
                      />
                    )}
                  </g>
                );
              })}

              {/* 5. Apple 2-Line Typographic Labels (Keine klobigen Kasten-Pillen!) */}
              {tagCounts.map((tag, i) => {
                const p = getPoint(i, 1.25);
                const isSuperkraft = tag.level >= 4;
                const isTargetFocus = activeWeeklyTargetTags.includes(tag.key);
                
                let textAnchor: "middle" | "start" | "end" = "middle";
                let offsetX = 0;
                let offsetY = 0;

                if (i === 0) {
                  // Top (Rhythmus)
                  textAnchor = "middle";
                  offsetY = -14;
                } else if (i === 1) {
                  // Top Right (Spieltechnik)
                  textAnchor = "start";
                  offsetX = 10;
                  offsetY = -4;
                } else if (i === 2) {
                  // Bottom Right (Klang)
                  textAnchor = "start";
                  offsetX = 10;
                  offsetY = 10;
                } else if (i === 3) {
                  // Bottom Left (Ausdruck)
                  textAnchor = "end";
                  offsetX = -10;
                  offsetY = 10;
                } else if (i === 4) {
                  // Top Left (Repertoire)
                  textAnchor = "end";
                  offsetX = -10;
                  offsetY = -4;
                }

                const posX = p.x + offsetX;
                const posY = p.y + offsetY;

                return (
                  <g key={i}>
                    {/* Zeile 1: Name */}
                    <text
                      x={posX}
                      y={posY}
                      textAnchor={textAnchor}
                      fontSize="12"
                      fontWeight="700"
                      fill="#1d1d1f"
                      style={{ letterSpacing: '-0.01em', fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif' }}
                    >
                      {tag.icon} {tag.shortLabel}
                    </text>
                    {/* Zeile 2: Subtitle & Level */}
                    <text
                      x={posX}
                      y={posY + 14}
                      textAnchor={textAnchor}
                      fontSize="10.5"
                      fontWeight="600"
                      fill={isTargetFocus ? '#d97706' : (isSuperkraft ? '#15803d' : '#0284c7')}
                      style={{ letterSpacing: '0.01em', fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif' }}
                    >
                      Stufe {tag.level} · {isTargetFocus ? 'Fokus 🎯' : (isSuperkraft ? 'Meister 🌟' : 'Aufsteiger 🚀')}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* VORWOCHEN-RÜCKBLICK & LEHRER-STUNDENEINSTIEG */}
          {(!readOnly || isTeacherTools) && (() => {
            const now = new Date();
            const prevWeekDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            const prevWeekISO = getISOWeek(prevWeekDate);
            const prevWeekNum = prevWeekISO.split('-W')[1] || '';

            const prevWeekItem = (progressItems || []).find((item: any) => {
              if (!item.homework_notes) return false;
              const isMatch = (item.updated_at && getISOWeek(item.updated_at) === prevWeekISO) ||
                              (item.created_at && getISOWeek(item.created_at) === prevWeekISO);
              if (!isMatch) return false;
              const clean = item.homework_notes.replace(/\["STICKER:[^\]]+"\]/g, '').trim();
              return clean.length > 0 && clean !== '[]';
            });

            let prevWeekText = '';
            if (prevWeekItem?.homework_notes) {
              try {
                const parsed = JSON.parse(prevWeekItem.homework_notes);
                if (Array.isArray(parsed)) {
                  prevWeekText = parsed.filter((n: string) => !n.startsWith('STICKER:')).join(' ');
                }
              } catch (e) {
                prevWeekText = String(prevWeekItem.homework_notes).replace(/STICKER:[^|]+\|[^|]+\|[^|]+/, '').trim();
              }
            }

            return (
              <div style={{
                width: '100%',
                background: '#fbfbfd',
                border: '1px solid rgba(0, 0, 0, 0.08)',
                borderRadius: '18px',
                padding: '12px 14px',
                marginTop: '10px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
                zIndex: 5
              }}>
                {/* Header Row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', fontWeight: 700, color: '#1d1d1f' }}>
                    <span>📅</span>
                    <span>Rückblick KW {prevWeekNum || 'Vorwoche'} & Stundeneinstieg</span>
                  </div>
                  <span style={{
                    fontSize: '0.64rem',
                    fontWeight: 600,
                    color: '#86868b',
                    background: 'rgba(0, 0, 0, 0.04)',
                    padding: '2px 8px',
                    borderRadius: '100px'
                  }}>
                    Max. 2 Fokus-Ziele
                  </span>
                </div>

                {/* Vorwochen-Hausaufgabe (Kompakte Apple-Infozeile) */}
                <div style={{
                  background: '#ffffff',
                  border: '1px solid rgba(0, 0, 0, 0.05)',
                  borderRadius: '10px',
                  padding: '6px 10px',
                  fontSize: '0.70rem',
                  color: '#424245',
                  lineHeight: '1.35'
                }}>
                  {prevWeekText ? (
                    <div>
                      <strong style={{ color: '#1d1d1f' }}>{prevWeekItem?.topic_name || `Hausaufgabe KW ${prevWeekNum}`}:</strong> {prevWeekText}
                    </div>
                  ) : (
                    <span style={{ color: '#86868b', fontStyle: 'italic' }}>
                      Keine Hausaufgabe in KW {prevWeekNum || 'der Vorwoche'} erfasst.
                    </span>
                  )}
                </div>

                {/* Apple Segmented Control Grid */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {/* Master Button */}
                  <button
                    type="button"
                    onClick={handleMasterAllSkills}
                    style={{
                      background: 'linear-gradient(180deg, #34c759 0%, #28cd41 100%)',
                      border: 'none',
                      color: '#ffffff',
                      borderRadius: '10px',
                      padding: '7px 12px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      boxShadow: '0 1px 3px rgba(52, 199, 89, 0.3)',
                      transition: 'all 0.15s ease'
                    }}
                    className="hover-scale"
                  >
                    <span>🌟 Alles super gemeistert (100% Souverän)</span>
                  </button>

                  {/* 5 Säulen Segmented Action Chips */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '5px' }}>
                    {(() => {
                      const activeFocusCount = SKILL_TAGS.filter(t => (tagCounts.find(tc => tc.key === t.key)?.level ?? 5) < 5).length;
                      return SKILL_TAGS.map(t => {
                        const tagLevel = tagCounts.find(tc => tc.key === t.key)?.level ?? 5;
                        const isDifficultyActive = tagLevel < 5;
                        const isLevel3 = tagLevel <= 3;
                        const isLocked = activeFocusCount >= 2 && !isDifficultyActive;

                        let btnBg = '#ffffff';
                        let btnBorder = 'rgba(0, 0, 0, 0.08)';
                        let btnColor = '#1d1d1f';
                        let badgeBg = 'rgba(0, 0, 0, 0.04)';
                        let badgeColor = '#86868b';
                        let levelText = '5/5';

                        if (isDifficultyActive) {
                          if (isLevel3) {
                            btnBg = '#e8f2ff';
                            btnBorder = '#0071e3';
                            btnColor = '#0051a8';
                            badgeBg = '#0071e3';
                            badgeColor = '#ffffff';
                            levelText = '3/5 🚀';
                          } else {
                            btnBg = '#fff4e5';
                            btnBorder = '#ff9f0a';
                            btnColor = '#b25e00';
                            badgeBg = '#ff9f0a';
                            badgeColor = '#ffffff';
                            levelText = '4/5 🎯';
                          }
                        }

                        return (
                          <button
                            key={t.key}
                            type="button"
                            disabled={isLocked}
                            onClick={() => {
                              if (!isLocked) handleTriggerSkillQuest(t.key);
                            }}
                            style={{
                              background: btnBg,
                              border: `1px solid ${btnBorder}`,
                              color: isLocked ? '#aeaeb2' : btnColor,
                              borderRadius: '10px',
                              padding: '5px 8px',
                              fontSize: '0.69rem',
                              fontWeight: 700,
                              cursor: isLocked ? 'not-allowed' : 'pointer',
                              opacity: isLocked ? 0.35 : 1,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              boxShadow: isDifficultyActive ? '0 1px 4px rgba(0, 0, 0, 0.08)' : '0 1px 2px rgba(0, 0, 0, 0.02)',
                              transition: 'all 0.15s ease'
                            }}
                            className={isLocked ? '' : 'hover-scale'}
                            title={isLocked ? 'Maximal 2 Schwerpunkte wählbar' : (isDifficultyActive ? `${t.label} ist aktiv (Klick für nächste Stufe/Reset)` : `Markiert ${t.label} als Wochenfokus`)}
                          >
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span>{t.icon}</span>
                              <span style={{ whiteSpace: 'nowrap' }}>{t.shortLabel}</span>
                            </span>
                            <span style={{
                              fontSize: '0.60rem',
                              fontWeight: 800,
                              background: badgeBg,
                              color: badgeColor,
                              padding: '1px 5px',
                              borderRadius: '6px'
                            }}>
                              {levelText}
                            </span>
                          </button>
                        );
                      });
                    })()}
                  </div>
                </div>

                {/* Subtiler Apple Hilfetext */}
                <div style={{ fontSize: '0.62rem', color: '#86868b', textAlign: 'center', lineHeight: '1.3' }}>
                  Klick schaltet Stufe 4 (🎯) → Stufe 3 (🚀) → Stufe 5 (🌟). Maximal 2 Wochenschwerpunkte.
                </div>
              </div>
            );
          })()}

          {/* Floating Apple Scroll Indicator Pill for Mobile */}
          {isMobileOrTabletView && (
            <button
              type="button"
              onClick={() => {
                radarAnalysisCardsRef.current?.scrollIntoView({ behavior: 'smooth' });
              }}
              style={{
                marginTop: '10px',
                marginBottom: '4px',
                background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '100px',
                padding: '8px 16px',
                fontSize: '0.78rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.15)',
                transition: 'all 0.2s ease',
                zIndex: 10
              }}
              className="hover-scale"
            >
              <span>Detail-Analyse & Superkräfte anzeigen</span>
              <ChevronDown size={14} color="#22c55e" />
            </button>
          )}
        </div>

        {/* RECHTE BUCHSEITE: 5 SÄULEN SUPERKRÄFTE & EXPEDITION */}
        <div
          ref={radarAnalysisCardsRef}
          style={{
            flex: isMobileOrTabletView ? 'none' : '1 1 0%',
            width: '100%',
            overflowY: isMobileOrTabletView ? 'visible' : 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            padding: isMobileOrTabletView ? '16px' : '24px',
            position: 'relative'
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* 1. WEEKLY SPOTLIGHT HERO (Spotify-Wrapped / Apple-Replay Glow Card) */}
            {activeWeeklyTargetTags.length > 0 && (
              <div style={{
                background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
                border: '1.5px solid #f59e0b',
                borderRadius: '22px',
                padding: '16px 18px',
                boxShadow: '0 10px 25px -5px rgba(245, 158, 11, 0.15)',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#b45309', fontWeight: 900, fontSize: '0.84rem', letterSpacing: '0.02em' }}>
                    <span style={{ fontSize: '1.1rem' }}>🎯</span>
                    <span>AKTIVES ÜBE-LERNZIEL DIESER WOCHE</span>
                  </div>
                  <span style={{ fontSize: '0.68rem', fontWeight: 850, color: '#92400e', background: 'rgba(255,255,255,0.9)', padding: '3px 10px', borderRadius: '99px', border: '1px solid #f59e0b', boxShadow: '0 2px 6px rgba(245, 158, 11, 0.1)' }}>
                    Wochenschwerpunkt
                  </span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {activeWeeklyTargetTags.map(tagKey => {
                    const tagObj = SKILL_TAGS.find(t => t.key === tagKey);
                    if (!tagObj) return null;
                    return (
                      <span key={tagKey} style={{
                        background: '#ffffff',
                        border: '1.5px solid #f59e0b',
                        color: '#b45309',
                        padding: '5px 14px',
                        borderRadius: '100px',
                        fontSize: '0.78rem',
                        fontWeight: 850,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 2px 8px rgba(245, 158, 11, 0.12)'
                      }}>
                        {tagObj.icon} {tagObj.label} 🎯
                      </span>
                    );
                  })}
                </div>
                <p style={{ margin: 0, fontSize: '0.76rem', color: '#92400e', fontWeight: 600, lineHeight: '1.45' }}>
                  {activeWeeklyTargetTags.includes('rhythmus') && 'Fokus: Gleichmäßiger Puls, sicheres Einzählen und stabiles Timing bei deinen Stücken. '}
                  {activeWeeklyTargetTags.includes('technik') && 'Fokus: Lockere Handhaltung, flüssige Fingerwechsel und entspannte Motorik. '}
                  {activeWeeklyTargetTags.includes('intonation') && 'Fokus: Saubere Tonformung, bewusster Tonansatz und klangvolle Tonkultur. '}
                  {activeWeeklyTargetTags.includes('ausdruck') && 'Fokus: Lebendige Lautstärken (p bis f), Phrasierung und musikalische Emotion. '}
                  {activeWeeklyTargetTags.includes('repertoire') && 'Fokus: Spielfluss, sicheres Auswendigspiel und bühnenreife Souveränität. '}
                </p>
              </div>
            )}

            {/* 2. THE 5-PILLAR EQUALIZER STACK (Studio Metering View) */}
            <div style={{
              background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
              border: '1.5px solid #86efac',
              borderRadius: '22px',
              padding: '16px 18px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              boxShadow: '0 10px 25px -5px rgba(34, 197, 94, 0.10)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.70rem', fontWeight: 900, color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>👑</span>
                  <span>Deine Musikalischen Superkräfte (5 Säulen)</span>
                </span>
                <span style={{ fontSize: '0.68rem', fontWeight: 850, color: '#166534', background: '#ffffff', padding: '3px 10px', borderRadius: '99px', border: '1px solid #86efac', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                  Universell aktiv
                </span>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px', margin: '2px 0' }}>
                {tagCounts.map(s => {
                  const isTarget = activeWeeklyTargetTags.includes(s.key);
                  const isSuper = s.level >= 4;
                  return (
                    <div key={s.key} style={{
                      background: isTarget ? '#fffbeb' : '#ffffff',
                      border: `1.5px solid ${isTarget ? '#f59e0b' : '#86efac'}`,
                      borderRadius: '14px',
                      padding: '8px 12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      boxShadow: isTarget ? '0 3px 10px rgba(245, 158, 11, 0.15)' : '0 2px 6px rgba(0,0,0,0.03)',
                      transition: 'all 0.2s ease'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.76rem', fontWeight: 900, color: isTarget ? '#b45309' : '#14532d' }}>
                          {s.icon} {s.shortLabel}
                        </span>
                        <span style={{ fontSize: '0.68rem', fontWeight: 850, color: isTarget ? '#b45309' : (isSuper ? '#15803d' : '#0369a1') }}>
                          Stufe {s.level}/5
                        </span>
                      </div>

                      <span style={{ fontSize: '0.68rem', fontWeight: 750, color: isTarget ? '#92400e' : '#166534' }}>
                        {s.rankTitle} {isTarget ? '🎯' : (isSuper ? '🌟' : '🚀')}
                      </span>

                      {/* 5-Segment Studio Audio Equalizer LED Meter */}
                      <div style={{ display: 'flex', gap: '3px', alignItems: 'center', marginTop: '3px' }}>
                        {[1, 2, 3, 4, 5].map(seg => {
                          const isFilled = s.level >= seg;
                          let segColor = '#e2e8f0';
                          if (isFilled) {
                            if (isTarget) {
                              segColor = '#f59e0b';
                            } else if (s.level >= 4) {
                              segColor = '#16a34a';
                            } else {
                              segColor = '#0284c7';
                            }
                          }
                          return (
                            <div
                              key={seg}
                              style={{
                                flex: 1,
                                height: '5px',
                                borderRadius: '2px',
                                background: segColor,
                                boxShadow: isFilled ? `0 0 5px ${segColor}88` : 'none',
                                transition: 'all 0.3s ease'
                              }}
                            />
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              <p style={{ margin: '2px 0 0', fontSize: '0.73rem', color: '#166534', lineHeight: 1.35, fontWeight: 600 }}>
                Eindrucksvolles musikalisches Fundament! In diesen 5 Säulen wachsen deine Fähigkeiten mit jedem geübten Song kontinuierlich weiter.
              </p>
            </div>

            {/* 3. DEINE NÄCHSTE MUSIKER-EXPEDITION */}
            {(() => {
              const growthList = tagCounts.filter(t => t.level < 5);
              const nextQuest = growthList.length > 0
                ? growthList.reduce((prev, curr) => curr.level < prev.level ? curr : prev, growthList[0])
                : null;

              if (!nextQuest) {
                return (
                  <div style={{
                    background: 'linear-gradient(135deg, #fefce8 0%, #fef9c3 100%)',
                    border: '1.5px solid #fde047',
                    borderRadius: '22px',
                    padding: '16px 18px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    boxShadow: '0 8px 20px -4px rgba(234, 179, 8, 0.12)'
                  }}>
                    <div style={{ fontSize: '1.5rem', lineHeight: 1 }}>🏆</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ fontSize: '0.66rem', fontWeight: 900, color: '#ca8a04', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Pädagogische Meisterstufe Erreicht
                      </span>
                      <h4 style={{ margin: 0, fontSize: '0.90rem', fontWeight: 900, color: '#854d0e' }}>
                        100% Souveränität auf allen 5 Säulen!
                      </h4>
                      <p style={{ margin: '3px 0 0', fontSize: '0.75rem', color: '#713f12', lineHeight: 1.4, fontWeight: 600 }}>
                        Du beherrschst alle 5 Kern-Dimensionen auf höchster Meister-Stufe! Neue Meisterwerke werden dich weiter inspirieren.
                      </p>
                    </div>
                  </div>
                );
              }

              let questText = 'Spiele deine aktuellen Songs im stabilen Puls mit Metronom, um dein nächstes Level freizuschalten!';
              if (nextQuest.key === 'technik') questText = 'Achte auf lockere Haltung und saubere Wechsel, um deine Virtuosen-Stufe zu meistern!';
              else if (nextQuest.key === 'intonation') questText = 'Forme deine Töne bewusst, sauber und klangvoll für maximalen Hörgenuss!';
              else if (nextQuest.key === 'ausdruck') questText = 'Gestalte lebendige Lautstärken (p bis f) und Phrasen für tiefe musikalische Emotion!';
              else if (nextQuest.key === 'repertoire') questText = 'Festige deine Stücke für freies, bühnensicheres Spiel auswendig!';

              return (
                <div style={{
                  background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                  border: '1.5px solid #93c5fd',
                  borderRadius: '22px',
                  padding: '16px 18px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  boxShadow: '0 8px 20px -4px rgba(59, 130, 246, 0.10)'
                }}>
                  <div style={{ fontSize: '1.4rem', lineHeight: 1 }}>🚀</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontSize: '0.66rem', fontWeight: 900, color: '#1d4ed8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Deine Nächste Musiker-Expedition
                    </span>
                    <h4 style={{ margin: 0, fontSize: '0.90rem', fontWeight: 900, color: '#1e40af' }}>
                      {nextQuest.icon} {nextQuest.label} • Stufe {nextQuest.level}/5
                    </h4>
                    <p style={{ margin: '3px 0 0', fontSize: '0.75rem', color: '#1e3a8a', lineHeight: 1.4, fontWeight: 600 }}>
                      {questText}
                    </p>
                  </div>
                </div>
              );
            })()}

            {/* 4. DIDAKTISCHER IMPULS DEINER LEHRKRAFT (Editorial Quote Capsule) */}
            {(() => {
              const currentWeekStr = getISOWeek();
              const currentItem = (progressItems || []).find((item: any) => 
                (item.updated_at && getISOWeek(item.updated_at) === currentWeekStr) ||
                (item.created_at && getISOWeek(item.created_at) === currentWeekStr) ||
                item.is_current_homework
              );

              let teacherImpulse = '';
              if (currentItem?.teacher_notes) {
                teacherImpulse = String(currentItem.teacher_notes).replace(/\["STICKER:[^\]]+"\]/g, '').replace(/STICKER:[^|]+\|[^|]+\|[^|]+/g, '').replace(/AUDIO:[^\s]+/g, '').trim();
              }
              if (!teacherImpulse && currentItem?.homework_notes) {
                try {
                  const parsed = JSON.parse(currentItem.homework_notes);
                  if (Array.isArray(parsed)) {
                    teacherImpulse = parsed.filter((n: string) => !n.startsWith('STICKER:') && !n.startsWith('AUDIO:')).join(' ').trim();
                  }
                } catch (e) {
                  teacherImpulse = String(currentItem.homework_notes).replace(/\["STICKER:[^\]]+"\]/g, '').replace(/STICKER:[^|]+\|[^|]+\|[^|]+/g, '').replace(/AUDIO:[^\s]+/g, '').trim();
                }
              }
              if (!teacherImpulse && homeworkNotes) {
                teacherImpulse = String(homeworkNotes).replace(/\["STICKER:[^\]]+"\]/g, '').replace(/STICKER:[^|]+\|[^|]+\|[^|]+/g, '').replace(/AUDIO:[^\s]+/g, '').trim();
              }

              return (
                <div style={{
                  background: '#f8fafc',
                  border: '1.5px solid #e2e8f0',
                  borderRadius: '22px',
                  padding: '14px 18px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  boxShadow: '0 4px 14px rgba(0, 0, 0, 0.03)'
                }}>
                  <span style={{ fontSize: '1.3rem', flexShrink: 0, marginTop: '2px' }}>💬</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <span style={{ fontSize: '0.66rem', fontWeight: 900, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Didaktischer Impuls deiner Lehrkraft
                    </span>
                    <p style={{ margin: 0, fontSize: '0.76rem', color: '#1e293b', lineHeight: 1.4, fontWeight: 600, fontStyle: 'italic' }}>
                      {teacherImpulse ? (
                        <span>„{teacherImpulse}“</span>
                      ) : (
                        <span style={{ color: '#64748b' }}>
                          „Jede musikalische Meisterleistung beginnt mit Freude am Entdecken und geduldigem Wachsen.“
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Custom tag pills */}
          {customTagCounts.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Weitere dokumentierte Trainings-Schwerpunkte
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {customTagCounts.sort((a, b) => b.count - a.count).map(tag => (
                  <span key={tag.key} style={{
                    background: '#f8fafc',
                    color: '#475569',
                    border: '1px solid #e2e8f0',
                    padding: '4px 10px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 800
                  }}>
                    ✏️ {tag.key} · {tag.count}×
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderSchoolYearSelector = () => {
    const [cStartYear] = currentSchoolYear.split('/').map(Number);
    const options = [
      currentSchoolYear,
      `${cStartYear - 1}/${cStartYear}`,
      `${cStartYear - 2}/${cStartYear - 1}`
    ];

    return (
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <select
          value={selectedSchoolYear}
          onChange={(e) => setSelectedSchoolYear(e.target.value)}
          style={{
            background: selectedSchoolYear === currentSchoolYear 
              ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' 
              : 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)',
            border: '2px solid #fef3c7',
            color: '#ffffff',
            borderRadius: '999px',
            padding: '8px 36px 8px 16px',
            fontSize: '0.86rem',
            fontWeight: 900,
            cursor: 'pointer',
            outline: 'none',
            boxShadow: '0 4px 16px rgba(245, 158, 11, 0.4)',
            transition: 'all 0.15s ease',
            appearance: 'none',
            WebkitAppearance: 'none'
          }}
        >
          <option value={currentSchoolYear} style={{ color: '#0f172a', fontWeight: 800 }}>
            🎓 Schuljahr {currentSchoolYear} (Aktuell)
          </option>
          {options.slice(1).map(sy => (
            <option key={sy} value={sy} style={{ color: '#0f172a', fontWeight: 800 }}>
              🏆 Schuljahr {sy} (Hall of Fame Archiv)
            </option>
          ))}
        </select>
        <div style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#ffffff', fontSize: '0.7rem' }}>
          ▼
        </div>
      </div>
    );
  };


  const renderFullscreenButton = () => {
    return (
      <button
        type="button"
        onClick={toggleFullscreen}
        title={isFullscreen ? 'Vollbild beenden' : 'Vollbild'}
        style={{
          background: 'rgba(255,255,255,0.15)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: isFullscreen ? '20px' : '50%',
          height: '30px',
          padding: isFullscreen ? '0 10px 0 8px' : '0',
          width: isFullscreen ? 'auto' : '30px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '5px',
          cursor: 'pointer',
          color: '#ffffff',
          fontSize: '0.72rem',
          fontWeight: 700,
          transition: 'all 0.18s ease',
          flexShrink: 0,
          marginRight: '4px',
          whiteSpace: 'nowrap'
        }}
        className="hover-scale"
      >
        {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
        {isFullscreen && <span>Vollbild beenden</span>}
      </button>
    );
  };

  const renderCloseButton = () => {
    if (isEmbed) return null;
    return (
      <button
        type="button"
        onClick={handleClose}
        style={{
          background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
          border: '1px solid rgba(255,255,255,0.35)',
          borderRadius: '20px',
          padding: '6px 16px',
          height: '32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          cursor: 'pointer',
          color: '#ffffff',
          fontWeight: 850,
          fontSize: '0.80rem',
          transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
          flexShrink: 0,
          boxShadow: '0 2px 10px rgba(22, 163, 74, 0.35)'
        }}
        className="hover-scale"
        title="Dokumentation sichern & schließen"
      >
        <Check size={14} strokeWidth={3} />
        <span>Fertig & Schließen</span>
      </button>
    );
  };

  const isMobileOrSim = isFullscreen || isMobileView || isInsideSim || (typeof window !== 'undefined' && window.innerWidth <= 1024);

  const content = (
    <div style={{
      background: useNotebookLayout 
        ? (bookColor 
            ? `radial-gradient(circle, ${bookColor.from} 0%, ${bookColor.to} 100%)` 
            : 'radial-gradient(circle, #5c4d40 0%, #30261f 100%)') 
        : '#ffffff', // Opaque white background canvas for seamless full-height scrolling
      borderRadius: isMobileOrSim ? '0' : '20px',
      width: '100%',
      maxWidth: '100%',
      height: isEmbed ? '100%' : (isMobileOrSim ? '100%' : '92vh'),
      boxShadow: useNotebookLayout ? '0 30px 80px rgba(0, 0, 0, 0.6), inset 0 0 40px rgba(0, 0, 0, 0.4)' : '0 30px 60px -15px rgba(0, 0, 0, 0.25)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      border: useNotebookLayout 
        ? 'none' 
        : '1px solid rgba(0, 0, 0, 0.05)',
      padding: useNotebookLayout ? '6px' : '0',
      position: 'relative',
      transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
    }} className="animation-slide-up">
                {/* Embedded Style Block - Universal for ALL Tabs */}
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
          @keyframes ambientGoldBreathing {
            0%, 100% {
              box-shadow: 0 4px 18px -2px rgba(245, 158, 11, 0.35), inset 0 1px 2px rgba(255, 255, 255, 0.50);
              border-color: rgba(253, 224, 71, 0.70);
            }
            50% {
              box-shadow: 0 4px 28px 3px rgba(251, 191, 36, 0.65), inset 0 1px 3px rgba(255, 255, 255, 0.85);
              border-color: rgba(253, 224, 71, 0.95);
            }
          }
          .modal-content-container {
            display: flex !important;
            flex-direction: row !important;
          }
          
          @media (max-width: 900px) {
            .modal-header-container {
              flex-direction: column !important;
              align-items: stretch !important;
              padding: 8px 12px 6px 12px !important;
              gap: 4px !important;
              flex: 0 0 auto !important;
              flex-shrink: 0 !important;
              height: auto !important;
              min-height: auto !important;
            }
            .header-top-row {
              width: 100% !important;
            }
            .header-tabs-desktop-container {
              display: none !important;
            }
            .header-desktop-archiv {
              display: none !important;
            }
            .header-mobile-menu-row {
              display: flex !important;
            }
            .header-left-info {
              flex-wrap: nowrap !important;
              width: auto !important;
              gap: 8px !important;
            }
            
            .modal-content-container {
              flex-direction: column !important;
              overflow-y: auto !important;
              height: auto !important;
              flex: 1 1 0% !important;
              min-height: 0 !important;
              -webkit-overflow-scrolling: touch !important;
            }
            .modal-content-container > div {
              width: 100% !important;
              max-width: 100% !important;
              height: auto !important;
              max-height: none !important;
              flex: none !important;
              min-height: 0 !important;
              overflow-y: visible !important;
              box-sizing: border-box !important;
              border-right: none !important;
              border-left: none !important;
            }
          }

          [class*="sim-viewport"] .modal-header-container,
          .sim-viewport-mobile .modal-header-container,
          .sim-viewport-portrait .modal-header-container,
          .sim-viewport-tablet .modal-header-container {
            flex-direction: column !important;
            align-items: stretch !important;
            padding: 8px 12px 6px 12px !important;
            gap: 4px !important;
            flex: 0 0 auto !important;
            flex-shrink: 0 !important;
            height: auto !important;
            min-height: auto !important;
          }
          [class*="sim-viewport"] .header-top-row,
          .sim-viewport-mobile .header-top-row,
          .sim-viewport-portrait .header-top-row,
          .sim-viewport-tablet .header-top-row {
            width: 100% !important;
          }
          [class*="sim-viewport"] .header-tabs-desktop-container,
          .sim-viewport-mobile .header-tabs-desktop-container,
          .sim-viewport-portrait .header-tabs-desktop-container,
          .sim-viewport-tablet .header-tabs-desktop-container {
            display: none !important;
          }
          [class*="sim-viewport"] .header-desktop-archiv,
          .sim-viewport-mobile .header-desktop-archiv,
          .sim-viewport-portrait .header-desktop-archiv,
          .sim-viewport-tablet .header-desktop-archiv {
            display: none !important;
          }
          [class*="sim-viewport"] .header-mobile-menu-row,
          .sim-viewport-mobile .header-mobile-menu-row,
          .sim-viewport-portrait .header-mobile-menu-row,
          .sim-viewport-tablet .header-mobile-menu-row {
            display: flex !important;
          }
          [class*="sim-viewport"] .header-left-info,
          .sim-viewport-mobile .header-left-info,
          .sim-viewport-portrait .header-left-info,
          .sim-viewport-tablet .header-left-info {
            flex-wrap: nowrap !important;
            width: auto !important;
            gap: 8px !important;
          }
          [class*="sim-viewport"] .modal-content-container,
          .sim-viewport-mobile .modal-content-container,
          .sim-viewport-portrait .modal-content-container,
          .sim-viewport-tablet .modal-content-container {
            flex-direction: column !important;
            overflow-y: auto !important;
            height: auto !important;
            flex: 1 1 0% !important;
            min-height: 0 !important;
            -webkit-overflow-scrolling: touch !important;
          }
          [class*="sim-viewport"] .modal-content-container > div,
          .sim-viewport-mobile .modal-content-container > div,
          .sim-viewport-portrait .modal-content-container > div,
          .sim-viewport-tablet .modal-content-container > div {
            width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
            max-height: none !important;
            flex: none !important;
            min-height: 0 !important;
            overflow-y: visible !important;
            box-sizing: border-box !important;
            border-right: none !important;
            border-left: none !important;
          }
        `}} />

        {/* Header - Apple-style compact redesign */}
        <div style={{
          padding: isMobileOrSim ? '8px 12px 6px 12px' : 'max(16px, env(safe-area-inset-top, 16px)) max(20px, env(safe-area-inset-right, 20px)) 16px max(20px, env(safe-area-inset-left, 20px))',
          background: 'linear-gradient(135deg, #34a853 0%, #4f46e5 100%)',
          backdropFilter: 'none',
          borderBottom: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: '0',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 50,
          boxShadow: '0 2px 8px rgba(0,0,0,0.12)'
        }} className="modal-header-container">
          
          {/* Top Row / Desktop Row */}
          <div className="header-top-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', minWidth: 0, position: 'relative' }}>
            {/* Left: Avatar + Student Info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }} className="header-left-info">
              <div 
                onClick={() => onProfileClick && onProfileClick(student)}
                title={onProfileClick ? 'Schülerprofil anzeigen' : undefined}
                style={{
                  width: isMobileOrSim ? '30px' : '38px',
                  height: isMobileOrSim ? '30px' : '38px',
                  borderRadius: '10px',
                  overflow: 'hidden',
                  flexShrink: 0,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
                  border: '1.5px solid rgba(255, 213, 79, 0.2)',
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h2 
                    onClick={() => onProfileClick && onProfileClick(student)}
                    title={onProfileClick ? 'Schülerprofil anzeigen' : undefined}
                    style={{
                      margin: 0,
                      fontSize: '1rem',
                      fontWeight: 700,
                      color: '#ffffff',
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
                    {displayedStudentName}
                  </h2>
                  <button
                    type="button"
                    onClick={() => { setOnboardingStep(0); setShowProtokollOnboarding(true); }}
                    title="Anleitung & Onboarding anzeigen"
                    style={{
                      background: 'rgba(255, 255, 255, 0.18)',
                      border: '1px solid rgba(255, 255, 255, 0.28)',
                      color: '#ffffff',
                      width: '22px',
                      height: '22px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      padding: 0,
                      boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                      transition: 'all 0.2s ease',
                      flexShrink: 0
                    }}
                    className="hover-scale"
                  >
                    <Info size={13} color="#ffffff" />
                  </button>
                </div>
                <span style={{
                  fontSize: '0.68rem',
                  color: 'rgba(230, 244, 234, 0.85)',
                  fontWeight: 500,
                  letterSpacing: '0.01em'
                }}>
                  {isTeacherTools ? 'Aufgabenheft / Tools' : 'Schüler-Protokoll & Skill-Radar'}
                </span>
              </div>
            </div>

            {/* Desktop Navigation Action: Centered Monochrome Back to Modules Button + Apple Spotlight Search & Segmented Switch */}
            {(activeViewMode !== 'document' || activeModalTab !== 'document' || activeSubView !== 'hub' || hubTab === 'protocol') && (
              <div style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                display: isMobileOrSim ? 'none' : 'flex',
                alignItems: 'center',
                gap: '10px',
                zIndex: 10
              }}>
                <button
                  type="button"
                  onClick={() => {
                    setActiveModalTab('document');
                    setActiveViewMode('document');
                    setActiveSubView('hub');
                    setHubTab('modules');
                  }}
                  style={{
                    background: 'rgba(255, 255, 255, 0.16)',
                    backdropFilter: 'blur(24px)',
                    WebkitBackdropFilter: 'blur(24px)',
                    border: '1px solid rgba(255, 255, 255, 0.32)',
                    color: '#ffffff',
                    padding: '7px 18px',
                    borderRadius: '100px',
                    fontSize: '0.80rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '7px',
                    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.08), inset 0 1px 1px rgba(255, 255, 255, 0.35)',
                    transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                    letterSpacing: '-0.01em',
                    userSelect: 'none'
                  }}
                  className="hover-scale"
                >
                  <ArrowLeft size={15} color="#ffffff" strokeWidth={2.6} />
                  <span>Zurück zu den Modulen</span>
                </button>

                {/* 🔍 In Recordings View: Clean High-Contrast Spotlight Search Bar */}
                {activeViewMode === 'recordings' && (
                  <div style={{ position: 'relative', width: '260px' }}>
                    <Search size={14} color="#64748b" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      type="text"
                      placeholder="Aufnahmen durchsuchen..."
                      value={recordingSearchQuery}
                      onChange={(e) => setRecordingSearchQuery(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '6px 28px 6px 34px',
                        borderRadius: '100px',
                        border: '1.5px solid #e2e8f0',
                        background: '#ffffff',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        color: '#0f172a',
                        outline: 'none',
                        boxSizing: 'border-box',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'
                      }}
                    />
                    {recordingSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setRecordingSearchQuery('')}
                        style={{
                          position: 'absolute',
                          right: '8px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: '#e2e8f0',
                          border: 'none',
                          borderRadius: '50%',
                          width: '16px',
                          height: '16px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#64748b',
                          cursor: 'pointer',
                          fontSize: '10px',
                          padding: 0
                        }}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Actions (Always visible on all screen sizes, including Fullscreen + Close) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }} className="header-right-actions">
              {renderFullscreenButton()}
              {renderCloseButton()}
            </div>

          </div>

          {/* Bottom Row (mobile/tablet only) - Apple Native Dropdown Selection Menu + Left/Right Quick-Click Buttons */}
          {(() => {
            const tabOptions = [
              { value: 'modules', label: 'Module (Studio)' },
              { value: 'protocol', label: isTeacherTools ? 'Aufgabenheft' : 'Schüler-Protokoll' },
              { value: 'loopstation', label: 'Audio-Loopstation' },
              { value: 'practice', label: 'Übe-Begleiter' },
              { value: 'recordings', label: 'Audio-Aufnahmen' },
              { value: 'tuner', label: 'Stimmgerät (Tuner)' },
              { value: 'radar', label: 'Skill-Radar' },
              { value: 'history', label: 'Archiv & Historie' }
            ];

            const currentTabValue = 
              activeModalTab === 'skillradar' ? 'radar' :
              activeModalTab === 'stickeralbum' ? 'stickers' :
              activeModalTab === 'audiobiography' ? 'audiobiography' :
              activeModalTab === 'logbook' ? 'meisterwerke' :
              (activeModalTab === 'document' && activeSubView === 'history') ? 'history' :
              (activeModalTab === 'document' && activeViewMode === 'document' && activeSubView === 'hub') ? (hubTab === 'modules' ? 'modules' : 'protocol') :
              activeViewMode;

            const handleTabSelect = (val: string) => {
              if (val === 'modules') {
                setActiveModalTab('document');
                setActiveViewMode('document');
                setActiveSubView('hub');
                setHubTab('modules');
              } else if (val === 'protocol') {
                setActiveModalTab('document');
                setActiveViewMode('document');
                setActiveSubView('hub');
                setHubTab('protocol');
              } else if (val === 'radar') {
                setActiveModalTab('skillradar');
              } else if (val === 'stickers') {
                setActiveModalTab('stickeralbum');
                setActiveSubView('hub');
              } else if (val === 'audiobiography') {
                setActiveModalTab('audiobiography');
                setActiveSubView('hub');
              } else if (val === 'meisterwerke') {
                setActiveModalTab('logbook');
              } else if (val === 'history') {
                setActiveModalTab('document');
                setActiveSubView('history');
              } else {
                setActiveModalTab('document');
                setActiveViewMode(val as any);
                setActiveSubView('hub');
              }
            };

            const currentIndex = tabOptions.findIndex(t => t.value === currentTabValue);

            const handlePrevTab = () => {
              const prevIdx = (currentIndex - 1 + tabOptions.length) % tabOptions.length;
              handleTabSelect(tabOptions[prevIdx].value);
            };

            const handleNextTab = () => {
              const nextIdx = (currentIndex + 1) % tabOptions.length;
              handleTabSelect(tabOptions[nextIdx].value);
            };

            return (
              <div className="header-mobile-menu-row" style={{
                display: isMobileOrSim ? 'flex' : 'none',
                width: '100%',
                marginTop: '4px',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '6px'
              }}>
                {/* Left Arrow Quick-Click Button */}
                <button
                  type="button"
                  onClick={handlePrevTab}
                  title="Vorheriger Tab"
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.22)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    border: '1px solid rgba(255, 255, 255, 0.4)',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.12)',
                    flexShrink: 0,
                    outline: 'none'
                  }}
                >
                  <ChevronLeft size={18} color="white" />
                </button>

                {/* Center Select Dropdown */}
                <div style={{
                  position: 'relative',
                  width: '100%',
                  maxWidth: '240px'
                }}>
                  <select
                    value={currentTabValue}
                    onChange={(e) => handleTabSelect(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 32px 8px 14px',
                      borderRadius: '100px',
                      background: 'rgba(255, 255, 255, 0.22)',
                      backdropFilter: 'blur(16px)',
                      WebkitBackdropFilter: 'blur(16px)',
                      border: '1px solid rgba(255, 255, 255, 0.4)',
                      color: '#ffffff',
                      fontWeight: 800,
                      fontSize: '0.82rem',
                      appearance: 'none',
                      WebkitAppearance: 'none',
                      cursor: 'pointer',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.12)',
                      outline: 'none',
                      textAlign: 'center'
                    }}
                  >
                    {tabOptions.map(opt => (
                      <option key={opt.value} value={opt.value} style={{ color: '#000', background: '#fff' }}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={15} color="white" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                </div>

                {/* Right Arrow Quick-Click Button */}
                <button
                  type="button"
                  onClick={handleNextTab}
                  title="Nächster Tab"
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.22)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    border: '1px solid rgba(255, 255, 255, 0.4)',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.12)',
                    flexShrink: 0,
                    outline: 'none'
                  }}
                >
                  <ChevronRight size={18} color="white" />
                </button>
              </div>
            );
          })()}
        </div>

        {/* Modal Content - Side-by-side Columns or Logbook */}
        <div
          onTouchStart={(e) => {
            if (!isMobileView || activeModalTab !== 'document') return;
            touchStartXRef.current = e.touches[0].clientX;
            touchStartYRef.current = e.touches[0].clientY;
          }}
          onTouchEnd={(e) => {
            if (!isMobileView || activeModalTab !== 'document' || touchStartXRef.current === null || touchStartYRef.current === null) return;
            const deltaX = e.changedTouches[0].clientX - touchStartXRef.current;
            const deltaY = e.changedTouches[0].clientY - touchStartYRef.current;
            touchStartXRef.current = null;
            touchStartYRef.current = null;

            if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY) * 1.3) {
              if (deltaX < -40) {
                setMobileProtokollTab('homework');
              } else if (deltaX > 40) {
                setMobileProtokollTab('repertoire');
              }
            }
          }}
          style={{
            display: 'flex',
            flex: 1,
            overflowY: (isMobileOrSim || activeViewMode !== 'document' || activeModalTab !== 'document') ? 'auto' : 'hidden',
            overflowX: 'hidden',
            WebkitOverflowScrolling: 'touch',
            minHeight: 0,
            background: useNotebookLayout 
              ? (bookColor 
                  ? `radial-gradient(circle, ${bookColor.from} 0%, ${bookColor.to} 100%)` 
                  : 'radial-gradient(circle, #5c4d40 0%, #30261f 100%)') 
              : '#ffffff',
            padding: '0',
            position: 'relative'
          }} className="modal-content-container">
          {activeModalTab === 'skillradar' ? (
            <div style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: isMobileOrSim ? '16px 16px calc(280px + env(safe-area-inset-bottom, 40px)) 16px' : '20px 24px 80px 24px'
            }}>
              {renderSkillRadarTabContent()}
            </div>
          ) : activeViewMode === 'loopstation' ? (
            <div style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: isMobileOrSim ? '16px 16px calc(280px + env(safe-area-inset-bottom, 40px)) 16px' : '20px 24px 80px 24px'
            }}>
              <GrooveLoopstation
                student={student}
                homeworkNotesList={homeworkNotesList}
                setHomeworkNotesList={setHomeworkNotesList}
                syncHomeworkNotes={syncHomeworkNotes}
                fetchProgress={fetchProgress}
                notifyHomeworkChange={notifyHomeworkChange}
                readOnly={readOnly}
                setActiveViewMode={setActiveViewMode}
                useNotebookLayout={useNotebookLayout}
                hasTresorStorage={hasTresorStorage}
              />
            </div>
          ) : activeViewMode === 'practice' ? (
            <div style={{
              width: '100%',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
              boxSizing: 'border-box',
              padding: isMobileOrSim ? '16px 16px calc(280px + env(safe-area-inset-bottom, 40px)) 16px' : '16px 20px 20px 20px'
            }}>
              <GroovePracticeCompanion
                useNotebookLayout={useNotebookLayout}
                isCampusModule={true}
                studentId={student.id}
                student={student}
                onNavigateToRecordings={() => setActiveViewMode('recordings')}
                activeSongContext={activeRhythmSong}
                onRhythmScoreUpdate={(score, details) => {
                  if (details.beatsCount >= 12) {
                    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    const starsStr = '⭐'.repeat(details.stars || 1);
                    const entry = `RHYTHM_SCORE:${score}%|${details.bpm}|${details.beatsCount}|${timeStr}|${starsStr}|${details.songTitle || ''}`;
                    setHomeworkNotesList(prev => {
                      const filtered = prev.filter(n => !n.startsWith('RHYTHM_SCORE:'));
                      const updated = [...filtered, entry];
                      syncHomeworkNotes(updated).catch(err => console.error('Error syncing rhythm score:', err));
                      return updated;
                    });
                  }
                }}
              />
            </div>
          ) : activeViewMode === 'tuner' ? (
            <div style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: isMobileOrSim ? '16px 16px calc(280px + env(safe-area-inset-bottom, 40px)) 16px' : '28px 24px 80px 24px'
            }}>
              <CampusTuner
                uiLevel={uiLevel}
              />
            </div>
          ) : activeViewMode === 'recordings' ? (
            <div style={{ display: 'flex', width: '100%', height: '100%', minHeight: 0, overflow: 'hidden' }}>
              {/* ========================================================================= */}
              {/* LEFT PAGE: 🎙️ AUFNAHMEN VOM LEHRER (Play-Alongs & Unterrichts-Audios)     */}
              {/* ========================================================================= */}
              <div style={{
                  flex: isTeacherTools ? '1 1 100%' : '1 1 0%',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                background: useNotebookLayout ? '#faf8f2' : '#ffffff',
                borderRadius: isTeacherTools ? '0 0 20px 20px' : (useNotebookLayout ? '0 0 0 20px' : '0'),
                boxShadow: useNotebookLayout ? '-10px 10px 20px rgba(0,0,0,0.15)' : 'none',
                borderRight: isTeacherTools ? 'none' : (useNotebookLayout ? '1px dashed #e5e0d4' : '1px solid #e8e8ed'),
                padding: isMobileOrSim ? '20px 16px calc(280px + env(safe-area-inset-bottom, 40px)) 16px' : '28px'
              }}>
                {useNotebookLayout && !isTeacherTools && (
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
                
                {/* Header: Teacher Recordings */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                  <div style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '14px',
                    background: 'linear-gradient(135deg, #e6f4ea 0%, #d1fae5 100%)',
                    color: '#15803d',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 10px rgba(52, 168, 83, 0.15)',
                    flexShrink: 0
                  }}>
                    <Mic size={20} strokeWidth={2.4} />
                  </div>
                  <div>
                    <span style={{ fontSize: '0.70rem', fontWeight: 900, color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Vom Unterricht
                    </span>
                    <h3 style={{ margin: '1px 0 0 0', fontSize: '1.15rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em' }}>
                      {isTeacherMode ? `Unterrichts-Aufnahmen & Play-Alongs für ${studentFirstName}` : 'Aufnahmen von deiner Lehrkraft'}
                    </h3>
                  </div>
                </div>

                {/* Teacher Record Tool (when teacher is viewing) */}
                {isTeacherMode && (
                  <div style={{
                    margin: '0 0 16px 0',
                    padding: '12px 14px',
                    background: '#f8fafc',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '0.80rem', fontWeight: 900, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>🎙️ Neue Lehrkraft-Aufnahme</span>
                        <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 650 }}>
                          {hasTresorStorage ? '(max. 7 Min.)' : '(max. 60s)'}
                        </span>
                      </span>
                      {!isRecordingAudio ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', position: 'relative' }}>
                          {/* ⏱️ Metronom / Klick Button */}
                          <button
                            type="button"
                            onClick={() => setShowRecordingMetronomePopup(prev => !prev)}
                            style={{
                              background: isRecordingMetronomeActive ? '#dcfce7' : '#f8fafc',
                              border: isRecordingMetronomeActive ? '1.5px solid #16a34a' : '1.5px solid #cbd5e1',
                              color: isRecordingMetronomeActive ? '#15803d' : '#64748b',
                              borderRadius: '10px',
                              width: '32px',
                              height: '32px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              flexShrink: 0,
                              boxShadow: isRecordingMetronomeActive ? '0 2px 8px rgba(22, 163, 74, 0.25)' : 'none',
                              transition: 'all 0.15s ease'
                            }}
                            className="hover-scale-mini"
                            title={isRecordingMetronomeActive ? `Klick aktiv (${recordingBpm} BPM)` : 'Klick / Metronom einstellen'}
                          >
                            <MechanicalMetronomeIcon size={16} color={isRecordingMetronomeActive ? '#15803d' : '#64748b'} strokeWidth={isRecordingMetronomeActive ? 2.4 : 2} />
                          </button>

                          {/* Metronome Flyout Popup */}
                          {showRecordingMetronomePopup && (
                            <div style={{
                              position: 'absolute',
                              bottom: '100%',
                              right: 0,
                              marginBottom: '10px',
                              background: '#ffffff',
                              borderRadius: '16px',
                              border: '1.5px solid #e2e8f0',
                              boxShadow: '0 12px 30px rgba(0, 0, 0, 0.15), 0 2px 6px rgba(0,0,0,0.05)',
                              padding: '12px 14px',
                              width: '240px',
                              zIndex: 100,
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '10px'
                            }}>
                              {/* Header */}
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.80rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                  <MechanicalMetronomeIcon size={16} color="#16a34a" strokeWidth={2.2} />
                                  <span>Klick / Metronom</span>
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setShowRecordingMetronomePopup(false)}
                                  style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '2px' }}
                                >
                                  <X size={14} />
                                </button>
                              </div>

                              {/* Toggle Button */}
                              <button
                                type="button"
                                onClick={() => {
                                  const next = !isRecordingMetronomeActive;
                                  setIsRecordingMetronomeActive(next);
                                  if (next) playMetronomeTick(true);
                                }}
                                style={{
                                  width: '100%',
                                  background: isRecordingMetronomeActive ? '#16a34a' : '#f1f5f9',
                                  color: isRecordingMetronomeActive ? '#ffffff' : '#475569',
                                  border: 'none',
                                  borderRadius: '10px',
                                  padding: '7px 10px',
                                  fontSize: '0.76rem',
                                  fontWeight: 850,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '6px',
                                  boxShadow: isRecordingMetronomeActive ? '0 2px 8px rgba(22, 163, 74, 0.25)' : 'none'
                                }}
                                className="hover-scale-mini"
                              >
                                <span>{isRecordingMetronomeActive ? '✓ Klick ist AN' : 'Klick einschalten'}</span>
                              </button>

                              {/* BPM Slider & Stepper */}
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', fontWeight: 800, color: '#475569' }}>
                                  <span>Tempo</span>
                                  <span style={{ color: '#16a34a', fontWeight: 900 }}>{recordingBpm} BPM</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <button
                                    type="button"
                                    onClick={() => setRecordingBpm(b => Math.max(40, b - 5))}
                                    style={{ background: '#f1f5f9', border: 'none', borderRadius: '6px', width: '24px', height: '24px', fontWeight: 900, cursor: 'pointer' }}
                                  >-</button>
                                  <input
                                    type="range"
                                    min="40"
                                    max="240"
                                    value={recordingBpm}
                                    onChange={(e) => setRecordingBpm(parseInt(e.target.value, 10))}
                                    style={{ flex: 1, accentColor: '#16a34a', cursor: 'pointer' }}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setRecordingBpm(b => Math.min(240, b + 5))}
                                    style={{ background: '#f1f5f9', border: 'none', borderRadius: '6px', width: '24px', height: '24px', fontWeight: 900, cursor: 'pointer' }}
                                  >+</button>
                                </div>
                              </div>

                              {/* Test Click Button */}
                              <button
                                type="button"
                                onClick={() => playMetronomeTick(true)}
                                style={{
                                  background: '#f8fafc',
                                  border: '1px solid #e2e8f0',
                                  borderRadius: '8px',
                                  padding: '5px 8px',
                                  fontSize: '0.70rem',
                                  fontWeight: 750,
                                  color: '#64748b',
                                  cursor: 'pointer'
                                }}
                              >
                                🔊 Klick kurz testen
                              </button>
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={startRecordingAudio}
                            disabled={isUploadingAudio}
                            style={{
                              background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                              color: '#fff',
                              border: 'none',
                              padding: '6px 14px',
                              borderRadius: '10px',
                              fontSize: '0.74rem',
                              fontWeight: 850,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              boxShadow: '0 2px 8px rgba(34, 197, 94, 0.25)'
                            }}
                            className="hover-scale"
                          >
                            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#ffffff', display: 'inline-block' }} />
                            <span>Aufnahme starten</span>
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => stopRecordingAudio()}
                          style={{
                            background: '#ef4444',
                            color: '#fff',
                            border: 'none',
                            padding: '6px 14px',
                            borderRadius: '10px',
                            fontSize: '0.74rem',
                            fontWeight: 850,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)',
                            animation: 'pulse 1.5s infinite'
                          }}
                          className="hover-scale"
                        >
                          <span style={{ width: '7px', height: '7px', background: '#ffffff', display: 'inline-block' }} />
                          <span>Stopp ({hasTresorStorage ? `${formatRecordTime(audioDuration)} / 7:00 Min.` : `${audioDuration}s / 60s`})</span>
                        </button>
                      )}
                    </div>
                    
                    {!isRecordingAudio && (
                      <input
                        type="text"
                        placeholder="Titel der Aufnahme (z. B. Song-Teil A langsam üben)..."
                        value={audioLabel}
                        onChange={(e) => setAudioLabel(e.target.value)}
                        style={{
                          width: '100%',
                          fontSize: '0.80rem',
                          padding: '8px 12px',
                          borderRadius: '10px',
                          border: '1.5px solid #cbd5e1',
                          background: '#fff',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                    )}

                    {isUploadingAudio && (
                      <div style={{ fontSize: '0.74rem', color: '#15803d', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}>
                        <span>⏳</span> Audio wird gesichert und zur Schüler-Übersicht hinzugefügt...
                      </div>
                    )}
                  </div>
                )}

                {/* Teacher Recordings Gallery with Weekly Accordions */}
                {(() => {
                  // Collect ALL teacher audios from homeworkNotesList, local storage, and progressItems
                  const rawAudioStrings: { str: string; originalIdx: number }[] = [];
                  (homeworkNotesList || []).forEach((note, idx) => {
                    if (typeof note === 'string' && note.includes('AUDIO:')) {
                      rawAudioStrings.push({ str: note, originalIdx: idx });
                    }
                  });

                  try {
                    if (student?.id) {
                      const localGen = localStorage.getItem(`campus_homework_notes_${student.id}`);
                      if (localGen && localGen.includes('AUDIO:')) {
                        try {
                          const p = JSON.parse(localGen);
                          if (Array.isArray(p)) {
                            p.forEach((item: any) => {
                              if (typeof item === 'string' && item.includes('AUDIO:') && !rawAudioStrings.some(x => x.str === item)) {
                                rawAudioStrings.push({ str: item, originalIdx: -1 });
                              }
                            });
                          }
                        } catch {
                          if (!rawAudioStrings.some(x => x.str === localGen)) {
                            rawAudioStrings.push({ str: localGen, originalIdx: -1 });
                          }
                        }
                      }
                    }
                  } catch {}

                  const teacherAudios: any[] = [];
                  const seenTeacherUrls = new Set<string>();

                  rawAudioStrings.forEach(item => {
                    const cleanStr = item.str.startsWith('[') ? item.str.replace(/[\[\]"]/g, '') : item.str;
                    const parts = cleanStr.substring(cleanStr.indexOf('AUDIO:') + 6).split('|');
                    const url = parts[0]?.trim();
                    if (!url || seenTeacherUrls.has(url)) return;

                    seenTeacherUrls.add(url);
                    teacherAudios.push({
                      url,
                      duration: parseInt(parts[1] || '0', 10),
                      date: parts[2] || new Date().toISOString(),
                      label: parts[3] || `Aufnahme #${teacherAudios.length + 1}`,
                      originalIdx: item.originalIdx
                    });
                  });

                  if (teacherAudios.length === 0) {
                    return (
                      <div style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#94a3b8',
                        padding: '40px 20px',
                        gap: '12px',
                        textAlign: 'center',
                        background: '#f8fafc',
                        borderRadius: '20px',
                        border: '1.5px dashed #e2e8f0'
                      }}>
                        <div style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '50%',
                          background: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#34a853',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                        }}>
                          <Music size={22} />
                        </div>
                        <div>
                          <h4 style={{ margin: '0 0 4px 0', fontSize: '0.92rem', fontWeight: 900, color: '#1e293b' }}>
                            Noch keine Aufnahmen vom Lehrer
                          </h4>
                          <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b', fontWeight: 600, maxWidth: '260px', lineHeight: 1.45 }}>
                            Sobald dein Lehrer im Unterricht ein Play-Along oder Übe-Beispiel aufnimmt, findest du es hier!
                          </p>
                        </div>
                      </div>
                    );
                  }

                  const now = getSimulatedNow();
                  const currentWeekStr = getISOWeek(now);
                  const currentWeekNum = currentWeekStr.split("-W")[1] || "";

                  // Filter by Search Query if active
                  const isSearching = recordingSearchQuery.trim() !== "";
                  const searchResults = isSearching ? teacherAudios.filter(aud => {
                    const q = recordingSearchQuery.toLowerCase().trim();
                    return (aud.label || "").toLowerCase().includes(q) || (aud.date || "").toLowerCase().includes(q);
                  }) : [];

                  // Current Week Audios
                  const currentWeekAudios = teacherAudios.filter(aud => {
                    const d = aud.date ? new Date(aud.date) : now;
                    return getISOWeek(isNaN(d.getTime()) ? now : d) === currentWeekStr;
                  });

                  // Favorite Audios
                  const favoriteTeacherAudios = teacherAudios.filter(aud => favoriteAudioUrls.includes(aud.url));

                  // Group Past Audios into Month Albums
                  const pastAudios = teacherAudios.filter(aud => {
                    const d = aud.date ? new Date(aud.date) : now;
                    return getISOWeek(isNaN(d.getTime()) ? now : d) !== currentWeekStr;
                  });

                  const monthGroups: { [monthKey: string]: { monthKey: string; monthLabel: string; weeks: { [weekKey: string]: any[] }; totalTakes: number } } = {};
                  pastAudios.forEach(aud => {
                    const d = aud.date ? new Date(aud.date) : now;
                    const dateObj = isNaN(d.getTime()) ? now : d;
                    const monthKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}`;
                    const monthLabel = dateObj.toLocaleDateString("de-DE", { month: "long", year: "numeric" });
                    const weekKey = getISOWeek(dateObj);

                    if (!monthGroups[monthKey]) {
                      monthGroups[monthKey] = { monthKey, monthLabel, weeks: {}, totalTakes: 0 };
                    }
                    if (!monthGroups[monthKey].weeks[weekKey]) {
                      monthGroups[monthKey].weeks[weekKey] = [];
                    }
                    monthGroups[monthKey].weeks[weekKey].push(aud);
                    monthGroups[monthKey].totalTakes += 1;
                  });

                  const sortedMonths = Object.values(monthGroups).sort((a, b) => b.monthKey.localeCompare(a.monthKey));

                  // 🔍 SEARCH RESULTS VIEW
                  if (isSearching) {
                    return (
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        <div style={{ fontSize: "0.76rem", fontWeight: 850, color: "#15803d", marginBottom: "4px" }}>
                          🔍 {searchResults.length} {searchResults.length === 1 ? "Treffer" : "Treffer"} zur Suche „{recordingSearchQuery}“
                        </div>
                        {searchResults.map((aud, idx) => (
                          <InlineAudioPlayer 
                            key={`teacher-search-${idx}`}
                            url={aud.url} 
                            label={aud.label} 
                            duration={aud.duration}
                            date={aud.date}
                            isFavorite={favoriteAudioUrls.includes(aud.url)}
                            onToggleFavorite={() => toggleFavoriteAudio(aud.url)}
                            themeColor="#15803d"
                            themeBg="#e6f4ea"
                            badge="👨‍🏫 Lehrkraft"
                            badgeBg="#dcfce7"
                            badgeColor="#15803d"
                            onDelete={!readOnly ? () => handleDeleteNote(aud.originalIdx) : undefined}
                          />
                        ))}
                      </div>
                    );
                  }

                  // ⭐ FAVORITES DRILLDOWN VIEW
                  if (showTeacherFavoritesOnly) {
                    return (
                      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                          <button
                            type="button"
                            onClick={() => setShowTeacherFavoritesOnly(false)}
                            style={{
                              background: "#ffffff",
                              border: "1px solid #cbd5e1",
                              borderRadius: "100px",
                              padding: "4px 12px",
                              fontSize: "0.72rem",
                              fontWeight: 800,
                              color: "#475569",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px"
                            }}
                            className="hover-scale"
                          >
                            <ArrowLeft size={12} /> Zurück zur Übersicht
                          </button>
                          <span style={{ fontSize: "0.76rem", fontWeight: 900, color: "#ca8a04" }}>
                            ⭐ {favoriteTeacherAudios.length} Favoriten
                          </span>
                        </div>

                        {favoriteTeacherAudios.length === 0 ? (
                          <div style={{ textAlign: "center", padding: "30px 16px", color: "#94a3b8", fontSize: "0.80rem", fontWeight: 700 }}>
                            Noch keine Favoriten markiert. Klicke bei einer Aufnahme auf das Stern-Symbol ⭐!
                          </div>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                            {favoriteTeacherAudios.map((aud, idx) => (
                              <InlineAudioPlayer 
                                key={`teacher-fav-${idx}`}
                                url={aud.url} 
                                label={aud.label} 
                                duration={aud.duration}
                                date={aud.date}
                                isFavorite={true}
                                onToggleFavorite={() => toggleFavoriteAudio(aud.url)}
                                themeColor="#15803d"
                                themeBg="#e6f4ea"
                                badge="👨‍🏫 Lehrkraft"
                                badgeBg="#dcfce7"
                                badgeColor="#15803d"
                                onDelete={!readOnly ? () => handleDeleteNote(aud.originalIdx) : undefined}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  }

                  // 📁 SELECTED MONTH DRILLDOWN VIEW
                  if (selectedTeacherMonth) {
                    const monthData = monthGroups[selectedTeacherMonth.key];
                    const weekKeys = monthData ? Object.keys(monthData.weeks).sort((a, b) => b.localeCompare(a)) : [];

                    return (
                      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                          <button
                            type="button"
                            onClick={() => setSelectedTeacherMonth(null)}
                            style={{
                              background: "#ffffff",
                              border: "1px solid #cbd5e1",
                              borderRadius: "100px",
                              padding: "4px 12px",
                              fontSize: "0.72rem",
                              fontWeight: 800,
                              color: "#475569",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px"
                            }}
                            className="hover-scale"
                          >
                            <ArrowLeft size={12} /> Zurück zur Übersicht
                          </button>
                          <span style={{ fontSize: "0.78rem", fontWeight: 900, color: "#15803d" }}>
                            📁 {selectedTeacherMonth.label}
                          </span>
                        </div>

                        {weekKeys.map(wkKey => {
                          const wkAudios = monthData.weeks[wkKey] || [];
                          const isExpanded = expandedTeacherAudioWeeks[wkKey] !== undefined ? expandedTeacherAudioWeeks[wkKey] : true;
                          const wkNum = wkKey.split("-W")[1] || "";

                          return (
                            <div key={`teacher-month-week-${wkKey}`} style={{ display: "flex", flexDirection: "column" }}>
                              <div
                                onClick={() => toggleTeacherAudioWeek(wkKey, true)}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  padding: "8px 12px",
                                  background: "#ffffff",
                                  borderRadius: "12px",
                                  border: "1px solid #e2e8f0",
                                  cursor: "pointer",
                                  marginBottom: "8px",
                                  boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
                                  userSelect: "none"
                                }}
                                className="hover-scale"
                              >
                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                  <span style={{ fontSize: "0.74rem", color: "#64748b", transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.15s ease" }}>▶</span>
                                  <span style={{ fontSize: "0.78rem", fontWeight: 850, color: "#334155" }}>KW {wkNum}</span>
                                </div>
                                <span style={{ fontSize: "0.66rem", fontWeight: 800, background: "#f1f5f9", color: "#64748b", padding: "2px 8px", borderRadius: "100px" }}>
                                  {wkAudios.length} {wkAudios.length === 1 ? "Aufnahme" : "Aufnahmen"}
                                </span>
                              </div>

                              {isExpanded && (
                                <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "8px" }}>
                                  {wkAudios.map((aud, idx) => (
                                    <InlineAudioPlayer 
                                      key={`teacher-month-aud-${wkKey}-${idx}`}
                                      url={aud.url} 
                                      label={aud.label} 
                                      duration={aud.duration}
                                      date={aud.date}
                                      isFavorite={favoriteAudioUrls.includes(aud.url)}
                                      onToggleFavorite={() => toggleFavoriteAudio(aud.url)}
                                      themeColor="#15803d"
                                      themeBg="#e6f4ea"
                                      badge="👨‍🏫 Lehrkraft"
                                      badgeBg="#dcfce7"
                                      badgeColor="#15803d"
                                      onDelete={!readOnly ? () => handleDeleteNote(aud.originalIdx) : undefined}
                                    />
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  }

                  // 🏠 DEFAULT VIEW: Top Hero (Diese Woche) + Square Album Grid (Monate & Favoriten)
                  return (
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                      {/* 1. TOP HERO: Diese Woche (KW x) */}
                      <div style={{
                        background: "#ffffff",
                        borderRadius: "18px",
                        border: "1.5px solid #bbf7d0",
                        padding: "12px 14px",
                        boxShadow: "0 4px 14px rgba(34, 197, 94, 0.08)",
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px"
                      }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#16a34a", display: "inline-block" }} />
                            <span style={{ fontSize: "0.82rem", fontWeight: 900, color: "#15803d" }}>Diese Woche (KW {currentWeekNum})</span>
                          </div>
                          <span style={{ fontSize: "0.68rem", fontWeight: 800, background: "#dcfce7", color: "#15803d", padding: "2px 8px", borderRadius: "100px" }}>
                            {currentWeekAudios.length} {currentWeekAudios.length === 1 ? "Aufnahme" : "Aufnahmen"}
                          </span>
                        </div>

                        {currentWeekAudios.length === 0 ? (
                          <div style={{ padding: "14px", textAlign: "center", color: "#94a3b8", fontSize: "0.76rem", fontWeight: 700, background: "#f8fafc", borderRadius: "12px" }}>
                            Noch keine Aufnahmen in dieser Woche vorhanden
                          </div>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                            {currentWeekAudios.map((aud, idx) => (
                              <InlineAudioPlayer 
                                key={`teacher-curr-aud-${idx}`}
                                url={aud.url} 
                                label={aud.label} 
                                duration={aud.duration}
                                date={aud.date}
                                isFavorite={favoriteAudioUrls.includes(aud.url)}
                                onToggleFavorite={() => toggleFavoriteAudio(aud.url)}
                                themeColor="#15803d"
                                themeBg="#e6f4ea"
                                badge="👨‍🏫 Lehrkraft"
                                badgeBg="#dcfce7"
                                badgeColor="#15803d"
                                onDelete={!readOnly ? () => handleDeleteNote(aud.originalIdx) : undefined}
                              />
                            ))}
                          </div>
                        )}
                      </div>

                      {/* 2. VISUAL SQUARE ALBUM COVERS (6er-Reihe: Favoriten + Monate) */}
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <span style={{ fontSize: "0.70rem", fontWeight: 900, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                            Monats-Alben & Archiv
                          </span>
                          <span style={{ fontSize: "0.66rem", color: "#94a3b8", fontWeight: 700 }}>
                            {sortedMonths.length} {sortedMonths.length === 1 ? "Monat" : "Monate"}
                          </span>
                        </div>

                        <div style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(6, 1fr)",
                          gap: "8px"
                        }}>
                          {/* ⭐ Radiant Apple Liquid Gold & Spotify Starburst Favoriten Cover Card */}
                          <div
                            onClick={() => setShowTeacherFavoritesOnly(true)}
                            style={{
                              aspectRatio: "1 / 1",
                              background: "linear-gradient(135deg, #f59e0b 0%, #d97706 60%, #b45309 100%)",
                              borderRadius: "14px",
                              border: "1px solid rgba(255, 255, 255, 0.4)",
                              padding: "8px 4px",
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              justifyContent: "space-between",
                              cursor: "pointer",
                              boxShadow: "0 6px 18px -2px rgba(217, 119, 6, 0.35), 0 2px 6px rgba(0,0,0,0.06)",
                              position: "relative",
                              overflow: "hidden",
                              transition: "all 0.18s cubic-bezier(0.16, 1, 0.3, 1)",
                              textAlign: "center"
                            }}
                            className="hover-scale"
                          >
                            {/* Specular Highlight Sheen */}
                            <div style={{
                              position: "absolute",
                              top: 0,
                              left: 0,
                              right: 0,
                              height: "50%",
                              background: "linear-gradient(180deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0) 100%)",
                              pointerEvents: "none"
                            }} />

                            {/* Luminous Floating Glass Capsule with White Star */}
                            <div style={{
                              width: "28px",
                              height: "28px",
                              borderRadius: "9px",
                              background: "rgba(255, 255, 255, 0.22)",
                              backdropFilter: "blur(8px)",
                              WebkitBackdropFilter: "blur(8px)",
                              border: "1px solid rgba(255, 255, 255, 0.65)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15), inset 0 1px 1px rgba(255, 255, 255, 0.8)",
                              marginTop: "2px",
                              color: "#ffffff"
                            }}>
                              <Star size={14} fill="#ffffff" color="#ffffff" strokeWidth={0} />
                            </div>

                            {/* Typography */}
                            <div style={{ width: "100%", position: "relative", zIndex: 1 }}>
                              <div style={{
                                fontSize: "0.64rem",
                                fontWeight: 900,
                                color: "#ffffff",
                                letterSpacing: "-0.01em",
                                lineHeight: 1.1,
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                textShadow: "0 1px 3px rgba(0,0,0,0.25)"
                              }}>
                                Favoriten
                              </div>
                              <div style={{
                                display: "inline-block",
                                background: "rgba(0, 0, 0, 0.18)",
                                backdropFilter: "blur(4px)",
                                WebkitBackdropFilter: "blur(4px)",
                                padding: "1px 6px",
                                borderRadius: "999px",
                                fontSize: "0.52rem",
                                fontWeight: 800,
                                color: "#fef3c7",
                                marginTop: "2px",
                                border: "1px solid rgba(255, 255, 255, 0.2)"
                              }}>
                                {favoriteTeacherAudios.length} {favoriteTeacherAudios.length === 1 ? "Take" : "Takes"}
                              </div>
                            </div>
                          </div>

                          {/* 📅 Monthly Album Cover Cards (Kompakte Apple-Mini-Covers) */}
                          {sortedMonths.map(m => {
                            const dParts = m.monthKey.split("-");
                            const dObj = new Date(parseInt(dParts[0], 10), parseInt(dParts[1], 10) - 1, 1);
                            const shortLabel = dObj.toLocaleDateString("de-DE", { month: "short" }) + " " + String(dObj.getFullYear()).slice(2);
                            return (
                              <div
                                key={`teacher-month-card-${m.monthKey}`}
                                onClick={() => setSelectedTeacherMonth({ key: m.monthKey, label: m.monthLabel })}
                                style={{
                                  aspectRatio: "1 / 1",
                                  background: "linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)",
                                  borderRadius: "14px",
                                  border: "1.5px solid #e2e8f0",
                                  padding: "8px 4px",
                                  display: "flex",
                                  flexDirection: "column",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  cursor: "pointer",
                                  boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
                                  transition: "all 0.18s cubic-bezier(0.16, 1, 0.3, 1)",
                                  textAlign: "center"
                                }}
                                className="hover-scale"
                              >
                                <div style={{
                                  width: "28px",
                                  height: "28px",
                                  borderRadius: "9px",
                                  background: "#f0fdf4",
                                  color: "#16a34a",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  border: "1px solid #dcfce7",
                                  marginTop: "2px"
                                }}>
                                  <Calendar size={13} strokeWidth={2.4} />
                                </div>
                                <div style={{ width: "100%" }}>
                                  <div style={{ fontSize: "0.64rem", fontWeight: 900, color: "#1e293b", letterSpacing: "-0.01em", lineHeight: 1.1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                    {shortLabel}
                                  </div>
                                  <div style={{ fontSize: "0.56rem", fontWeight: 750, color: "#64748b", marginTop: "1px" }}>
                                    {m.totalTakes} {m.totalTakes === 1 ? "Take" : "Takes"}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* ========================================================================= */}
              {/* RIGHT PAGE: ⭐ EIGENE AUFNAHMEN (SCHÜLER - Private Audio-Sandbox)          */}
              {/* ========================================================================= */}
              <div style={{
                flex: '1 1 0%',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                background: useNotebookLayout ? 'white' : '#f8fafc',
                backgroundImage: useNotebookLayout ? 'repeating-linear-gradient(white, white 27px, #e5e0d4 27px, #e5e0d4 28px)' : 'none',
                borderLeft: useNotebookLayout ? 'none' : '1px solid #e4e4e7',
                borderRadius: useNotebookLayout ? '0 0 20px 0' : '0',
                boxShadow: useNotebookLayout ? '10px 10px 20px rgba(0,0,0,0.15)' : 'none',
                position: 'relative',
                padding: '24px'
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

                {/* Header: Student Own Recordings */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '14px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '11px',
                      background: 'linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%)',
                      color: '#6d28d9',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 2px 6px rgba(109, 40, 217, 0.12)',
                      flexShrink: 0
                    }}>
                      <Star size={16} strokeWidth={2.4} fill="#6d28d9" />
                    </div>
                    <div>
                      <span style={{ fontSize: '0.64rem', fontWeight: 900, color: '#6d28d9', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        {isTeacherMode ? 'Schüler-Studio' : 'Dein Übe-Studio'}
                      </span>
                      <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                        {isTeacherMode ? `Freigegebene Aufnahmen von ${studentFirstName}` : 'Deine eigenen Aufnahmen'}
                      </h3>
                    </div>
                  </div>

                  {/* Compact Apple Privacy Badge directly inline beside the title */}
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '4px 10px',
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '100px',
                    fontSize: '0.68rem',
                    color: '#64748b',
                    fontWeight: 650,
                    boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                  }}>
                    <Lock size={12} color="#6366f1" style={{ flexShrink: 0 }} />
                    <span>
                      {isTeacherMode
                        ? `Nur für Lehrkraft freigegeben`
                        : <>Standardmäßig privat & nur für dich sichtbar</>}
                    </span>
                  </div>
                </div>

                {/* Kid-Friendly Studio Recording Tool (for students) */}
                {!isTeacherMode && (
                  <div style={{
                    margin: '0 0 16px 0',
                    padding: '14px 16px',
                    background: '#ffffff',
                    borderRadius: '18px',
                    border: '1.5px solid #e0e7ff',
                    boxShadow: '0 4px 16px rgba(99, 102, 241, 0.05)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}>
                    {(() => {
                      let studentRecordingsTotalSec = 0;
                      try {
                        if (student?.id) {
                          const stored = localStorage.getItem(`campus_junior_recordings_${student.id}`);
                          if (stored) {
                            const recs = JSON.parse(stored);
                            studentRecordingsTotalSec = recs.reduce((acc: number, r: any) => acc + (parseInt(r.duration, 10) || 0), 0);
                          }
                        }
                      } catch {}

                      const schoolObj = (student as any)?.schools || (student as any)?.school;
                      let overridesData: any = {};
                      try {
                        const overridesStr = localStorage.getItem('groovelab_school_overrides') || '{}';
                        const allOverrides = JSON.parse(overridesStr);
                        const sId = student?.school_id || schoolObj?.id;
                        if (sId && allOverrides[sId]) overridesData = allOverrides[sId];
                      } catch (e) {}

                      const activeAddonGb = Number(overridesData.storage_addon_gb ?? schoolObj?.storage_addon_gb ?? 0);
                      const totalCapGb = 1.0 + activeAddonGb;
                      const usedBytes = Number(overridesData.storage_used_bytes ?? schoolObj?.storage_used_bytes ?? 0);
                      const usedGb = usedBytes / (1024 * 1024 * 1024);
                      const isStorageOverCap = hasTresorStorage && activeAddonGb > 0 && usedGb >= totalCapGb;

                      const monthlyLimit = 240;
                      const effectiveTresorAvailable = hasTresorStorage && !isStorageOverCap;
                      const isLimitReached = !effectiveTresorAvailable && studentRecordingsTotalSec >= monthlyLimit;

                      const isAudioAllowed = (student as any)?.parent_allow_audio !== false && 
                        (typeof window !== 'undefined' ? localStorage.getItem('campus_board_override_recordings') !== 'false' && localStorage.getItem('campus_allow_audio') !== 'false' : true);

                      if (!isAudioAllowed) {
                        return (
                          <div style={{
                            padding: '14px 16px',
                            background: '#f8fafc',
                            border: '1.5px dashed #cbd5e1',
                            borderRadius: '16px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            textAlign: 'left'
                          }}>
                            <div style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '10px',
                              background: '#f1f5f9',
                              color: '#64748b',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}>
                              <Lock size={18} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <div style={{ fontSize: '0.82rem', fontWeight: 850, color: '#475569' }}>
                                Eigene Aufnahmen im Elternbereich pausiert
                              </div>
                              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 550, lineHeight: 1.35 }}>
                                Aufnahmen deiner Lehrkraft auf der linken Seite kannst du weiterhin jederzeit anhören. Eigene Mikrofonaufnahmen können im Eltern-Kontrollzentrum aktiviert werden.
                              </div>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.80rem', fontWeight: 900, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span>🎙️ Selbstaufnahme {effectiveTresorAvailable ? '(max. 7 Min.)' : '(max. 60s)'}</span>
                            </span>
                            {effectiveTresorAvailable ? (
                              <span style={{ fontSize: '0.70rem', color: '#15803d', fontWeight: 850, background: '#dcfce7', padding: '2px 8px', borderRadius: '100px' }}>
                                ✨ Unbegrenzt (Audio-Tresor)
                              </span>
                            ) : (
                              <span style={{ fontSize: '0.70rem', color: isLimitReached ? '#dc2626' : '#6366f1', fontWeight: 800, background: isLimitReached ? '#fee2e2' : '#eef2ff', padding: '2px 8px', borderRadius: '100px' }}>
                                ⏱️ {studentRecordingsTotalSec}s / {monthlyLimit}s verbraucht {isStorageOverCap ? '(Cloud voll)' : ''}
                              </span>
                            )}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                            {!isRecordingAudio && !isLimitReached && (
                              <input
                                type="text"
                                placeholder="Name deiner Aufnahme (z. B. Mein Gitarren-Hit)..."
                                value={audioLabel}
                                onChange={(e) => setAudioLabel(e.target.value)}
                                style={{
                                  flex: 1,
                                  minWidth: 0,
                                  fontSize: '0.80rem',
                                  padding: '8px 12px',
                                  borderRadius: '10px',
                                  border: '1.5px solid #cbd5e1',
                                  background: '#f8fafc',
                                  outline: 'none',
                                  boxSizing: 'border-box'
                                }}
                              />
                            )}

                            {!isRecordingAudio ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0, position: 'relative' }}>
                                {/* ⏱️ Metronom / Klick Button */}
                                <button
                                  type="button"
                                  onClick={() => setShowRecordingMetronomePopup(prev => !prev)}
                                  style={{
                                    background: isRecordingMetronomeActive ? '#dcfce7' : '#f8fafc',
                                    border: isRecordingMetronomeActive ? '1.5px solid #16a34a' : '1.5px solid #cbd5e1',
                                    color: isRecordingMetronomeActive ? '#15803d' : '#64748b',
                                    borderRadius: '12px',
                                    width: '36px',
                                    height: '36px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    flexShrink: 0,
                                    boxShadow: isRecordingMetronomeActive ? '0 2px 8px rgba(22, 163, 74, 0.25)' : 'none',
                                    transition: 'all 0.15s ease',
                                    position: 'relative'
                                  }}
                                  className="hover-scale-mini"
                                  title={isRecordingMetronomeActive ? `Klick aktiv (${recordingBpm} BPM)` : 'Klick / Metronom einstellen'}
                                >
                                  <MechanicalMetronomeIcon size={18} color={isRecordingMetronomeActive ? "#15803d" : "#64748b"} strokeWidth={isRecordingMetronomeActive ? 2.4 : 2} />
                                </button>

                                {/* Metronome Flyout Popup */}
                                {showRecordingMetronomePopup && (
                                  <div style={{
                                    position: 'absolute',
                                    bottom: '100%',
                                    right: 0,
                                    marginBottom: '10px',
                                    background: '#ffffff',
                                    borderRadius: '16px',
                                    border: '1.5px solid #e2e8f0',
                                    boxShadow: '0 12px 30px rgba(0, 0, 0, 0.15), 0 2px 6px rgba(0,0,0,0.05)',
                                    padding: '12px 14px',
                                    width: '240px',
                                    zIndex: 100,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '10px'
                                  }}>
                                    {/* Header */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <span style={{ fontSize: '0.80rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                        <MechanicalMetronomeIcon size={16} color="#16a34a" strokeWidth={2.2} />
                                        <span>Klick / Metronom</span>
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => setShowRecordingMetronomePopup(false)}
                                        style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '2px' }}
                                      >
                                        <X size={14} />
                                      </button>
                                    </div>

                                    {/* Toggle Button */}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const next = !isRecordingMetronomeActive;
                                        setIsRecordingMetronomeActive(next);
                                        if (next) playMetronomeTick(true);
                                      }}
                                      style={{
                                        width: '100%',
                                        background: isRecordingMetronomeActive ? '#16a34a' : '#f1f5f9',
                                        color: isRecordingMetronomeActive ? '#ffffff' : '#475569',
                                        border: 'none',
                                        borderRadius: '10px',
                                        padding: '7px 10px',
                                        fontSize: '0.76rem',
                                        fontWeight: 850,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '6px',
                                        transition: 'all 0.15s ease'
                                      }}
                                    >
                                      <Check size={14} style={{ opacity: isRecordingMetronomeActive ? 1 : 0 }} />
                                      <span>{isRecordingMetronomeActive ? 'Klick bei Aufnahme aktiv' : 'Klick einschalten'}</span>
                                    </button>

                                    {/* BPM Stepper & Slider */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <button
                                          type="button"
                                          onClick={() => setRecordingBpm(p => Math.max(40, p - 5))}
                                          style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '3px 8px', fontSize: '0.72rem', fontWeight: 800, cursor: 'pointer' }}
                                        >
                                          -5
                                        </button>
                                        <span style={{ fontSize: '0.92rem', fontWeight: 900, color: '#0f172a' }}>
                                          {recordingBpm} <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 700 }}>BPM</span>
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => setRecordingBpm(p => Math.min(240, p + 5))}
                                          style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '3px 8px', fontSize: '0.72rem', fontWeight: 800, cursor: 'pointer' }}
                                        >
                                          +5
                                        </button>
                                      </div>

                                      <input
                                        type="range"
                                        min="40"
                                        max="240"
                                        value={recordingBpm}
                                        onChange={(e) => setRecordingBpm(Number(e.target.value))}
                                        style={{ width: '100%', accentColor: '#16a34a', cursor: 'pointer' }}
                                      />
                                    </div>

                                    {/* Test Click / Beep */}
                                    <button
                                      type="button"
                                      onClick={() => playMetronomeTick(true)}
                                      style={{
                                        background: '#f8fafc',
                                        border: '1px dashed #cbd5e1',
                                        color: '#64748b',
                                        borderRadius: '8px',
                                        padding: '5px',
                                        fontSize: '0.68rem',
                                        fontWeight: 750,
                                        cursor: 'pointer'
                                      }}
                                    >
                                      🔊 Klick kurz testen
                                    </button>
                                  </div>
                                )}

                                <button
                                  type="button"
                                  onClick={startRecordingAudio}
                                  disabled={isUploadingAudio || isLimitReached}
                                  style={{
                                    background: isLimitReached ? '#cbd5e1' : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                                    color: '#fff',
                                    border: 'none',
                                    padding: '8px 16px',
                                    borderRadius: '12px',
                                    fontSize: '0.80rem',
                                    fontWeight: 900,
                                    cursor: isLimitReached ? 'not-allowed' : 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px',
                                    boxShadow: isLimitReached ? 'none' : '0 3px 10px rgba(99, 102, 241, 0.25)',
                                    whiteSpace: 'nowrap',
                                    height: '36px',
                                    boxSizing: 'border-box'
                                  }}
                                  className={isLimitReached ? '' : 'hover-scale'}
                                >
                                  <Mic size={15} strokeWidth={2.4} />
                                  <span>Aufnahme starten</span>
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => stopRecordingAudio()}
                                style={{
                                  width: '100%',
                                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                                  color: '#fff',
                                  border: 'none',
                                  padding: '10px 16px',
                                  borderRadius: '12px',
                                  fontSize: '0.84rem',
                                  fontWeight: 900,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '8px',
                                  boxShadow: '0 3px 10px rgba(239, 68, 68, 0.3)',
                                  animation: 'pulse 1.5s infinite'
                                }}
                                className="hover-scale"
                              >
                                <span style={{ width: '8px', height: '8px', background: '#ffffff', borderRadius: '2px', display: 'inline-block' }} />
                                <span>Aufnahme beenden ({hasTresorStorage ? `${formatRecordTime(audioDuration)} / 7:00 Min.` : `${audioDuration}s / 60s`})</span>
                              </button>
                            )}
                          </div>

                          {isUploadingAudio && (
                            <div style={{ fontSize: '0.74rem', color: '#4f46e5', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 750 }}>
                              <span>⏳</span> Deine Aufnahme wird gespeichert...
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                )}

                {/* Student Recordings Gallery with Weekly Accordions */}
                {(() => {
                  const studentAudios: any[] = [];
                  const seenStudentUrls = new Set<string>();

                  // 1. Load from local student recordings vault
                  try {
                    if (student?.id) {
                      const juniorKey = `campus_junior_recordings_${student.id}`;
                      const stored = localStorage.getItem(juniorKey);
                      if (stored) {
                        const parsed = JSON.parse(stored);
                        if (Array.isArray(parsed)) {
                          parsed.forEach((rec: any, idx: number) => {
                            if (rec.url && !seenStudentUrls.has(rec.url)) {
                              seenStudentUrls.add(rec.url);
                              studentAudios.push({
                                id: rec.id || `stud-${idx}`,
                                url: rec.url,
                                duration: parseInt(rec.duration || '0', 10),
                                date: rec.date || new Date().toISOString(),
                                label: rec.title || rec.label || `Eigene Aufnahme #${studentAudios.length + 1}`,
                                visibility: rec.visibility || 'private',
                                originalIdx: -1,
                                source: 'local_junior'
                              });
                            }
                          });
                        }
                      }
                    }
                  } catch {}

                  // If teacher is viewing, only show student recordings that are shared
                  if (isTeacherMode) {
                    const sharedAudios = studentAudios.filter(aud => aud.visibility === 'shared_with_teacher');

                    if (sharedAudios.length === 0) {
                      return (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', padding: '40px 20px', gap: '12px', textAlign: 'center' }}>
                          <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                            <Lock size={20} />
                          </div>
                          <div>
                            <p style={{ fontWeight: 800, fontSize: '0.86rem', color: '#334155', margin: '0 0 4px' }}>Keine freigegebenen Aufnahmen von ${studentFirstName}</p>
                            <p style={{ fontSize: '0.74rem', color: '#64748b', margin: 0, maxWidth: '280px', lineHeight: 1.45 }}>
                              ${studentFirstName} nutzt diesen Bereich zum ungestörten, privaten Ausprobieren. Sobald eine Übe-Aufnahme für dich freigegeben wird, erscheint sie hier.
                            </p>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {sharedAudios.map((aud, idx) => (
                          <InlineAudioPlayer 
                            key={`shared-aud-${idx}`}
                            url={aud.url} 
                            label={aud.label} 
                            duration={aud.duration}
                            date={aud.date}
                            themeColor="#16a34a"
                            themeBg="#dcfce7"
                            badge="🎓 Lehrer"
                            badgeTitle="Vom Schüler für die Lehrkraft freigegeben"
                            badgeBg="#dcfce7"
                            badgeColor="#15803d"
                          />
                        ))}
                      </div>
                    );
                  }

                  // Student view: show all student audios
                  if (studentAudios.length === 0) {
                    return (
                      <div style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#94a3b8",
                        padding: "40px 20px",
                        gap: "12px",
                        textAlign: "center",
                        background: "#ffffff",
                        borderRadius: "20px",
                        border: "1.5px dashed #e2e8f0"
                      }}>
                        <div style={{
                          width: "48px",
                          height: "48px",
                          borderRadius: "50%",
                          background: "#f5f3ff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#6366f1"
                        }}>
                          <Star size={22} />
                        </div>
                        <div>
                          <h4 style={{ margin: "0 0 4px 0", fontSize: "0.92rem", fontWeight: 900, color: "#1e293b" }}>
                            Noch keine eigenen Aufnahmen
                          </h4>
                          <p style={{ margin: 0, fontSize: "0.78rem", color: "#64748b", fontWeight: 600, maxWidth: "260px", lineHeight: 1.45 }}>
                            Nimm dein Üben auf, höre dir selbst zu und sammle deine besten Takes in deinem Übe-Studio!
                          </p>
                        </div>
                      </div>
                    );
                  }

                  const now = getSimulatedNow();
                  const currentWeekStr = getISOWeek(now);
                  const currentWeekNum = currentWeekStr.split("-W")[1] || "";

                  // Filter by Search Query if active
                  const isSearching = recordingSearchQuery.trim() !== "";
                  const searchResults = isSearching ? studentAudios.filter(aud => {
                    const q = recordingSearchQuery.toLowerCase().trim();
                    return (aud.label || "").toLowerCase().includes(q) || (aud.date || "").toLowerCase().includes(q);
                  }) : [];

                  // Current Week Audios
                  const currentWeekAudios = studentAudios.filter(aud => {
                    const d = aud.date ? new Date(aud.date) : now;
                    return getISOWeek(isNaN(d.getTime()) ? now : d) === currentWeekStr;
                  });

                  // Favorite Audios
                  const favoriteStudentAudios = studentAudios.filter(aud => favoriteAudioUrls.includes(aud.url));

                  // Group Past Audios into Month Albums
                  const pastAudios = studentAudios.filter(aud => {
                    const d = aud.date ? new Date(aud.date) : now;
                    return getISOWeek(isNaN(d.getTime()) ? now : d) !== currentWeekStr;
                  });

                  const monthGroups: { [monthKey: string]: { monthKey: string; monthLabel: string; weeks: { [weekKey: string]: any[] }; totalTakes: number } } = {};
                  pastAudios.forEach(aud => {
                    const d = aud.date ? new Date(aud.date) : now;
                    const dateObj = isNaN(d.getTime()) ? now : d;
                    const monthKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}`;
                    const monthLabel = dateObj.toLocaleDateString("de-DE", { month: "long", year: "numeric" });
                    const weekKey = getISOWeek(dateObj);

                    if (!monthGroups[monthKey]) {
                      monthGroups[monthKey] = { monthKey, monthLabel, weeks: {}, totalTakes: 0 };
                    }
                    if (!monthGroups[monthKey].weeks[weekKey]) {
                      monthGroups[monthKey].weeks[weekKey] = [];
                    }
                    monthGroups[monthKey].weeks[weekKey].push(aud);
                    monthGroups[monthKey].totalTakes += 1;
                  });

                  const sortedMonths = Object.values(monthGroups).sort((a, b) => b.monthKey.localeCompare(a.monthKey));

                  const renderStudentPlayer = (aud: any, idxKey: string) => {
                    const isShared = aud.visibility === "shared_with_teacher";
                    return (
                      <InlineAudioPlayer 
                        key={idxKey}
                        url={aud.url} 
                        label={aud.label} 
                        duration={aud.duration}
                        date={aud.date}
                        isFavorite={favoriteAudioUrls.includes(aud.url)}
                        onToggleFavorite={() => toggleFavoriteAudio(aud.url)}
                        themeColor={isShared ? "#16a34a" : "#6366f1"}
                        themeBg={isShared ? "#dcfce7" : "#ede9fe"}
                        badge={isShared ? "🎓 Lehrer" : "🔒 Privat"}
                        badgeTitle={isShared ? "Für Lehrkraft freigegeben (Klicken zum Umschalten)" : "Privat (Klicken zum Umschalten)"}
                        badgeBg={isShared ? "#dcfce7" : "#ede9fe"}
                        badgeColor={isShared ? "#15803d" : "#6d28d9"}
                        onBadgeClick={!isTeacherMode ? () => {
                          if (student?.id) {
                            try {
                              const juniorKey = `campus_junior_recordings_${student.id}`;
                              const stored = localStorage.getItem(juniorKey);
                              if (stored) {
                                const recs = JSON.parse(stored).map((r: any) => {
                                  if (r.url === aud.url || r.id === aud.id) {
                                    return { ...r, visibility: isShared ? "private" : "shared_with_teacher" };
                                  }
                                  return r;
                                });
                                localStorage.setItem(juniorKey, JSON.stringify(recs));
                                setLocalJuniorRecordingsTrigger(p => p + 1);
                              }
                            } catch {}
                          }
                        } : undefined}
                        onDelete={!isTeacherMode ? () => {
                          if (student?.id) {
                            try {
                              const juniorKey = `campus_junior_recordings_${student.id}`;
                              const stored = localStorage.getItem(juniorKey);
                              if (stored) {
                                const recs = JSON.parse(stored).filter((r: any) => r.url !== aud.url && r.id !== aud.id);
                                localStorage.setItem(juniorKey, JSON.stringify(recs));
                                setLocalJuniorRecordingsTrigger(p => p + 1);
                              }
                            } catch {}
                          }
                        } : undefined}
                        onSaveEdited={(res) => {
                          if (student?.id) {
                            try {
                              const juniorKey = `campus_junior_recordings_${student.id}`;
                              const stored = localStorage.getItem(juniorKey);
                              let recs = stored ? JSON.parse(stored) : [];
                              if (res.mode === "overwrite") {
                                recs = recs.map((r: any) => {
                                  if (r.url === aud.url || r.id === aud.id) {
                                    return { ...r, url: res.url, duration: res.duration, label: res.label, title: res.label };
                                  }
                                  return r;
                                });
                              } else {
                                const newRecord = {
                                  id: `stud-${Date.now()}`,
                                  url: res.url,
                                  duration: res.duration,
                                  date: new Date().toISOString(),
                                  title: res.label,
                                  label: res.label,
                                  visibility: aud.visibility || "private"
                                };
                                recs = [newRecord, ...recs];
                              }
                              localStorage.setItem(juniorKey, JSON.stringify(recs));
                              setLocalJuniorRecordingsTrigger(p => p + 1);
                            } catch {}
                          }
                        }}
                      />
                    );
                  };

                  // 🔍 SEARCH RESULTS VIEW
                  if (isSearching) {
                    return (
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        <div style={{ fontSize: "0.76rem", fontWeight: 850, color: "#6d28d9", marginBottom: "4px" }}>
                          🔍 {searchResults.length} {searchResults.length === 1 ? "Treffer" : "Treffer"} zur Suche „{recordingSearchQuery}“
                        </div>
                        {searchResults.map((aud, idx) => renderStudentPlayer(aud, `stud-search-${idx}`))}
                      </div>
                    );
                  }

                  // ⭐ FAVORITES DRILLDOWN VIEW
                  if (showStudentFavoritesOnly) {
                    return (
                      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                          <button
                            type="button"
                            onClick={() => setShowStudentFavoritesOnly(false)}
                            style={{
                              background: "#ffffff",
                              border: "1px solid #cbd5e1",
                              borderRadius: "100px",
                              padding: "4px 12px",
                              fontSize: "0.72rem",
                              fontWeight: 800,
                              color: "#475569",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px"
                            }}
                            className="hover-scale"
                          >
                            <ArrowLeft size={12} /> Zurück zur Übersicht
                          </button>
                          <span style={{ fontSize: "0.76rem", fontWeight: 900, color: "#ca8a04" }}>
                            ⭐ {favoriteStudentAudios.length} Favoriten
                          </span>
                        </div>

                        {favoriteStudentAudios.length === 0 ? (
                          <div style={{ textAlign: "center", padding: "30px 16px", color: "#94a3b8", fontSize: "0.80rem", fontWeight: 700 }}>
                            Noch keine Favoriten markiert. Klicke bei einem deiner Takes auf das Stern-Symbol ⭐!
                          </div>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                            {favoriteStudentAudios.map((aud, idx) => renderStudentPlayer(aud, `stud-fav-${idx}`))}
                          </div>
                        )}
                      </div>
                    );
                  }

                  // 📁 SELECTED MONTH DRILLDOWN VIEW
                  if (selectedStudentMonth) {
                    const monthData = monthGroups[selectedStudentMonth.key];
                    const weekKeys = monthData ? Object.keys(monthData.weeks).sort((a, b) => b.localeCompare(a)) : [];

                    return (
                      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                          <button
                            type="button"
                            onClick={() => setSelectedStudentMonth(null)}
                            style={{
                              background: "#ffffff",
                              border: "1px solid #cbd5e1",
                              borderRadius: "100px",
                              padding: "4px 12px",
                              fontSize: "0.72rem",
                              fontWeight: 800,
                              color: "#475569",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px"
                            }}
                            className="hover-scale"
                          >
                            <ArrowLeft size={12} /> Zurück zur Übersicht
                          </button>
                          <span style={{ fontSize: "0.78rem", fontWeight: 900, color: "#6d28d9" }}>
                            📁 {selectedStudentMonth.label}
                          </span>
                        </div>

                        {weekKeys.map(wkKey => {
                          const wkAudios = monthData.weeks[wkKey] || [];
                          const isExpanded = expandedStudentAudioWeeks[wkKey] !== undefined ? expandedStudentAudioWeeks[wkKey] : true;
                          const wkNum = wkKey.split("-W")[1] || "";

                          return (
                            <div key={`stud-month-week-${wkKey}`} style={{ display: "flex", flexDirection: "column" }}>
                              <div
                                onClick={() => toggleStudentAudioWeek(wkKey, true)}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  padding: "8px 12px",
                                  background: "#ffffff",
                                  borderRadius: "12px",
                                  border: "1px solid #e2e8f0",
                                  cursor: "pointer",
                                  marginBottom: "8px",
                                  boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
                                  userSelect: "none"
                                }}
                                className="hover-scale"
                              >
                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                  <span style={{ fontSize: "0.74rem", color: "#64748b", transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.15s ease" }}>▶</span>
                                  <span style={{ fontSize: "0.78rem", fontWeight: 850, color: "#334155" }}>KW {wkNum}</span>
                                </div>
                                <span style={{ fontSize: "0.66rem", fontWeight: 800, background: "#f1f5f9", color: "#64748b", padding: "2px 8px", borderRadius: "100px" }}>
                                  {wkAudios.length} {wkAudios.length === 1 ? "Aufnahme" : "Aufnahmen"}
                                </span>
                              </div>

                              {isExpanded && (
                                <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "8px" }}>
                                  {wkAudios.map((aud, idx) => renderStudentPlayer(aud, `stud-month-aud-${wkKey}-${idx}`))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  }

                  // 🏠 DEFAULT VIEW: Top Hero (Diese Woche) + Square Album Grid (6er-Reihe)
                  return (
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                      {/* 1. TOP HERO: Diese Woche (KW x) */}
                      <div style={{
                        background: "#ffffff",
                        borderRadius: "18px",
                        border: "1.5px solid #e9d5ff",
                        padding: "12px 14px",
                        boxShadow: "0 4px 14px rgba(109, 40, 217, 0.08)",
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px"
                      }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#9333ea", display: "inline-block" }} />
                            <span style={{ fontSize: "0.82rem", fontWeight: 900, color: "#6d28d9" }}>Diese Woche (KW {currentWeekNum})</span>
                          </div>
                          <span style={{ fontSize: "0.68rem", fontWeight: 800, background: "#ede9fe", color: "#6d28d9", padding: "2px 8px", borderRadius: "100px" }}>
                            {currentWeekAudios.length} {currentWeekAudios.length === 1 ? "Aufnahme" : "Aufnahmen"}
                          </span>
                        </div>

                        {currentWeekAudios.length === 0 ? (
                          <div style={{ padding: "14px", textAlign: "center", color: "#94a3b8", fontSize: "0.76rem", fontWeight: 700, background: "#faf5ff", borderRadius: "12px" }}>
                            Noch keine eigenen Aufnahmen in dieser Woche
                          </div>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                            {currentWeekAudios.map((aud, idx) => renderStudentPlayer(aud, `stud-curr-aud-${idx}`))}
                          </div>
                        )}
                      </div>

                      {/* 2. VISUAL SQUARE ALBUM COVERS (6er-Reihe: Favoriten + Monate) */}
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <span style={{ fontSize: "0.70rem", fontWeight: 900, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                            Monats-Alben & Archiv
                          </span>
                          <span style={{ fontSize: "0.66rem", color: "#94a3b8", fontWeight: 700 }}>
                            {sortedMonths.length} {sortedMonths.length === 1 ? "Monat" : "Monate"}
                          </span>
                        </div>

                        <div style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(6, 1fr)",
                          gap: "8px"
                        }}>
                          {/* ⭐ Radiant Apple Liquid Gold & Spotify Starburst Favoriten Cover Card */}
                          <div
                            onClick={() => setShowStudentFavoritesOnly(true)}
                            style={{
                              aspectRatio: "1 / 1",
                              background: "linear-gradient(135deg, #f59e0b 0%, #d97706 60%, #b45309 100%)",
                              borderRadius: "14px",
                              border: "1px solid rgba(255, 255, 255, 0.4)",
                              padding: "8px 4px",
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              justifyContent: "space-between",
                              cursor: "pointer",
                              boxShadow: "0 6px 18px -2px rgba(217, 119, 6, 0.35), 0 2px 6px rgba(0,0,0,0.06)",
                              position: "relative",
                              overflow: "hidden",
                              transition: "all 0.18s cubic-bezier(0.16, 1, 0.3, 1)",
                              textAlign: "center"
                            }}
                            className="hover-scale"
                          >
                            {/* Specular Highlight Sheen */}
                            <div style={{
                              position: "absolute",
                              top: 0,
                              left: 0,
                              right: 0,
                              height: "50%",
                              background: "linear-gradient(180deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0) 100%)",
                              pointerEvents: "none"
                            }} />

                            {/* Luminous Floating Glass Capsule with White Star */}
                            <div style={{
                              width: "28px",
                              height: "28px",
                              borderRadius: "9px",
                              background: "rgba(255, 255, 255, 0.22)",
                              backdropFilter: "blur(8px)",
                              WebkitBackdropFilter: "blur(8px)",
                              border: "1px solid rgba(255, 255, 255, 0.65)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15), inset 0 1px 1px rgba(255, 255, 255, 0.8)",
                              marginTop: "2px",
                              color: "#ffffff"
                            }}>
                              <Star size={14} fill="#ffffff" color="#ffffff" strokeWidth={0} />
                            </div>

                            {/* Typography */}
                            <div style={{ width: "100%", position: "relative", zIndex: 1 }}>
                              <div style={{
                                fontSize: "0.64rem",
                                fontWeight: 900,
                                color: "#ffffff",
                                letterSpacing: "-0.01em",
                                lineHeight: 1.1,
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                textShadow: "0 1px 3px rgba(0,0,0,0.25)"
                              }}>
                                Favoriten
                              </div>
                              <div style={{
                                display: "inline-block",
                                background: "rgba(0, 0, 0, 0.18)",
                                backdropFilter: "blur(4px)",
                                WebkitBackdropFilter: "blur(4px)",
                                padding: "1px 6px",
                                borderRadius: "999px",
                                fontSize: "0.52rem",
                                fontWeight: 800,
                                color: "#fef3c7",
                                marginTop: "2px",
                                border: "1px solid rgba(255, 255, 255, 0.2)"
                              }}>
                                {favoriteStudentAudios.length} {favoriteStudentAudios.length === 1 ? "Take" : "Takes"}
                              </div>
                            </div>
                          </div>

                          {/* 📅 Monthly Album Cover Cards (Kompakte Apple-Mini-Covers) */}
                          {sortedMonths.map(m => {
                            const dParts = m.monthKey.split("-");
                            const dObj = new Date(parseInt(dParts[0], 10), parseInt(dParts[1], 10) - 1, 1);
                            const shortLabel = dObj.toLocaleDateString("de-DE", { month: "short" }) + " " + String(dObj.getFullYear()).slice(2);
                            return (
                              <div
                                key={`stud-month-card-${m.monthKey}`}
                                onClick={() => setSelectedStudentMonth({ key: m.monthKey, label: m.monthLabel })}
                                style={{
                                  aspectRatio: "1 / 1",
                                  background: "linear-gradient(145deg, #ffffff 0%, #faf5ff 100%)",
                                  borderRadius: "14px",
                                  border: "1.5px solid #e9d5ff",
                                  padding: "8px 4px",
                                  display: "flex",
                                  flexDirection: "column",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  cursor: "pointer",
                                  boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
                                  transition: "all 0.18s cubic-bezier(0.16, 1, 0.3, 1)",
                                  textAlign: "center"
                                }}
                                className="hover-scale"
                              >
                                <div style={{
                                  width: "28px",
                                  height: "28px",
                                  borderRadius: "9px",
                                  background: "#f5f3ff",
                                  color: "#9333ea",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  border: "1px solid #ede9fe",
                                  marginTop: "2px"
                                }}>
                                  <Calendar size={13} strokeWidth={2.4} />
                                </div>
                                <div style={{ width: "100%" }}>
                                  <div style={{ fontSize: "0.64rem", fontWeight: 900, color: "#1e293b", letterSpacing: "-0.01em", lineHeight: 1.1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                    {shortLabel}
                                  </div>
                                  <div style={{ fontSize: "0.56rem", fontWeight: 750, color: "#64748b", marginTop: "1px" }}>
                                    {m.totalTakes} {m.totalTakes === 1 ? "Take" : "Takes"}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

                {/* 💽 Share to Audio-Biografie Playlist Modal */}
                {shareAudioModal && shareAudioModal.isOpen && (
                  <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(15, 23, 42, 0.55)',
                    backdropFilter: 'blur(8px)',
                    zIndex: 1100,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px'
                  }} onClick={() => !isSharingToPlaylist && setShareAudioModal(null)}>
                    <div style={{
                      background: '#ffffff',
                      borderRadius: '24px',
                      boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.35)',
                      border: '1px solid rgba(0,0,0,0.08)',
                      width: '100%',
                      maxWidth: '480px',
                      display: 'flex',
                      flexDirection: 'column',
                      overflow: 'hidden'
                    }} onClick={(e) => e.stopPropagation()}>
                      
                      {/* Header */}
                      <div style={{
                        padding: '18px 24px',
                        borderBottom: '1px solid #f1f5f9',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: '#fafafa'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '10px',
                            background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 2px 6px rgba(99, 102, 241, 0.3)'
                          }}>
                            <Share2 size={18} />
                          </div>
                          <div>
                            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 900, color: '#0f172a' }}>In Audio-Biografie teilen</h3>
                            <p style={{ margin: 0, fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Track in deiner persönlichen Playlist hinterlegen</p>
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={isSharingToPlaylist}
                          onClick={() => setShareAudioModal(null)}
                          style={{
                            background: '#f1f5f9',
                            border: 'none',
                            borderRadius: '50%',
                            width: '32px',
                            height: '32px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            color: '#64748b'
                          }}
                        >
                          <X size={16} />
                        </button>
                      </div>

                      {/* Body */}
                      <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        
                        {/* Track Title */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <label style={{ fontSize: '0.76rem', fontWeight: 800, color: '#334155' }}>Titel in der Playlist</label>
                          <input
                            type="text"
                            value={shareCustomTitle}
                            onChange={(e) => setShareCustomTitle(e.target.value)}
                            placeholder="z. B. Mein erstes Solo..."
                            style={{
                              width: '100%',
                              padding: '10px 14px',
                              borderRadius: '12px',
                              border: '1.5px solid #e2e8f0',
                              fontSize: '0.85rem',
                              fontWeight: 600,
                              outline: 'none',
                              background: '#f8fafc',
                              boxSizing: 'border-box'
                            }}
                          />
                        </div>

                        {/* Playlist Selection */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <label style={{ fontSize: '0.76rem', fontWeight: 800, color: '#334155' }}>Ziel-Playliste wählen</label>
                            <button
                              type="button"
                              onClick={() => setShowNewPlaylistInput(!showNewPlaylistInput)}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#34a853',
                                fontSize: '0.72rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px'
                              }}
                            >
                              <Plus size={12} /> {showNewPlaylistInput ? 'Aus Liste wählen' : 'Neue Playliste erstellen'}
                            </button>
                          </div>

                          {showNewPlaylistInput ? (
                            <input
                              type="text"
                              value={newPlaylistTitle}
                              onChange={(e) => setNewPlaylistTitle(e.target.value)}
                              placeholder="Name der neuen Playlist (z.B. Akustik-Sessions)..."
                              style={{
                                width: '100%',
                                padding: '10px 14px',
                                borderRadius: '12px',
                                border: '1.5px solid #34a853',
                                fontSize: '0.85rem',
                                fontWeight: 600,
                                outline: 'none',
                                background: '#f0fdf4',
                                boxSizing: 'border-box'
                              }}
                              autoFocus
                            />
                          ) : (
                            <select
                              value={sharePlaylistId}
                              onChange={(e) => setSharePlaylistId(e.target.value)}
                              style={{
                                width: '100%',
                                padding: '10px 14px',
                                borderRadius: '12px',
                                border: '1.5px solid #e2e8f0',
                                fontSize: '0.85rem',
                                fontWeight: 700,
                                outline: 'none',
                                background: '#f8fafc',
                                cursor: 'pointer',
                                boxSizing: 'border-box'
                              }}
                            >
                              {availablePlaylists.map(pl => (
                                <option key={pl.id} value={pl.id}>
                                  {pl.title} ({pl.tracks?.length || 0} Tracks)
                                </option>
                              ))}
                            </select>
                          )}
                        </div>

                        {/* Audio Processing Mode Selection */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <label style={{ fontSize: '0.76rem', fontWeight: 800, color: '#334155' }}>Audio-Processing für die Playlist</label>
                          
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            {/* Pure Raw */}
                            <div
                              onClick={() => setShareProcessing('raw')}
                              style={{
                                padding: '12px',
                                borderRadius: '14px',
                                border: shareProcessing === 'raw' ? '2px solid #34a853' : '1.5px solid #e2e8f0',
                                background: shareProcessing === 'raw' ? '#f0fdf4' : '#ffffff',
                                cursor: 'pointer',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '4px',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 900, color: shareProcessing === 'raw' ? '#16a34a' : '#0f172a' }}>
                                <Mic size={14} />
                                <span>Pure Raw</span>
                              </div>
                              <span style={{ fontSize: '0.68rem', color: '#64748b', lineHeight: 1.3 }}>
                                Unverfälschter Original-Sound wie im Proberaum aufgenommen.
                              </span>
                            </div>

                            {/* Studio Master */}
                            <div
                              onClick={() => setShareProcessing('master')}
                              style={{
                                padding: '12px',
                                borderRadius: '14px',
                                border: shareProcessing === 'master' ? '2px solid #6366f1' : '1.5px solid #e2e8f0',
                                background: shareProcessing === 'master' ? '#f5f3ff' : '#ffffff',
                                cursor: 'pointer',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '4px',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 900, color: shareProcessing === 'master' ? '#6366f1' : '#0f172a' }}>
                                <Sparkles size={14} />
                                <span>Studio Master</span>
                              </div>
                              <span style={{ fontSize: '0.68rem', color: '#64748b', lineHeight: 1.3 }}>
                                High-End Dynamik-EQ, Röhrenwärme & Stereo-Breite (-13 LUFS).
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                          <button
                            type="button"
                            disabled={isSharingToPlaylist}
                            onClick={() => setShareAudioModal(null)}
                            style={{
                              flex: 1,
                              background: '#f1f5f9',
                              color: '#64748b',
                              border: 'none',
                              borderRadius: '12px',
                              padding: '11px',
                              fontSize: '0.82rem',
                              fontWeight: 800,
                              cursor: 'pointer'
                            }}
                          >
                            Abbrechen
                          </button>
                          
                          <button
                            type="button"
                            disabled={isSharingToPlaylist || (showNewPlaylistInput && !newPlaylistTitle.trim())}
                            onClick={handleSaveShareToPlaylist}
                            style={{
                              flex: 2,
                              background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                              color: 'white',
                              border: 'none',
                              borderRadius: '12px',
                              padding: '11px',
                              fontSize: '0.82rem',
                              fontWeight: 900,
                              cursor: isSharingToPlaylist ? 'wait' : 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
                            }}
                          >
                            {isSharingToPlaylist ? (
                              <span>⏳ Verarbeite & Speichere...</span>
                            ) : (
                              <>
                                <Check size={16} />
                                <span>In Playliste speichern</span>
                              </>
                            )}
                          </button>
                        </div>

                      </div>

                    </div>
                  </div>
                )}
              </div>
          ) : activeModalTab === 'document' ? (
            <>
          
          {/* LEFT COLUMN: 🎯 FOKUS-ARBEITSPLATZ (Lehrwerke & Songs) */}

          {/* MOBILE SEGMENTED CONTROL PILL-BAR FOR 2 SWIPE CARDS (Hidden for junior students for max focus) */}
          {isMobileView && !(readOnly && uiLevel === 'junior') && (
            <div style={{
              width: '100%',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '6px 16px',
              background: '#faf8f2',
              borderBottom: '1px solid #e0dad0',
              flexShrink: 0,
              zIndex: 35
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                background: 'rgba(0, 0, 0, 0.06)',
                borderRadius: '100px',
                padding: '3px',
                width: '100%',
                maxWidth: '340px',
                height: '38px',
                boxSizing: 'border-box',
                gap: '3px'
              }}>
                <button
                  type="button"
                  onClick={() => setMobileProtokollTab('repertoire')}
                  style={{
                    flex: 1,
                    height: '32px',
                    borderRadius: '100px',
                    border: 'none',
                    background: mobileProtokollTab === 'repertoire' ? '#ffffff' : 'transparent',
                    color: mobileProtokollTab === 'repertoire' ? '#0f172a' : '#64748b',
                    fontWeight: 800,
                    fontSize: '0.76rem',
                    cursor: 'pointer',
                    boxShadow: mobileProtokollTab === 'repertoire' ? '0 2px 6px rgba(0,0,0,0.12)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '5px',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                  }}
                >
                  <BookOpen size={13} style={{ color: mobileProtokollTab === 'repertoire' ? '#34a853' : '#64748b' }} />
                  <span>Lehrwerke & Songs</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMobileProtokollTab('homework')}
                  style={{
                    flex: 1,
                    height: '32px',
                    borderRadius: '100px',
                    border: 'none',
                    background: mobileProtokollTab === 'homework' ? '#ffffff' : 'transparent',
                    color: mobileProtokollTab === 'homework' ? '#0f172a' : '#64748b',
                    fontWeight: 800,
                    fontSize: '0.76rem',
                    cursor: 'pointer',
                    boxShadow: mobileProtokollTab === 'homework' ? '0 2px 6px rgba(0,0,0,0.12)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '5px',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                  }}
                >
                  <Edit3 size={13} style={{ color: mobileProtokollTab === 'homework' ? '#ea4335' : '#64748b' }} />
                  <span>Hausaufgabe</span>
                </button>
              </div>
            </div>
          )}

          <div style={{
            flex: isMobileView ? 'none' : '1 1 0%',
            height: isMobileView ? 'auto' : '100%',
            minHeight: '0',
            maxHeight: isMobileView ? 'none' : '100%',
            overflowY: isMobileView ? 'visible' : 'auto',
            display: isMobileView ? (mobileProtokollTab === 'repertoire' ? 'flex' : 'none') : 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start',
            gap: '16px',
            background: useNotebookLayout ? '#faf8f2' : '#ffffff',
            borderRadius: '0',
            boxShadow: 'none',
            borderRight: useNotebookLayout ? '1px dashed #e5e0d4' : '1px solid #e8e8ed',
            position: 'relative',
            padding: isMobileView ? '16px 16px calc(280px + env(safe-area-inset-bottom, 40px)) 16px' : '0px',
            boxSizing: 'border-box'
          }}>
            
            {useNotebookLayout && !isMobileView && (
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
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}><BookOpen size={18} style={{ color: '#34a853', verticalAlign: 'middle' }} /> Hausaufgaben-Archiv</span>
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
                            border: isSelected ? '1.5px solid #34a853' : '1px solid #cbd5e1',
                            borderRadius: '16px',
                            padding: isCompact ? '10px 16px' : '16px',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: isCompact ? '0px' : '4px',
                            boxShadow: isSelected ? '0 4px 12px rgba(19, 115, 51, 0.08)' : '0 2px 4px rgba(0,0,0,0.01)'
                          }}
                          className="hover-scale"
                        >
                          {/* Week header row */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '0.86rem', fontWeight: 900, color: isSelected ? '#34a853' : '#0f172a' }}>
                              KW {weekNum}
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {(() => {
                                const fb = getFeedbackForWeek(wk);
                                if (!fb?.status) return null;
                                const badges: Record<string, { bg: string; color: string; label: string }> = {
                                  beherrscht: { bg: '#dcfce7', color: '#16a34a', label: '✓ Beherrscht' },
                                  in_entwicklung: { bg: '#fefce8', color: '#ca8a04', label: '~ In Entwicklung' },
                                  wiederholen: { bg: '#fee2e2', color: '#dc2626', label: '↩ Wiederholen' },
                                };
                                const badge = badges[fb.status];
                                if (!badge) return null;
                                return (
                                  <span style={{ fontSize: '0.62rem', background: badge.bg, color: badge.color, padding: '2px 8px', borderRadius: '10px', fontWeight: 800, flexShrink: 0 }}>
                                    {badge.label}
                                  </span>
                                );
                              })()}
                              <span style={{ fontSize: '0.68rem', background: isSelected ? '#34a853' : '#f1f5f9', color: isSelected ? 'white' : '#4b5563', padding: '2px 8px', borderRadius: '10px', fontWeight: 800 }}>
                                {homeworkItemsCount} Aufgaben
                              </span>
                            </div>
                          </div>
                          {!isCompact && (
                            <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 500 }}>
                              Dokumentiert in Woche {weekNum}
                            </span>
                          )}

                          {/* Inline Feedback Panel — only when selected and not readOnly */}
                          {isSelected && !readOnly && (
                            <div
                              onClick={e => e.stopPropagation()}
                              style={{ marginTop: '10px', padding: '14px', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '12px' }}
                            >
                              {/* Status */}
                              <div>
                                <span style={{ fontSize: '0.66rem', fontWeight: 850, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                  Wie lief die Aufgabe?
                                </span>
                                <div style={{ display: 'flex', gap: '5px', marginTop: '6px' }}>
                                  {([
                                    { key: 'beherrscht', label: '✓ Beherrscht', bg: '#dcfce7', color: '#16a34a', border: '#86efac' },
                                    { key: 'in_entwicklung', label: '~ In Entwicklung', bg: '#fefce8', color: '#ca8a04', border: '#fde68a' },
                                    { key: 'wiederholen', label: '↩ Wiederholen', bg: '#fee2e2', color: '#dc2626', border: '#fecaca' },
                                  ] as const).map(opt => (
                                    <button
                                      key={opt.key}
                                      type="button"
                                      onClick={() => setPendingFeedbackStatus(prev => prev === opt.key ? null : opt.key)}
                                      style={{
                                        flex: 1, padding: '6px 3px',
                                        background: pendingFeedbackStatus === opt.key ? opt.bg : 'white',
                                        border: `1.5px solid ${pendingFeedbackStatus === opt.key ? opt.border : '#e2e8f0'}`,
                                        borderRadius: '10px', cursor: 'pointer', fontSize: '0.62rem', fontWeight: 800,
                                        color: pendingFeedbackStatus === opt.key ? opt.color : '#64748b',
                                        transition: 'all 0.15s ease'
                                      }}
                                    >{opt.label}</button>
                                  ))}
                                </div>
                              </div>

                              {/* Tags & Skill Categories */}
                              <div>
                                <span style={{ fontSize: '0.66rem', fontWeight: 850, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                  Übe-Schwerpunkte & Förderbereiche
                                </span>

                                {/* 5 Universelle Musikalische Kern-Säulen */}
                                <div style={{ marginTop: '6px' }}>
                                  <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px' }}>
                                    Musikalische Kern-Dimensionen
                                  </span>
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                                    {SKILL_TAGS.map(tag => {
                                      const active = pendingFeedbackTags.includes(tag.key);
                                      const limitReached = !active && pendingFeedbackTags.length >= 2;
                                      return (
                                        <button
                                          key={tag.key}
                                          type="button"
                                          onClick={() => setPendingFeedbackTags(prev => {
                                            if (prev.includes(tag.key)) return prev.filter(t => t !== tag.key);
                                            if (prev.length >= 2) return prev;
                                            return [...prev, tag.key];
                                          })}
                                          style={{
                                            padding: '4px 9px',
                                            background: active ? '#fef2f2' : '#f8fafc',
                                            border: `1.5px solid ${active ? '#fca5a5' : '#e2e8f0'}`,
                                            borderRadius: '20px', cursor: 'pointer', fontSize: '0.66rem', fontWeight: 800,
                                            color: active ? '#dc2626' : '#64748b', transition: 'all 0.15s ease',
                                            opacity: limitReached ? 0.45 : 1
                                          }}
                                        >{tag.icon} {tag.label}</button>
                                      );
                                    })}
                                    {customTags.map(tag => {
                                      const active = pendingFeedbackTags.includes(tag);
                                      const limitReached = !active && pendingFeedbackTags.length >= 2;
                                      return (
                                        <button
                                          key={tag}
                                          type="button"
                                          onClick={() => setPendingFeedbackTags(prev => {
                                            if (prev.includes(tag)) return prev.filter(t => t !== tag);
                                            if (prev.length >= 2) return prev;
                                            return [...prev, tag];
                                          })}
                                          style={{
                                            padding: '4px 9px',
                                            background: active ? '#fef2f2' : '#f8fafc',
                                            border: `1.5px solid ${active ? '#fca5a5' : '#e2e8f0'}`,
                                            borderRadius: '20px', cursor: 'pointer', fontSize: '0.66rem', fontWeight: 800,
                                            color: active ? '#dc2626' : '#64748b', transition: 'all 0.15s ease',
                                            opacity: limitReached ? 0.45 : 1
                                          }}
                                        >✏️ {tag}</button>
                                      );
                                    })}
                                  </div>
                                </div>

                                <div style={{ fontSize: '0.66rem', color: '#64748b', marginTop: '8px', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <span>💡</span>
                                  <span style={{ fontWeight: 600 }}>Wähle maximal 2 Schwerpunkte aus, um den Schüler gezielt zu fördern.</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '10px' }}>
                                  <input
                                    type="text"
                                    placeholder="Eigene Schwierigkeit..."
                                    value={newCustomTagInput}
                                    onChange={e => setNewCustomTagInput(e.target.value)}
                                    onKeyDown={e => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleAddCustomTag();
                                      }
                                    }}
                                    style={{
                                      padding: '4px 10px',
                                      fontSize: '0.66rem',
                                      border: '1.5px solid #cbd5e1',
                                      borderRadius: '20px',
                                      background: '#f8fafc',
                                      color: '#334155',
                                      outline: 'none',
                                      fontWeight: 650,
                                      width: '140px'
                                    }}
                                  />
                                  <button
                                    type="button"
                                    onClick={handleAddCustomTag}
                                    style={{
                                      background: '#34a853',
                                      border: 'none',
                                      borderRadius: '50%',
                                      width: '22px',
                                      height: '22px',
                                      color: 'white',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontWeight: 900,
                                      fontSize: '0.8rem'
                                    }}
                                  >
                                    +
                                  </button>
                                </div>
                              </div>

                              {/* Save */}
                              <button
                                type="button"
                                onClick={async () => {
                                  setIsSavingFeedback(true);
                                  await saveFeedback(wk, pendingFeedbackTags, pendingFeedbackStatus);
                                  setIsSavingFeedback(false);
                                }}
                                disabled={isSavingFeedback}
                                style={{
                                  background: '#34a853', color: 'white', border: 'none', borderRadius: '10px',
                                  padding: '9px', fontSize: '0.76rem', fontWeight: 800, cursor: 'pointer',
                                  opacity: isSavingFeedback ? 0.7 : 1, transition: 'all 0.15s ease'
                                }}
                              >{isSavingFeedback ? 'Speichern...' : 'Bewertung speichern'}</button>
                            </div>
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
                    background: '#34a853',
                    color: 'white',
                    border: 'none',
                    padding: '12px',
                    borderRadius: '14px',
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 4px 10px rgba(19, 115, 51, 0.2)',
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
                const assignedBook = assignedLehrwerke.find(a => a.lehrwerkId === activeLehrwerkId);
                let book = globalLehrwerke.find(g => g.id === activeLehrwerkId);
                if (!book) {
                  book = {
                    id: activeLehrwerkId,
                    title: assignedBook?.title || 'Eigenes Lehrwerk',
                    totalPages: 50,
                    total_pages: 50,
                    emoji: '📚',
                    color: '#34a853',
                    is_custom: true
                  };
                }
                const bookColor = getLehrwerkColor(book.title);
                const pct = assignedBook ? Math.min(100, Math.round((Object.values(assignedBook.pageStates || {}).filter((p: any) => p.status === 'mastered').length / (book.totalPages || 50)) * 100)) : 0;
                const pages = Array.from({ length: book.totalPages || 50 }, (_, i) => i + 1);
                const currentVisibility = assignedBook?.visibility || 'private';

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
                      boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
                      flexWrap: 'wrap'
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
                        justifyContent: 'center',
                        flexShrink: 0
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
                      <div style={{ flex: 1, minWidth: '220px' }}>
                        {(() => {
                          const isStudentCreated = Boolean(assignedBook?.isStudentCreated || assignedBook?.createdByRole === 'student' || book.created_by_role === 'student');
                          const isTeacherAssigned = !isStudentCreated;
                          const isStudentViewingTeacherBook = Boolean(readOnly && isTeacherAssigned);

                          return (
                            <>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
                                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 900, color: '#0f172a' }}>
                                  {book.title}
                                </h4>
                                {isStudentCreated ? (
                                  <span style={{ color: '#d97706', fontSize: '0.72rem', fontWeight: 800, background: '#fffbeb', border: '1px solid #fef3c7', padding: '2px 8px', borderRadius: '10px' }}>
                                    🙋 Vom Schüler angelegt
                                  </span>
                                ) : activeLehrwerkId.startsWith('custom-') || book.is_custom || assignedBook?.createdByRole === 'teacher' || book.created_by_teacher ? (
                                  <span style={{ color: '#0284c7', fontSize: '0.72rem', fontWeight: 800, background: '#f0f9ff', border: '1px solid #e0f2fe', padding: '2px 8px', borderRadius: '10px' }}>
                                    👨‍🏫 Vom Lehrer angelegt
                                  </span>
                                ) : (
                                  <span style={{ color: '#16a34a', fontSize: '0.72rem', fontWeight: 800, background: '#f0fdf4', border: '1px solid #dcfce7', padding: '2px 8px', borderRadius: '10px' }}>
                                    🎓 Vom Lehrer zugewiesen
                                  </span>
                                )}
                              </div>

                              {/* Expressive Apple Access Control Bar */}
                              <div style={{
                                margin: '8px 0 10px 0',
                                padding: '6px 12px',
                                background: '#f8fafc',
                                border: '1.5px solid #e2e8f0',
                                borderRadius: '16px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                flexWrap: 'wrap',
                                gap: '8px'
                              }}>
                                <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#334155', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <span>🛡️</span> Sichtbarkeit & Rechte:
                                </span>

                                {isStudentViewingTeacherBook ? (
                                  <div style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    background: '#f1f5f9',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '10px',
                                    padding: '4px 10px',
                                    gap: '6px',
                                    fontSize: '0.72rem',
                                    fontWeight: 800,
                                    color: '#334155'
                                  }}>
                                    <span>
                                      {currentVisibility === 'private' ? '🔒 Nur für mich (Privat)' : currentVisibility === 'read' ? '👁️ Lehrer liest mit' : '🤝 Lehrer darf eintragen'}
                                    </span>
                                    <span style={{ fontSize: '0.65rem', color: '#047857', background: '#e6f4ea', padding: '1px 6px', borderRadius: '6px', fontWeight: 800 }}>
                                      👨‍🏫 Vom Lehrer gesteuert
                                    </span>
                                  </div>
                                ) : (
                                  <div style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    background: '#cbd5e1',
                                    borderRadius: '11px',
                                    padding: '2px',
                                    gap: '2px'
                                  }}>
                                    <button
                                      type="button"
                                      onClick={() => updateLehrwerkVisibility(book.id, 'private')}
                                      style={{
                                        border: 'none',
                                        background: currentVisibility === 'private' ? '#ffffff' : 'transparent',
                                        color: currentVisibility === 'private' ? '#0f172a' : '#475569',
                                        padding: '4px 10px',
                                        borderRadius: '9px',
                                        fontSize: '0.71rem',
                                        fontWeight: 800,
                                        cursor: 'pointer',
                                        boxShadow: currentVisibility === 'private' ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                                        transition: 'all 0.15s ease',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                      }}
                                    >
                                      🔒 Nur für mich (Privat)
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => updateLehrwerkVisibility(book.id, 'read')}
                                      style={{
                                        border: 'none',
                                        background: currentVisibility === 'read' ? '#ffffff' : 'transparent',
                                        color: currentVisibility === 'read' ? '#047857' : '#475569',
                                        padding: '4px 10px',
                                        borderRadius: '9px',
                                        fontSize: '0.71rem',
                                        fontWeight: 800,
                                        cursor: 'pointer',
                                        boxShadow: currentVisibility === 'read' ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                                        transition: 'all 0.15s ease',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                      }}
                                    >
                                      👁️ Lehrer liest mit
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => updateLehrwerkVisibility(book.id, 'control')}
                                      style={{
                                        border: 'none',
                                        background: currentVisibility === 'control' ? '#ffffff' : 'transparent',
                                        color: currentVisibility === 'control' ? '#6d28d9' : '#475569',
                                        padding: '4px 10px',
                                        borderRadius: '9px',
                                        fontSize: '0.71rem',
                                        fontWeight: 800,
                                        cursor: 'pointer',
                                        boxShadow: currentVisibility === 'control' ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                                        transition: 'all 0.15s ease',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                      }}
                                    >
                                      🤝 Lehrer darf eintragen
                                    </button>
                                  </div>
                                )}
                              </div>

                              {book.author && (
                                <p style={{ margin: '0 0 2px 0', fontSize: '0.76rem', color: '#64748b', fontWeight: 650 }}>
                                  von {book.author}
                                </p>
                              )}
                              <span style={{ fontSize: '0.74rem', color: '#475569', fontWeight: 800 }}>
                                📖 {book.totalPages || 50} Seiten • {pct}% gemeistert
                              </span>
                              <div style={{ width: '100%', height: '6px', background: '#e8e8ed', borderRadius: '3px', marginTop: '6px', overflow: 'hidden' }}>
                                <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg, #34a853, #34a853)', transition: 'width 0.4s ease' }} />
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Brushes Panel for Textbooks - Protected for Teacher-assigned Books */}
                    {(() => {
                      const isStudentCreated = Boolean(assignedBook?.isStudentCreated || assignedBook?.createdByRole === 'student' || book.created_by_role === 'student');
                      const isStudentViewingTeacherBook = Boolean(readOnly && !isStudentCreated);

                      if (isStudentViewingTeacherBook) {
                        const isFocusActive = activeBrush === 'STUDENT_FOCUS';
                        return (
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
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                              <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#4b5563', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span>🖌️</span> Dein Übe-Pinsel:
                              </span>
                              <button
                                type="button"
                                onClick={() => setActiveBrush(prev => prev === 'STUDENT_FOCUS' ? 'NONE' : 'STUDENT_FOCUS')}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  padding: '6px 14px',
                                  borderRadius: '999px',
                                  background: isFocusActive ? '#f5f3ff' : '#ffffff',
                                  border: isFocusActive ? '2px solid #8b5cf6' : '1.5px solid #cbd5e1',
                                  color: isFocusActive ? '#6d28d9' : '#475569',
                                  fontWeight: 800,
                                  fontSize: '0.74rem',
                                  cursor: 'pointer',
                                  boxShadow: isFocusActive ? '0 0 12px rgba(139, 92, 246, 0.3)' : '0 1px 3px rgba(0,0,0,0.04)',
                                  transition: 'all 0.15s ease'
                                }}
                                className="tactile-btn"
                              >
                                <span style={{
                                  width: '12px',
                                  height: '12px',
                                  borderRadius: '50%',
                                  background: '#8b5cf6',
                                  display: 'inline-block',
                                  boxShadow: '0 0 6px rgba(139, 92, 246, 0.6)'
                                }} />
                                <span>🟣 Mein Übe-Fokus (Max. 3)</span>
                                {isFocusActive && <span style={{ color: '#8b5cf6', fontWeight: 900 }}>✓ Aktiv</span>}
                              </button>
                            </div>

                            <div style={{ borderTop: '1px solid rgba(0, 0, 0, 0.05)', paddingTop: '8px', display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '0.68rem', color: '#71717a', fontWeight: 700 }}><span style={{ color: 'hsl(47, 85%, 84%)' }}>●</span> Gelb (Hausaufgabe)</span>
                              <span style={{ fontSize: '0.68rem', color: '#71717a', fontWeight: 700 }}><span style={{ color: 'hsl(130, 65%, 82%)' }}>●</span> Grün (erledigt)</span>
                              <span style={{ fontSize: '0.68rem', color: '#71717a', fontWeight: 700 }}><span style={{ color: 'hsl(355, 75%, 84%)' }}>●</span> Rot (unbearbeitet)</span>
                              <span style={{ fontSize: '0.68rem', color: '#71717a', fontWeight: 700 }}><span style={{ color: '#8b5cf6' }}>🟣</span> Lila Ring (Dein Übe-Fokus)</span>
                            </div>
                          </div>
                        );
                      }

                      return (
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
                            <span style={{ fontSize: '0.68rem', color: '#71717a', fontWeight: 700 }}><span style={{ color: '#8b5cf6' }}>🟣</span> Lila Ring (Schüler-Fokus)</span>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Page Grid preview scroll for active textbook */}
                    {assignedBook && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '24px', padding: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#7d7d82' }}>Seitenübersicht:</span>
                          <button
                            type="button"
                            onClick={() => setShowAllPagesGrid(true)}
                            style={{ background: 'transparent', border: 'none', color: '#34a853', fontSize: '0.72rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
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
                                    background: isSelected ? '#34a853' : '#f1f5f9',
                                    color: isSelected ? 'white' : '#475569',
                                    border: 'none',
                                    padding: '6px 12px',
                                    borderRadius: '12px',
                                    fontSize: '0.74rem',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease',
                                    boxShadow: isSelected ? '0 2px 6px rgba(19, 115, 51, 0.2)' : 'none'
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
                              const isStudentFocus = Boolean(pageState?.studentFocus);

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
                                    const isStudentCreated = Boolean(assignedBook?.isStudentCreated || assignedBook?.createdByRole === 'student' || book.created_by_role === 'student');
                                    const isStudentViewingTeacherBook = Boolean(readOnly && !isStudentCreated);

                                    if (activeBrush === 'STUDENT_FOCUS') {
                                      toggleStudentFocusPage(activeLehrwerkId!, num);
                                      selectTextbookPage(activeLehrwerkId!, num);
                                      return;
                                    }

                                    if (activeBrush !== 'NONE' && !isStudentViewingTeacherBook) {
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
                                      if (!isStudentViewingTeacherBook) {
                                        handlePageDoubleClick(activeLehrwerkId!, num);
                                      } else {
                                        selectTextbookPage(activeLehrwerkId!, num);
                                      }
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
                                    position: 'relative',
                                    height: '44px',
                                    borderRadius: '50%',
                                    border: isPageActive 
                                      ? `2.5px solid ${solidActiveBg}` 
                                      : (isStudentFocus ? '2.5px solid #8b5cf6' : `2px solid ${borderColor}`),
                                    background: isPageActive ? solidActiveBg : bg,
                                    color: isPageActive ? 'white' : textColor,
                                    fontWeight: 900,
                                    fontSize: '0.88rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: isStudentFocus 
                                      ? (isPageActive ? '0 0 0 3px #8b5cf6, 0 4px 12px rgba(139, 92, 246, 0.4)' : '0 0 0 2px #8b5cf6, 0 2px 8px rgba(139, 92, 246, 0.35)')
                                      : (isPageActive ? '0 4px 8px rgba(0,0,0,0.1)' : 'none'),
                                    transform: isPageActive ? 'scale(1.08)' : 'none',
                                    transition: 'all 0.15s ease'
                                  }}
                                >
                                  <span>{num}</span>
                                  {isStudentFocus && (
                                    <span 
                                      title="Schüler-Übefokus" 
                                      style={{
                                        position: 'absolute',
                                        top: '-3px',
                                        right: '-3px',
                                        width: '12px',
                                        height: '12px',
                                        borderRadius: '50%',
                                        background: '#8b5cf6',
                                        border: '2px solid #ffffff',
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                                        display: 'inline-block'
                                      }}
                                    />
                                  )}
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
                      onClick={() => {
                        handleBackToHub();
                      }}
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
                      {renderSongVinylCover(songColor, 'sm')}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h4 style={{ margin: '0 0 4px 0', fontSize: '0.95rem', fontWeight: 900, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {skill.songs?.title}
                        </h4>
                        <p style={{ margin: '0 0 2px 0', fontSize: '0.76rem', color: '#64748b', fontWeight: 650, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          von {skill.songs?.artist}
                        </p>
                        <span style={{ fontSize: '0.74rem', color: '#475569', fontWeight: 800 }}>
                          {readOnly && isMatchModeEnabled && !isMatchRevealed
                            ? (studentRating !== null ? `Dein Tipp: ${studentRating}%` : 'Tipp noch offen 🎵')
                            : (readOnly && isMatchRevealed ? `Stand: ${progress}%` : `${progress}%`)}
                        </span>
                        <div style={{ width: '100%', height: '7px', background: '#e8e8ed', borderRadius: '3.5px', marginTop: '6px', overflow: 'hidden' }}>
                          <div style={{
                            width: `${readOnly && isMatchModeEnabled && !isMatchRevealed ? (studentRating ?? 0) : progress}%`,
                            height: '100%',
                            background: (status === 'MASTERED' || skill.is_stage_ready || progress === 100)
                              ? 'hsl(130, 65%, 82%)'
                              : (readOnly && isMatchModeEnabled && !isMatchRevealed ? '#16a34a' : 'hsl(47, 85%, 84%)'),
                            transition: 'width 0.4s ease'
                          }} />
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
                            { mode: 'LOCKED', color: 'hsl(355, 75%, 84%)', label: 'Rot (keine Hausaufgabe)', getActive: () => status === 'IN_PROGRESS' && !isCurrentHomework, action: () => {
                               setStatus('IN_PROGRESS');
                               setIsCurrentHomework(false);
                               setHasChanges(true);
                               if (selectedActiveSongId) triggerDirectSongSave(selectedActiveSongId, 'IN_PROGRESS', false);
                             } },
                            { mode: 'HOMEWORK', color: 'hsl(47, 85%, 84%)', label: 'Gelb (Hausaufgabe)', getActive: () => status === 'IN_PROGRESS' && isCurrentHomework, action: () => {
                               setStatus('IN_PROGRESS');
                               setIsCurrentHomework(true);
                               setHasChanges(true);
                               if (selectedActiveSongId) triggerDirectSongSave(selectedActiveSongId, 'IN_PROGRESS', true);
                             } },
                            { mode: 'MASTERED', color: 'hsl(130, 65%, 82%)', label: 'Grün (erledigt)', getActive: () => status === 'MASTERED', action: () => {
                               setStatus('MASTERED');
                               setIsCurrentHomework(false);
                               setHasChanges(true);
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
                        <span style={{ fontSize: '0.68rem', color: '#71717a', fontWeight: 700 }}><span style={{ color: 'hsl(355, 75%, 84%)' }}>●</span> Rot (keine Hausaufgabe)</span>
                        <span style={{ fontSize: '0.68rem', color: '#71717a', fontWeight: 700 }}><span style={{ color: 'hsl(47, 85%, 84%)' }}>●</span> Gelb (Hausaufgabe)</span>
                        <span style={{ fontSize: '0.68rem', color: '#71717a', fontWeight: 700 }}><span style={{ color: 'hsl(130, 65%, 82%)' }}>●</span> Grün (erledigt)</span>
                      </div>
                    </div>

                    {/* Collapsible Progress & Dual Match Widget */}
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '14px',
                      background: 'white',
                      borderRadius: '20px',
                      padding: '16px 18px',
                      border: '1px solid rgba(0, 0, 0, 0.08)',
                      boxShadow: '0 4px 15px rgba(0,0,0,0.02)',
                      transition: 'all 0.3s ease',
                      position: 'relative'
                    }}>
                      {/* Match Confetti Flash */}
                      {showMatchConfetti && (
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none', zIndex: 10 }}>
                          <Confetti width={500} height={300} recycle={false} numberOfPieces={120} />
                        </div>
                      )}

                      {/* Header row: Progress Title & Mode Controls */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '0.86rem', fontWeight: 900, color: songProgressPercent === 100 ? '#34a853' : '#0f172a', transition: 'color 0.3s ease' }}>
                            {readOnly && isMatchModeEnabled
                              ? (lastMatchedTeacherPercent !== null ? `Lehrer-Stand: ${lastMatchedTeacherPercent}%` : 'Fortschritt (Wird im Unterricht gematcht)')
                              : `Fortschritt: ${songProgressPercent}%`}
                          </span>

                          {/* Teacher's Match-Mode Toggle Pill */}
                          {!readOnly && (
                            <button
                              type="button"
                              onClick={handleToggleMatchMode}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '3px 8px',
                                borderRadius: '99px',
                                fontSize: '0.68rem',
                                fontWeight: 800,
                                border: isMatchModeEnabled ? '1px solid #bbf7d0' : '1px solid #e2e8f0',
                                background: isMatchModeEnabled ? '#f0fdf4' : '#f8fafc',
                                color: isMatchModeEnabled ? '#166534' : '#64748b',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                              }}
                              className="hover-scale"
                              title={isMatchModeEnabled ? 'Match-Modus ist aktiv (Schüler schätzt heimlich mit)' : 'Match-Modus ist aus (Schüler sieht nur Read-Only)'}
                            >
                              <span>🎯 Match-Modus:</span>
                              <span style={{ fontWeight: 900 }}>{isMatchModeEnabled ? 'Aktiv' : 'Aus'}</span>
                            </button>
                          )}
                        </div>
                        
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
                          !readOnly && (
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
                                padding: '6px 12px',
                                borderRadius: '20px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              {isSubSlidersExpanded ? 'Details ausblenden ▲' : 'Details einblenden ▼'}
                            </button>
                          )
                        )}
                      </div>

                      {/* TEACHER SLIDER (Master Rating) */}
                      {!readOnly && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
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
                                } else if (status === 'MASTERED') {
                                  setStatus('IN_PROGRESS');
                                }
                                setHasChanges(true);
                                setActiveSongSkills(prev => prev.map(s => s.id === selectedActiveSongId ? { ...s, progress_percent: val, is_stage_ready: val === 100 } : s));
                                localStorage.setItem(`song_skills_detail_${student.id}_${selectedActiveSongId}`, JSON.stringify({
                                  rhythm: val,
                                  finger: val,
                                  expression: val
                                }));
                                triggerDebouncedAutoSave(300);
                              }}
                              style={{
                                flex: 1,
                                accentColor: songProgressPercent === 100 ? '#34a853' : (songProgressPercent >= 50 ? '#eab308' : '#64748b'),
                                height: '9px',
                                borderRadius: '4.5px',
                                cursor: 'pointer',
                                background: songProgressPercent === 100
                                  ? `linear-gradient(to right, #34a853 0%, #34a853 100%)`
                                  : (songProgressPercent >= 50
                                    ? `linear-gradient(to right, #eab308 0%, #eab308 ${songProgressPercent}%, #e2e8f0 ${songProgressPercent}%, #e2e8f0 100%)`
                                    : `linear-gradient(to right, #64748b 0%, #64748b ${songProgressPercent}%, #e2e8f0 ${songProgressPercent}%, #e2e8f0 100%)`),
                                WebkitAppearance: 'none',
                                outline: 'none',
                                transition: 'all 0.3s ease'
                              }}
                            />
                          </div>
                        </div>
                      )}

                      {/* READ-ONLY FALLBACK (When Match-Modus is OFF for Student) */}
                      {readOnly && !isMatchModeEnabled && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              disabled={true}
                              value={songProgressPercent}
                              style={{
                                flex: 1,
                                accentColor: songProgressPercent === 100 ? '#34a853' : (songProgressPercent >= 50 ? '#eab308' : '#64748b'),
                                height: '10px',
                                borderRadius: '5px',
                                cursor: 'default',
                                opacity: 0.85,
                                background: songProgressPercent === 100
                                  ? `linear-gradient(to right, #34a853 0%, #34a853 100%)`
                                  : (songProgressPercent >= 50
                                    ? `linear-gradient(to right, #eab308 0%, #eab308 ${songProgressPercent}%, #e2e8f0 ${songProgressPercent}%, #e2e8f0 100%)`
                                    : `linear-gradient(to right, #64748b 0%, #64748b ${songProgressPercent}%, #e2e8f0 ${songProgressPercent}%, #e2e8f0 100%)`),
                                WebkitAppearance: 'none',
                                outline: 'none'
                              }}
                            />
                          </div>
                        </div>
                      )}

                      {/* STUDENT SELF-ASSESSMENT SLIDER & COMMIT BUTTON (When Match-Modus is ACTIVE for Student) */}
                      {readOnly && isMatchModeEnabled && (() => {
                        const currentPct = studentRating ?? 0;
                        const getProgressFeeling = (pct: number) => {
                          if (pct <= 25) return { icon: '🐌', text: 'Aller Anfang' };
                          if (pct <= 50) return { icon: '🧩', text: 'Einzelne Teile klappen' };
                          if (pct <= 75) return { icon: '⚡', text: 'Läuft fast flüssig' };
                          return { icon: '🚀', text: 'Bühnenreif!' };
                        };
                        const feeling = getProgressFeeling(currentPct);

                        return (
                          <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '14px',
                            background: '#f8fafc',
                            padding: '16px',
                            borderRadius: '18px',
                            border: isStudentRatingCommitted ? '2px solid #86efac' : '2px solid #fcd34d',
                            boxShadow: isStudentRatingCommitted ? '0 4px 14px rgba(34, 197, 94, 0.08)' : '0 4px 14px rgba(245, 158, 11, 0.08)',
                            transition: 'all 0.2s ease'
                          }}>
                            {/* Top Header Row */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                              <span style={{ fontSize: '0.86rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                🎧 Wie gut klappt es schon:
                                <span style={{ color: currentPct > 0 ? '#15803d' : '#64748b', fontWeight: 950, fontSize: '0.94rem' }}>
                                  {currentPct}% • {feeling.icon} {feeling.text}
                                </span>
                              </span>
                              <span style={{ fontSize: '0.68rem', color: '#15803d', background: '#dcfce7', padding: '2px 8px', borderRadius: '99px', fontWeight: 800 }}>
                                🔒 Lehrer-Wertung verdeckt
                              </span>
                            </div>

                            {/* Interactive Slider */}
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={studentRating ?? 0}
                              onChange={(e) => {
                                const val = parseInt(e.target.value, 10);
                                handleStudentRatingChange(val);
                              }}
                              style={{
                                width: '100%',
                                accentColor: '#16a34a',
                                height: '14px',
                                borderRadius: '7px',
                                cursor: 'pointer',
                                touchAction: 'manipulation',
                                pointerEvents: 'auto',
                                background: currentPct > 0
                                  ? `linear-gradient(to right, #16a34a 0%, #16a34a ${currentPct}%, #e2e8f0 ${currentPct}%, #e2e8f0 100%)`
                                  : '#e2e8f0',
                                WebkitAppearance: 'none',
                                outline: 'none',
                                transition: 'all 0.15s ease'
                              }}
                            />

                            {/* Action & Status Row: Lifecycle-Aware Child-Friendly Commit Button */}
                            {(() => {
                              const isFullyCompleted = matchHistory.length >= 3;
                              const targetMatchNum = Math.min(matchHistory.length + 1, 3);
                              const hasFreshStudentRating = Boolean(
                                studentRating !== null &&
                                studentRating !== undefined &&
                                studentRatingUpdatedAt &&
                                (!lastMatchedAt || new Date(studentRatingUpdatedAt).getTime() > new Date(lastMatchedAt).getTime())
                              );

                              return (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    {isFullyCompleted ? (
                                      <span style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '5px',
                                        background: '#dcfce7',
                                        color: '#15803d',
                                        padding: '5px 12px',
                                        borderRadius: '99px',
                                        fontSize: '0.74rem',
                                        fontWeight: 850
                                      }}>
                                        <span>🏆 Alle 3 Meilensteine gemeistert!</span>
                                      </span>
                                    ) : (hasFreshStudentRating && isStudentRatingCommitted) ? (
                                      <span style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '5px',
                                        background: '#dcfce7',
                                        color: '#15803d',
                                        padding: '5px 12px',
                                        borderRadius: '99px',
                                        fontSize: '0.74rem',
                                        fontWeight: 850
                                      }}>
                                        <Check size={14} strokeWidth={3} />
                                        <span>Tipp für Match {targetMatchNum} ist sicher bei deiner Lehrkraft!</span>
                                      </span>
                                    ) : (
                                      <span style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        background: matchHistory.length > 0 ? '#f0fdf4' : '#fffbeb',
                                        color: matchHistory.length > 0 ? '#15803d' : '#b45309',
                                        padding: '4px 10px',
                                        borderRadius: '99px',
                                        fontSize: '0.72rem',
                                        fontWeight: 800,
                                        border: `1px solid ${matchHistory.length > 0 ? '#bbf7d0' : '#fde68a'}`
                                      }}>
                                        <span>{matchHistory.length > 0 ? `🌱 Tipp für Match ${targetMatchNum} einstellen (${currentPct}%)` : '⚠️ 1. Tipp noch nicht abgeschickt'}</span>
                                      </span>
                                    )}
                                  </div>

                                  <button
                                    type="button"
                                    onClick={handleCommitStudentRating}
                                    disabled={isFullyCompleted || (hasFreshStudentRating && isStudentRatingCommitted)}
                                    style={{
                                      border: 'none',
                                      background: (isFullyCompleted || (hasFreshStudentRating && isStudentRatingCommitted))
                                        ? '#e2e8f0'
                                        : 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                                      color: (isFullyCompleted || (hasFreshStudentRating && isStudentRatingCommitted)) ? '#475569' : '#ffffff',
                                      padding: '9px 20px',
                                      borderRadius: '99px',
                                      fontSize: '0.78rem',
                                      fontWeight: 900,
                                      cursor: (isFullyCompleted || (hasFreshStudentRating && isStudentRatingCommitted)) ? 'default' : 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '6px',
                                      boxShadow: (isFullyCompleted || (hasFreshStudentRating && isStudentRatingCommitted)) ? 'none' : '0 3px 10px rgba(22, 163, 74, 0.35)',
                                      transition: 'all 0.15s ease'
                                    }}
                                    className={(isFullyCompleted || (hasFreshStudentRating && isStudentRatingCommitted)) ? '' : 'hover-scale'}
                                  >
                                    {isFullyCompleted ? (
                                      <span>✓ Alle Matches abgeschlossen</span>
                                    ) : (hasFreshStudentRating && isStudentRatingCommitted) ? (
                                      <>
                                        <Check size={14} strokeWidth={3} />
                                        <span>Tipp {targetMatchNum} eingeloggt ({studentRating}%)</span>
                                      </>
                                    ) : (
                                      <>
                                        <Lock size={14} />
                                        <span>🔒 Tipp für Match {targetMatchNum} abschicken ({currentPct}%)</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                              );
                            })()}

                            {/* 3 VISUAL REWARD TIERS (Kid-Friendly & Gamified) */}
                            <div style={{ marginTop: '4px' }}>
                              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', marginBottom: '4px' }}>
                                🎁 Belohnungs-Stufen für dein nächstes Match:
                              </div>
                              <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                                gap: '8px'
                              }}>
                                <div style={{
                                  background: '#fefce8',
                                  border: '1.5px solid #fde047',
                                  borderRadius: '12px',
                                  padding: '8px 10px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px'
                                }}>
                                  <span style={{ fontSize: '1.2rem' }}>🎯</span>
                                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontSize: '0.72rem', fontWeight: 900, color: '#854d0e' }}>Volltreffer (±10%)</span>
                                    <span style={{ fontSize: '0.66rem', fontWeight: 750, color: '#a16207' }}>+50 XP & Meister-Ohr</span>
                                  </div>
                                </div>

                                <div style={{
                                  background: '#f0f9ff',
                                  border: '1.5px solid #bae6fd',
                                  borderRadius: '12px',
                                  padding: '8px 10px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px'
                                }}>
                                  <span style={{ fontSize: '1.2rem' }}>✨</span>
                                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontSize: '0.72rem', fontWeight: 900, color: '#0369a1' }}>Super Gehör (±20%)</span>
                                    <span style={{ fontSize: '0.66rem', fontWeight: 750, color: '#0284c7' }}>+25 XP</span>
                                  </div>
                                </div>

                                <div style={{
                                  background: '#faf5ff',
                                  border: '1.5px solid #e9d5ff',
                                  borderRadius: '12px',
                                  padding: '8px 10px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px'
                                }}>
                                  <span style={{ fontSize: '1.2rem' }}>🚀</span>
                                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontSize: '0.72rem', fontWeight: 900, color: '#7e22ce' }}>Weiter-Rocker (&gt;20%)</span>
                                    <span style={{ fontSize: '0.66rem', fontWeight: 750, color: '#9333ea' }}>+5 XP Mut-Bonus</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* 1. DUAL-BALKEN SHOWDOWN RACE BOX (Animated 1.2s Comparison) */}
                      {showdownState && (
                        <div style={{
                          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                          borderRadius: '20px',
                          padding: '16px 20px',
                          color: '#ffffff',
                          margin: '8px 0',
                          boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
                          border: '1.5px solid rgba(255,255,255,0.12)',
                          animation: 'fadeIn 0.25s ease'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', fontWeight: 900, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                              <span>🏁 LIVE-MATCH SHOWDOWN</span>
                            </div>
                            {showdownState.isRunning ? (
                              <span style={{ fontSize: '0.72rem', color: '#facc15', fontWeight: 800, animation: 'pulse 1s infinite' }}>
                                ⚡ Showdown läuft...
                              </span>
                            ) : (
                              <span style={{ fontSize: '0.74rem', fontWeight: 900, color: '#86efac', background: 'rgba(34,197,94,0.2)', padding: '2px 8px', borderRadius: '99px' }}>
                                Δ {Math.abs(showdownState.teacherTarget - showdownState.studentTarget)}% Differenz
                              </span>
                            )}
                          </div>

                          {/* Top Bar: Lehrkraft */}
                          <div style={{ marginBottom: '10px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 800, color: '#cbd5e1', marginBottom: '4px' }}>
                              <span>👨‍🏫 Lehrkraft:</span>
                              <span style={{ color: '#4ade80', fontWeight: 900, fontVariantNumeric: 'tabular-nums' }}>
                                {Math.round(showdownState.currentTeacherVal)}%
                              </span>
                            </div>
                            <div style={{ width: '100%', height: '12px', background: 'rgba(255,255,255,0.1)', borderRadius: '99px', overflow: 'hidden' }}>
                              <div style={{
                                width: `${showdownState.currentTeacherVal}%`,
                                height: '100%',
                                background: 'linear-gradient(90deg, #16a34a, #4ade80)',
                                borderRadius: '99px',
                                transition: showdownState.isRunning ? 'none' : 'width 0.2s ease',
                                boxShadow: '0 0 10px rgba(74, 222, 128, 0.4)'
                              }} />
                            </div>
                          </div>

                          {/* Bottom Bar: Schüler */}
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 800, color: '#cbd5e1', marginBottom: '4px' }}>
                              <span>👧 {readOnly ? 'Dein Tipp:' : 'Schüler-Tipp:'}</span>
                              <span style={{ color: '#facc15', fontWeight: 900, fontVariantNumeric: 'tabular-nums' }}>
                                {Math.round(showdownState.currentStudentVal)}%
                              </span>
                            </div>
                            <div style={{ width: '100%', height: '12px', background: 'rgba(255,255,255,0.1)', borderRadius: '99px', overflow: 'hidden' }}>
                              <div style={{
                                width: `${showdownState.currentStudentVal}%`,
                                height: '100%',
                                background: 'linear-gradient(90deg, #eab308, #fde047)',
                                borderRadius: '99px',
                                transition: showdownState.isRunning ? 'none' : 'width 0.2s ease',
                                boxShadow: '0 0 10px rgba(250, 204, 21, 0.4)'
                              }} />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* TEACHER MATCH STATUS & ACTION BAR (Apple-Grade Lifecycle-Aware Single-Line) */}
                      {!readOnly && isMatchModeEnabled && (() => {
                        const targetMatchNum = Math.min(matchHistory.length + 1, 3);
                        const isFullyCompleted = matchHistory.length >= 3;
                        const latestMatch = matchHistory.length > 0 ? matchHistory[matchHistory.length - 1] : null;
                        const diff = (lastMatchedTeacherPercent !== null && lastMatchedStudentPercent !== null)
                          ? Math.abs(lastMatchedTeacherPercent - lastMatchedStudentPercent)
                          : (studentRating !== null ? Math.abs(songProgressPercent - studentRating) : null);

                        const hasFreshStudentRating = Boolean(
                          studentRating !== null &&
                          studentRating !== undefined &&
                          studentRatingUpdatedAt &&
                          (!lastMatchedAt || new Date(studentRatingUpdatedAt).getTime() > new Date(lastMatchedAt).getTime())
                        );

                        const canExecuteMatch = !isFullyCompleted && hasFreshStudentRating && !showdownState?.isRunning;

                        return (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: '#f8fafc',
                            padding: '10px 14px',
                            borderRadius: '14px',
                            border: canExecuteMatch ? '1.5px solid #bbf7d0' : '1px solid #e2e8f0',
                            gap: '10px',
                            flexWrap: 'wrap',
                            marginTop: '2px'
                          }}>
                            {/* Left Side: Student Tip Status, Compact Result Pill & 3-Dot Milestone Tracker */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              {isFullyCompleted ? (
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  background: '#dcfce7',
                                  color: '#15803d',
                                  padding: '4px 10px',
                                  borderRadius: '99px',
                                  fontWeight: 900,
                                  fontSize: '0.74rem'
                                }}>
                                  <span>🏆 Song komplett gematcht (3/3)</span>
                                </span>
                              ) : hasFreshStudentRating ? (
                                <>
                                  <span style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    background: '#dcfce7',
                                    color: '#15803d',
                                    padding: '4px 10px',
                                    borderRadius: '99px',
                                    fontWeight: 900,
                                    fontSize: '0.74rem'
                                  }}>
                                    <Check size={13} strokeWidth={3} />
                                    <span>Tipp {targetMatchNum} liegt bereit: {studentRating}%</span>
                                  </span>
                                </>
                              ) : matchHistory.length > 0 ? (
                                <>
                                  {latestMatch && (
                                    <span style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      background: latestMatch.tier === 'tier1' ? '#fef3c7' : (latestMatch.tier === 'tier2' ? '#e0f2fe' : '#f3e8ff'),
                                      color: latestMatch.tier === 'tier1' ? '#92400e' : (latestMatch.tier === 'tier2' ? '#075985' : '#6b21a8'),
                                      border: `1px solid ${latestMatch.tier === 'tier1' ? '#fde68a' : (latestMatch.tier === 'tier2' ? '#bae6fd' : '#e9d5ff')}`,
                                      padding: '4px 9px',
                                      borderRadius: '99px',
                                      fontWeight: 850,
                                      fontSize: '0.72rem'
                                    }}>
                                      <span>{latestMatch.tier === 'tier1' ? '🎯' : (latestMatch.tier === 'tier2' ? '✨' : '🚀')}</span>
                                      <span>
                                        Match #{matchHistory.length} beendet
                                        {diff !== null && ` (Δ ${diff}%)`} • +{latestMatch.xp_amount} XP
                                      </span>
                                    </span>
                                  )}
                                  <span style={{ fontWeight: 700, color: '#64748b', fontSize: '0.74rem' }}>
                                    ⏳ Wartet auf Schüler-Tipp für Match {targetMatchNum}
                                  </span>
                                </>
                              ) : (
                                <span style={{ fontWeight: 700, color: '#64748b', fontSize: '0.74rem' }}>
                                  ⏳ Schüler-Tipp steht noch aus (Match 1/3)
                                </span>
                              )}

                              {/* Apple-Style 3-Dot Milestone Tracker */}
                              <div style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                background: '#ffffff',
                                border: '1px solid #e2e8f0',
                                padding: '4px 8px',
                                borderRadius: '99px'
                              }} title={`Match ${matchHistory.length} von 3 belegt`}>
                                {[0, 1, 2].map((idx) => (
                                  <div
                                    key={idx}
                                    style={{
                                      width: '7px',
                                      height: '7px',
                                      borderRadius: '50%',
                                      background: idx < matchHistory.length
                                        ? '#16a34a'
                                        : (idx === matchHistory.length && hasFreshStudentRating ? '#38bdf8' : '#cbd5e1')
                                    }}
                                  />
                                ))}
                                <span style={{ fontSize: '0.66rem', fontWeight: 800, color: '#64748b', marginLeft: '2px' }}>
                                  {matchHistory.length}/3
                                </span>
                              </div>
                            </div>

                            {/* Right Side: Action Button */}
                            <button
                              type="button"
                              onClick={handleCheckMatch}
                              disabled={!canExecuteMatch}
                              style={{
                                border: 'none',
                                background: canExecuteMatch
                                  ? 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)'
                                  : '#cbd5e1',
                                color: canExecuteMatch ? '#ffffff' : '#64748b',
                                padding: '7px 16px',
                                borderRadius: '99px',
                                fontSize: '0.76rem',
                                fontWeight: 900,
                                cursor: canExecuteMatch ? 'pointer' : 'not-allowed',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                boxShadow: canExecuteMatch ? '0 2px 8px rgba(22, 163, 74, 0.3)' : 'none',
                                transition: 'all 0.15s ease'
                              }}
                              className={canExecuteMatch ? 'hover-scale' : ''}
                            >
                              <Sparkles size={13} />
                              <span>
                                {isFullyCompleted
                                  ? '🏆 3/3 Meilensteine belegt'
                                  : (!hasFreshStudentRating && matchHistory.length > 0)
                                    ? `⏳ Wartet auf Tipp ${targetMatchNum}`
                                    : `🎯 Match ${targetMatchNum} prüfen`}
                              </span>
                            </button>
                          </div>
                        );
                      })()}

                      {/* Sub sliders (Rhythm, Finger, Expression) */}
                      {isSubSlidersExpanded && (
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '14px',
                          borderTop: '1px solid rgba(0, 0, 0, 0.08)',
                          padding: '14px 0 0 0',
                          marginTop: '10px',
                          background: 'transparent',
                          animation: 'fadeIn 0.2s ease'
                        }}>
                          {songProgressPercent < 100 && [
                            { label: 'Rhythmus & Timing', value: rhythmVal, type: 'rhythm', color: '#16a34a' },
                            { label: 'Finger & Technik', value: fingerVal, type: 'finger', color: '#0284c7' },
                            { label: 'Ausdruck & Performance', value: expressionVal, type: 'expression', color: '#d97706' }
                          ].map(sub => (
                            <div key={sub.type} style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.73rem', fontWeight: 800, color: '#475569' }}>
                                <span>{sub.label}</span>
                                <span style={{ color: sub.color, fontWeight: 900 }}>{sub.value}%</span>
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
                                    if (status === 'MASTERED') setStatus('IN_PROGRESS');
                                  } else {
                                    setStatus('MASTERED');
                                    setIsCurrentHomework(false);
                                  }
                                  setActiveSongSkills(prev => prev.map(s => s.id === selectedActiveSongId ? { ...s, progress_percent: avg, is_stage_ready: avg === 100 } : s));
                                  localStorage.setItem(`song_skills_detail_${student.id}_${selectedActiveSongId}`, JSON.stringify({
                                    rhythm: r,
                                    finger: f,
                                    expression: eVal
                                  }));
                                  triggerDebouncedAutoSave(300);
                                }}
                                style={{
                                  width: '100%',
                                  accentColor: sub.color,
                                  height: '3.5px',
                                  borderRadius: '2px',
                                  cursor: 'pointer',
                                  background: `linear-gradient(to right, ${sub.color} 0%, ${sub.color} ${sub.value}%, #e2e8f0 ${sub.value}%, #e2e8f0 100%)`,
                                  WebkitAppearance: 'none',
                                  outline: 'none',
                                  padding: '6px 0'
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
                              setActiveSongSkills(prev => prev.map(s => s.id === selectedActiveSongId ? { ...s, progress_percent: 100, is_stage_ready: true } : s));
                              localStorage.setItem(`song_skills_detail_${student.id}_${selectedActiveSongId}`, JSON.stringify({
                                rhythm: 100,
                                finger: 100,
                                expression: 100
                              }));

                              if (selectedActiveSongId) {
                                const skill = activeSongSkills.find(s => s.id === selectedActiveSongId);
                                const songTitle = skill?.songs?.title || skill?.title || skill?.song_title || 'Unbenannter Song';
                                const songArtist = skill?.songs?.artist || skill?.artist || '';
                                const songTopic = songArtist ? `${songArtist} – ${songTitle}` : songTitle;
                                awardSticker('song-master', songTopic);
                              }
                              triggerDebouncedAutoSave(100);
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
                        const songTitle = skill?.songs?.title || skill?.title || skill?.song_title || '';
                        const songArtist = skill?.songs?.artist || skill?.artist || '';
                        const songTopic = songArtist ? `${songArtist} – ${songTitle}` : songTitle;
                        const songMasterInfo = collectedStickers['song-master'];
                        const isSongMasterStickerAwarded = songTopic && songMasterInfo?.details.some(
                          d => d.topic.toLowerCase().trim() === songTopic.toLowerCase().trim()
                        );
                        
                        if ((songProgressPercent === 100 || status === 'MASTERED') && songTopic && !isSongMasterStickerAwarded) {
                          return (
                            <button
                              type="button"
                              onClick={() => awardSticker('song-master', songTopic)}
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
                              <span>🏆 Song-Master Sticker erhalten ({songTopic})</span>
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
                <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px 24px', paddingBottom: '16px', overflowY: 'auto' }}>
                
                {hubTab === 'modules' ? (
                  /* ========================================================================= */
                  /* TAB 1: 🎧 MODULE (Kompaktes Apple Music / Spotify 7er-Raster)             */
                  /* ========================================================================= */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }} className="animation-fade-in">
                    {(() => {
                      const activeModulesCount = uiLevel === 'junior' ? 3 : (uiLevel === 'teen' ? 5 : 6);

                      return (
                        <>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <span style={{ fontSize: '0.82rem', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Sliders size={15} style={{ color: '#34a853' }} />
                                <span>Campus Studio Module</span>
                              </span>
                              <p style={{ margin: '2px 0 0 0', fontSize: '0.74rem', color: '#64748b', fontWeight: 550 }}>
                                Interaktive Werkzeuge für deinen Unterricht &amp; deine Übe-Sessions
                              </p>
                            </div>
                            <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#15803d', background: '#e6f4ea', border: '1px solid #bbf7d0', padding: '2px 8px', borderRadius: '100px' }}>
                              {activeModulesCount} Module aktiv
                            </span>
                          </div>

                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(3, 1fr)',
                            gap: '14px 12px',
                            padding: '2px 0 12px 0'
                          }}>
                            {/* 1. Protokoll (Ausgeblendet für Junior Schüler für maximale Übersicht & Fokus) */}
                            {!(readOnly && uiLevel === 'junior') && (
                              <div
                                onClick={() => {
                                  setHubTab('protocol');
                                }}
                                style={{
                                  background: '#ffffff',
                                  border: '1.5px solid #e2e8f0',
                                  borderRadius: '16px',
                                  padding: '14px 8px 12px 8px',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  textAlign: 'center',
                                  cursor: 'pointer',
                                  boxShadow: '0 2px 8px -2px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)',
                                  transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)'
                                }}
                                className="hover-scale"
                              >
                                <div style={{
                                  width: '62px',
                                  height: '62px',
                                  borderRadius: '14px',
                                  background: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
                                  boxShadow: '0 6px 14px -2px rgba(16, 185, 129, 0.40)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  position: 'relative',
                                  overflow: 'hidden',
                                  border: '1px solid rgba(255, 255, 255, 0.25)'
                                }}>
                                  <BookOpen size={30} color="#ffffff" strokeWidth={2.3} style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.25))' }} />
                                </div>
                                <div style={{ marginTop: '8px', padding: '0 2px' }}>
                                  <div style={{ fontSize: '0.86rem', fontWeight: 850, color: '#0f172a', letterSpacing: '-0.02em', lineHeight: '1.2' }}>
                                    Protokoll
                                  </div>
                                  <div style={{ fontSize: '0.70rem', fontWeight: 600, color: '#64748b', marginTop: '2px', lineHeight: '1.3' }}>
                                    Lehrwerke &amp; Stücke
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* 2. Loopstation (Nur Teen & Pro) */}
                            {uiLevel !== 'junior' && (
                              <div
                                onClick={() => {
                                  setActiveModalTab('document');
                                  setActiveViewMode('loopstation');
                                  setActiveSubView('hub');
                                }}
                                style={{
                                  background: '#ffffff',
                                  border: '1.5px solid #e2e8f0',
                                  borderRadius: '16px',
                                  padding: '14px 8px 12px 8px',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  textAlign: 'center',
                                  cursor: 'pointer',
                                  boxShadow: '0 2px 8px -2px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)',
                                  transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)'
                                }}
                                className="hover-scale"
                              >
                                <div style={{
                                  width: '62px',
                                  height: '62px',
                                  borderRadius: '14px',
                                  background: 'linear-gradient(135deg, #f43f5e 0%, #be123c 100%)',
                                  boxShadow: '0 6px 14px -2px rgba(244, 63, 94, 0.40)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  position: 'relative',
                                  overflow: 'hidden',
                                  border: '1px solid rgba(255, 255, 255, 0.25)'
                                }}>
                                  <Sliders size={30} color="#ffffff" strokeWidth={2.3} style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.25))' }} />
                                </div>
                                <div style={{ marginTop: '8px', padding: '0 2px' }}>
                                  <div style={{ fontSize: '0.86rem', fontWeight: 850, color: '#0f172a', letterSpacing: '-0.02em', lineHeight: '1.2' }}>
                                    Loopstation
                                  </div>
                                  <div style={{ fontSize: '0.70rem', fontWeight: 600, color: '#64748b', marginTop: '2px', lineHeight: '1.3' }}>
                                    Audio-Mehrspur
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* 3. Übe-Begleiter (Für alle) */}
                            <div
                              onClick={() => {
                                setActiveModalTab('document');
                                setActiveViewMode('practice');
                                setActiveSubView('hub');
                              }}
                              style={{
                                background: '#ffffff',
                                border: '1.5px solid #e2e8f0',
                                borderRadius: '16px',
                                padding: '14px 8px 12px 8px',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                textAlign: 'center',
                                cursor: 'pointer',
                                boxShadow: '0 2px 8px -2px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)',
                                transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)'
                              }}
                              className="hover-scale"
                            >
                              <div style={{
                                width: '62px',
                                height: '62px',
                                borderRadius: '14px',
                                background: 'linear-gradient(135deg, #f59e0b 0%, #b45309 100%)',
                                boxShadow: '0 6px 14px -2px rgba(245, 158, 11, 0.40)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                position: 'relative',
                                overflow: 'hidden',
                                border: '1px solid rgba(255, 255, 255, 0.25)'
                              }}>
                                <Clock size={30} color="#ffffff" strokeWidth={2.3} style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.25))' }} />
                              </div>
                              <div style={{ marginTop: '8px', padding: '0 2px' }}>
                                <div style={{ fontSize: '0.86rem', fontWeight: 850, color: '#0f172a', letterSpacing: '-0.02em', lineHeight: '1.2' }}>
                                  Übe-Begleiter
                                </div>
                                <div style={{ fontSize: '0.70rem', fontWeight: 600, color: '#64748b', marginTop: '2px', lineHeight: '1.3' }}>
                                  Fokus &amp; Metronom
                                </div>
                              </div>
                            </div>

                            {/* 4. Aufnahmen (Für alle) */}
                            <div
                              onClick={() => {
                                setActiveModalTab('document');
                                setActiveViewMode('recordings');
                                setActiveSubView('hub');
                              }}
                              style={{
                                background: '#ffffff',
                                border: '1.5px solid #e2e8f0',
                                borderRadius: '16px',
                                padding: '14px 8px 12px 8px',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                textAlign: 'center',
                                cursor: 'pointer',
                                boxShadow: '0 2px 8px -2px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)',
                                transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)'
                              }}
                              className="hover-scale"
                            >
                              <div style={{
                                width: '62px',
                                height: '62px',
                                borderRadius: '14px',
                                background: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
                                boxShadow: '0 6px 14px -2px rgba(99, 102, 241, 0.40)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                position: 'relative',
                                overflow: 'hidden',
                                border: '1px solid rgba(255, 255, 255, 0.25)'
                              }}>
                                <Mic size={30} color="#ffffff" strokeWidth={2.3} style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.25))' }} />
                              </div>
                              <div style={{ marginTop: '8px', padding: '0 2px' }}>
                                <div style={{ fontSize: '0.86rem', fontWeight: 850, color: '#0f172a', letterSpacing: '-0.02em', lineHeight: '1.2' }}>
                                  Aufnahmen
                                </div>
                                <div style={{ fontSize: '0.70rem', fontWeight: 600, color: '#64748b', marginTop: '2px', lineHeight: '1.3' }}>
                                  Unterrichts-Memos
                                </div>
                              </div>
                            </div>

                            {/* 5. Stimmgerät (Für alle) */}
                            <div
                              onClick={() => {
                                setActiveModalTab('document');
                                setActiveViewMode('tuner');
                                setActiveSubView('hub');
                              }}
                              style={{
                                background: '#ffffff',
                                border: '1.5px solid #e2e8f0',
                                borderRadius: '16px',
                                padding: '14px 8px 12px 8px',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                textAlign: 'center',
                                cursor: 'pointer',
                                boxShadow: '0 2px 8px -2px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)',
                                transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)'
                              }}
                              className="hover-scale"
                            >
                              <div style={{
                                width: '62px',
                                height: '62px',
                                borderRadius: '14px',
                                background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
                                boxShadow: '0 6px 14px -2px rgba(6, 182, 212, 0.40)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                position: 'relative',
                                overflow: 'hidden',
                                border: '1px solid rgba(255, 255, 255, 0.25)'
                              }}>
                                <Radio size={30} color="#ffffff" strokeWidth={2.3} style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.25))' }} />
                              </div>
                              <div style={{ marginTop: '8px', padding: '0 2px' }}>
                                <div style={{ fontSize: '0.86rem', fontWeight: 850, color: '#0f172a', letterSpacing: '-0.02em', lineHeight: '1.2' }}>
                                  Stimmgerät
                                </div>
                                <div style={{ fontSize: '0.70rem', fontWeight: 600, color: '#64748b', marginTop: '2px', lineHeight: '1.3' }}>
                                  WebAudio Tuner
                                </div>
                              </div>
                            </div>

                            {/* 6. Skill-Radar (Nur Teen & Pro) */}
                            {uiLevel !== 'junior' && (
                              <div
                                onClick={() => {
                                  setActiveModalTab('skillradar');
                                }}
                                style={{
                                  background: '#ffffff',
                                  border: '1.5px solid #e2e8f0',
                                  borderRadius: '16px',
                                  padding: '14px 8px 12px 8px',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  textAlign: 'center',
                                  cursor: 'pointer',
                                  boxShadow: '0 2px 8px -2px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)',
                                  transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)'
                                }}
                                className="hover-scale"
                              >
                                <div style={{
                                  width: '62px',
                                  height: '62px',
                                  borderRadius: '14px',
                                  background: 'linear-gradient(135deg, #d946ef 0%, #a21caf 100%)',
                                  boxShadow: '0 6px 14px -2px rgba(217, 70, 239, 0.40)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  position: 'relative',
                                  overflow: 'hidden',
                                  border: '1px solid rgba(255, 255, 255, 0.25)'
                                }}>
                                  <Activity size={30} color="#ffffff" strokeWidth={2.3} style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.25))' }} />
                                </div>
                                <div style={{ marginTop: '8px', padding: '0 2px' }}>
                                  <div style={{ fontSize: '0.86rem', fontWeight: 850, color: '#0f172a', letterSpacing: '-0.02em', lineHeight: '1.2' }}>
                                    Skill-Radar
                                  </div>
                                  <div style={{ fontSize: '0.70rem', fontWeight: 600, color: '#64748b', marginTop: '2px', lineHeight: '1.3' }}>
                                    Kompetenz-Profil
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* 7. Archiv (Nur Pro) */}
                            {uiLevel === 'pro' && (
                              <div
                                onClick={() => {
                                  setActiveModalTab('document');
                                  setActiveSubView('history');
                                }}
                                style={{
                                  background: '#ffffff',
                                  border: '1.5px solid #e2e8f0',
                                  borderRadius: '16px',
                                  padding: '14px 8px 12px 8px',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  textAlign: 'center',
                                  cursor: 'pointer',
                                  boxShadow: '0 2px 8px -2px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)',
                                  transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)'
                                }}
                                className="hover-scale"
                              >
                                <div style={{
                                  width: '62px',
                                  height: '62px',
                                  borderRadius: '14px',
                                  background: 'linear-gradient(135deg, #64748b 0%, #334155 100%)',
                                  boxShadow: '0 6px 14px -2px rgba(100, 116, 139, 0.40)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  position: 'relative',
                                  overflow: 'hidden',
                                  border: '1px solid rgba(255, 255, 255, 0.25)'
                                }}>
                                  <History size={30} color="#ffffff" strokeWidth={2.3} style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.25))' }} />
                                </div>
                                <div style={{ marginTop: '8px', padding: '0 2px' }}>
                                  <div style={{ fontSize: '0.86rem', fontWeight: 850, color: '#0f172a', letterSpacing: '-0.02em', lineHeight: '1.2' }}>
                                    Archiv
                                  </div>
                                  <div style={{ fontSize: '0.70rem', fontWeight: 600, color: '#64748b', marginTop: '2px', lineHeight: '1.3' }}>
                                    Historie &amp; Jahre
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                ) : (
                  /* ========================================================================= */
                  /* TAB 2: 📋 PROTOKOLL (Ausschließlich Lehrwerke & Songs)                    */
                  /* ========================================================================= */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }} className="animation-fade-in">
                {/* 1. LEHRWERKE & ÜBUNGEN (Kompakt & minimalistisch, ca. 1/3) */}
                <div>
                  {/* Clean Apple-style Header Row with Quick-Add Action */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', position: 'relative' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <BookOpen size={16} style={{ color: '#34a853' }} />
                      <h3 style={{ margin: 0, fontSize: '0.94rem', fontWeight: 900, color: '#000', letterSpacing: '-0.02em', textTransform: 'uppercase' }}>
                        Lehrwerke & Übungen
                      </h3>
                    </div>

                    {/* Kompakter Apple-Style Header Action Button */}
                    <div style={{ position: 'relative' }}>
                      <button
                        type="button"
                        onClick={() => setShowAssignDropdown(!showAssignDropdown)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          background: '#f0fdf4',
                          border: '1.5px solid #bbf7d0',
                          color: '#15803d',
                          padding: '4px 10px',
                          borderRadius: '100px',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                        className="hover-scale"
                      >
                        <Plus size={12} strokeWidth={3} />
                        <span>Lehrwerk hinzufügen</span>
                      </button>

                      {showAssignDropdown && (
                        <div style={{
                          position: 'absolute',
                          right: 0,
                          top: '32px',
                          background: 'white',
                          border: '1px solid #e8e8ed',
                          borderRadius: '18px',
                          boxShadow: '0 16px 36px rgba(0,0,0,0.16)',
                          zIndex: 100,
                          minWidth: '240px',
                          padding: '8px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 8px', borderBottom: '1px solid #f1f5f9', marginBottom: '4px' }}>
                            <span style={{ fontSize: '0.7rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase' }}>Aus Mediathek wählen</span>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setShowAssignDropdown(false); }}
                              style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '2px' }}
                            >
                              <X size={13} />
                            </button>
                          </div>
                          {globalLehrwerke
                            .filter(g => !assignedLehrwerke.some(a => String(a.lehrwerkId) === String(g.id)))
                            .map(g => (
                              <button
                                key={g.id}
                                type="button"
                                onClick={() => {
                                  handleAssignLehrwerk(g.id);
                                  setShowAssignDropdown(false);
                                }}
                                style={{
                                  border: 'none',
                                  background: 'transparent',
                                  padding: '8px 10px',
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
                                      width: '18px',
                                      height: '24px',
                                      background: `linear-gradient(135deg, ${bookColor.from}, ${bookColor.to})`,
                                      borderRadius: '3px',
                                      boxShadow: '0 2px 4px rgba(0,0,0,0.12)',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      flexShrink: 0
                                    }}>
                                      <BookOpen size={9} color={bookColor.text} />
                                    </div>
                                  );
                                })()}
                                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{g.title}</span>
                              </button>
                            ))
                          }
                          {globalLehrwerke.filter(g => !assignedLehrwerke.some(a => String(a.lehrwerkId) === String(g.id))).length === 0 && (
                            <span style={{ fontSize: '0.72rem', color: '#7d7d82', padding: '6px 8px', textAlign: 'center', fontStyle: 'italic' }}>
                              Alle Mediathek-Bücher zugewiesen
                            </span>
                          )}
                          <div style={{ borderTop: '1px solid #e8e8ed', margin: '4px 0' }} />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowCreateLehrwerkModal(true);
                              setShowAssignDropdown(false);
                            }}
                            style={{
                              border: 'none',
                              background: '#34a853',
                              color: 'white',
                              padding: '8px 12px',
                              borderRadius: '10px',
                              fontSize: '0.75rem',
                              fontWeight: 800,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                              boxShadow: '0 2px 6px rgba(52, 168, 83, 0.2)'
                            }}
                            className="hover-scale-mini"
                          >
                            <Plus size={14} /> Eigenes Lehrwerk neu anlegen
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {showCreateLehrwerkModal && (
                    <form onSubmit={handleCreateAndAssignLehrwerk} style={{
                      background: '#f8fafc',
                      border: '1.5px solid #e2e8f0',
                      borderRadius: '16px',
                      padding: '12px',
                      marginBottom: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      boxShadow: '0 4px 14px rgba(0,0,0,0.04)'
                    }} className="animation-slide-up">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: '0.74rem', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <BookOpen size={13} style={{ color: '#34a853' }} />
                          <span>Eigenes Lehrwerk erstellen</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowCreateLehrwerkModal(false)}
                          style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: '2px' }}
                        >
                          <X size={13} />
                        </button>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <input
                          type="text"
                          placeholder="Buchtitel (z.B. Mein Gitarrenbuch 2026)..."
                          value={newLehrwerkTitle}
                          onChange={(e) => setNewLehrwerkTitle(e.target.value)}
                          style={{
                            flex: 2,
                            minWidth: '160px',
                            padding: '6px 10px',
                            borderRadius: '8px',
                            border: '1px solid #cbd5e1',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            outline: 'none'
                          }}
                          autoFocus
                        />
                        <input
                          type="number"
                          placeholder="Seiten (z.B. 50)"
                          value={newLehrwerkPages}
                          onChange={(e) => setNewLehrwerkPages(e.target.value)}
                          style={{
                            width: '80px',
                            padding: '6px 10px',
                            borderRadius: '8px',
                            border: '1px solid #cbd5e1',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            outline: 'none'
                          }}
                          min="1"
                          max="500"
                        />
                        <button
                          type="submit"
                          disabled={newLehrwerkLoading || !newLehrwerkTitle.trim()}
                          style={{
                            background: '#34a853',
                            color: 'white',
                            border: 'none',
                            padding: '6px 12px',
                            borderRadius: '8px',
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            cursor: newLehrwerkTitle.trim() ? 'pointer' : 'not-allowed',
                            opacity: newLehrwerkTitle.trim() ? 1 : 0.6,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          {newLehrwerkLoading ? 'Erstelle...' : 'Speichern & Aktivieren'}
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Horizontal Scroll-Container - Kompakt & Minimalistisch */}
                  <div 
                    className="custom-horizontal-scrollbar"
                    style={{
                      display: 'flex',
                      flexDirection: 'row',
                      gap: '10px',
                      overflowX: 'auto',
                      paddingBottom: '8px',
                      scrollSnapType: 'x mandatory',
                      WebkitOverflowScrolling: 'touch',
                      scrollbarWidth: 'thin',
                      scrollbarColor: '#cbd5e1 #f8fafc'
                    }}
                  >
                    {/* 1. Kompakte Quick-Add Card GANZ VORNE (LINKS) */}
                    <div
                      onClick={() => setShowAssignDropdown(!showAssignDropdown)}
                      style={{
                        flex: '0 0 auto',
                        width: sortedAssignedLehrwerke.length === 0 ? '140px' : '122px',
                        scrollSnapAlign: 'start',
                        background: 'rgba(248, 250, 252, 0.7)',
                        borderRadius: '18px',
                        border: '1.5px dashed #cbd5e1',
                        padding: '12px 8px',
                        minHeight: '154px',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        textAlign: 'center',
                        transition: 'all 0.2s',
                        boxSizing: 'border-box'
                      }}
                      className="hover-scale"
                    >
                      <div style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '50%',
                        background: '#ffffff',
                        border: '1.5px solid #e2e8f0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#34a853',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                      }}>
                        <Plus size={18} strokeWidth={2.5} />
                      </div>
                      <div>
                        <div style={{ fontSize: '0.80rem', fontWeight: 900, color: '#0f172a' }}>Lehrwerk</div>
                        <div style={{ fontSize: '0.67rem', fontWeight: 700, color: '#64748b', marginTop: '1px' }}>+ Hinzufügen</div>
                      </div>
                    </div>

                    {sortedAssignedLehrwerke.map(assigned => {
                      const book = globalLehrwerke.find(g => g.id === assigned.lehrwerkId) || {
                        title: assigned.bookTitle || assigned.lehrwerkTitle || 'Lehrwerk',
                        emoji: '📚',
                        totalPages: assigned.totalPages || 50
                      };
                      const bookColor = getLehrwerkColor(book.title);
                      const total = book.totalPages || 50;
                      const worked = Object.values(assigned.pageStates || {}).filter((p: any) => p.status === 'mastered').length;
                      const pct = Math.min(100, Math.round((worked / total) * 100));
                      const isSelected = activeLehrwerkId === assigned.lehrwerkId && activeSubView === 'lehrwerk';

                      return (
                        <div
                          key={assigned.lehrwerkId}
                          onClick={() => selectTextbookPage(assigned.lehrwerkId, activePageNumber || 1)}
                          style={{
                            flex: '0 0 auto',
                            width: '136px',
                            scrollSnapAlign: 'start',
                            background: '#ffffff',
                            borderRadius: '18px',
                            border: isSelected ? '2px solid #34a853' : '1px solid #e8e8ed',
                            boxShadow: isSelected ? '0 6px 18px rgba(52, 168, 83, 0.16)' : '0 2px 8px rgba(0,0,0,0.03)',
                            padding: '10px',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            gap: '8px',
                            position: 'relative',
                            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                            boxSizing: 'border-box'
                          }}
                          className="hover-scale"
                        >
                          {/* Book Showcase Area with realistic 3D portrait book */}
                          <div style={{
                            width: '100%',
                            height: '96px',
                            background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
                            borderRadius: '12px',
                            position: 'relative',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden'
                          }}>
                            {/* Realistic Portrait Book */}
                            <div style={{
                              width: '58px',
                              height: '78px',
                              background: `linear-gradient(135deg, ${bookColor.from} 0%, ${bookColor.to} 100%)`,
                              borderRadius: '4px 7px 7px 4px',
                              boxShadow: '2px 4px 12px rgba(0,0,0,0.16), inset -1.5px 0 3px rgba(0,0,0,0.08)',
                              position: 'relative',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '5px',
                              padding: '5px'
                            }}>
                              {/* Spine groove on left */}
                              <div style={{
                                position: 'absolute',
                                left: 0,
                                top: 0,
                                bottom: 0,
                                width: '5px',
                                background: 'rgba(0,0,0,0.18)',
                                borderRight: '1px solid rgba(255,255,255,0.25)',
                                borderRadius: '4px 0 0 4px'
                              }} />

                              {/* Realistic page edges on right */}
                              <div style={{
                                position: 'absolute',
                                right: '-2.5px',
                                top: '2.5px',
                                bottom: '2.5px',
                                width: '2.5px',
                                background: '#ffffff',
                                border: '1px solid #cbd5e1',
                                borderRadius: '0 1.5px 1.5px 0'
                              }} />

                              {/* Book Icon Capsule */}
                              <div style={{
                                width: '26px',
                                height: '26px',
                                borderRadius: '50%',
                                background: 'rgba(255, 255, 255, 0.25)',
                                backdropFilter: 'blur(4px)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 1px 4px rgba(0,0,0,0.08)'
                              }}>
                                <BookOpen size={13} color={bookColor.text || '#ffffff'} />
                              </div>

                              {/* Mini Book Title on Cover */}
                              <span style={{
                                fontSize: '0.56rem',
                                fontWeight: 900,
                                color: bookColor.text || '#ffffff',
                                textAlign: 'center',
                                lineHeight: 1.15,
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                                textShadow: '0 1px 2px rgba(0,0,0,0.15)'
                              }}>
                                {book.title}
                              </span>
                            </div>

                            {/* Top-Right Pill: % gemeistert */}
                            <div style={{
                              position: 'absolute',
                              top: '5px',
                              right: '5px',
                              background: pct > 0 ? '#34a853' : 'rgba(0,0,0,0.4)',
                              backdropFilter: 'blur(6px)',
                              color: '#ffffff',
                              fontSize: '0.60rem',
                              fontWeight: 900,
                              padding: '2px 6px',
                              borderRadius: '100px',
                              boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
                              zIndex: 5
                            }}>
                              {pct}%
                            </div>

                            {/* Delete Button top left if removable */}
                            {(!readOnly || assigned.lehrwerkId?.startsWith('custom-') || book.is_custom || assigned.isStudentCreated) && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveLehrwerk(assigned.lehrwerkId, e);
                                }}
                                style={{
                                  position: 'absolute',
                                  top: '5px',
                                  left: '5px',
                                  background: 'rgba(255, 255, 255, 0.92)',
                                  border: 'none',
                                  color: '#ef4444',
                                  cursor: 'pointer',
                                  width: '20px',
                                  height: '20px',
                                  borderRadius: '50%',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
                                  transition: 'all 0.2s',
                                  zIndex: 10
                                }}
                                title="Lehrwerk entfernen"
                              >
                                <X size={11} strokeWidth={2.5} />
                              </button>
                            )}
                          </div>

                          {/* Card Info Below */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            <h4 style={{
                              margin: 0,
                              fontSize: '0.82rem',
                              fontWeight: 900,
                              color: '#0f172a',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              fontFamily: "'Plus Jakarta Sans', sans-serif"
                            }}>
                              {book.title}
                            </h4>

                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.67rem', color: '#64748b', fontWeight: 700 }}>
                              <span>{total} S.</span>
                              <span style={{ color: worked > 0 ? '#34a853' : '#94a3b8', fontWeight: 800 }}>{worked} gem.</span>
                            </div>

                            {/* Subtle Progress Bar */}
                            <div style={{ width: '100%', height: '3.5px', background: '#f1f5f9', borderRadius: '2px', overflow: 'hidden', marginTop: '3px' }}>
                              <div style={{ width: `${pct}%`, height: '100%', background: '#34a853', transition: 'width 0.3s ease' }} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div style={{ borderTop: '1px solid #f1f5f9', margin: '2px 0' }} />
                
                {/* 2. AKTIVE SONG-PROJEKTE (Nimmt ca. 2/3 des Raums ein, sortiert nach Fortschritt absteigend) */}
                <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                  {/* Header Row mit Quick-Add Button */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', position: 'relative' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Music size={16} style={{ color: '#000' }} />
                      <h3 style={{ margin: 0, fontSize: '0.94rem', fontWeight: 900, color: '#000', letterSpacing: '-0.02em', textTransform: 'uppercase' }}>
                        Aktive Song-Projekte
                      </h3>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowCreateSongModal(!showCreateSongModal)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        background: '#f0fdf4',
                        border: '1.5px solid #bbf7d0',
                        color: '#15803d',
                        padding: '4px 10px',
                        borderRadius: '100px',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                      className="hover-scale"
                    >
                      <Plus size={12} strokeWidth={3} />
                      <span>Song anlegen</span>
                    </button>
                  </div>

                  {(() => {
                      const activeSongsRaw = (activeSongSkills || []).filter(skill =>
                        !skill.is_stage_ready && (skill.progress_percent || 0) < 100 && skill.status !== 'MASTERED'
                      );

                      // Deduplicate active songs so each unique song is only listed once
                      const uniqueActiveMap = new Map<string, any>();
                      activeSongsRaw.forEach(skill => {
                        const key = String(skill.song_id || skill.songs?.id || skill.songs?.title || skill.title || skill.id);
                        const existing = uniqueActiveMap.get(key);
                        if (!existing || (skill.progress_percent || 0) > (existing.progress_percent || 0)) {
                          uniqueActiveMap.set(key, skill);
                        }
                      });

                      // Sortierung: Höchster prozentualer Fortschritt oben, niedrigster unten
                      const activeSongs = Array.from(uniqueActiveMap.values()).sort((a, b) => {
                        const pA = a.is_stage_ready ? 100 : (a.progress_percent || 0);
                        const pB = b.is_stage_ready ? 100 : (b.progress_percent || 0);
                        if (pB !== pA) return pB - pA;
                        const titleA = (a.songs?.title || a.title || a.song_title || '').toLowerCase();
                        const titleB = (b.songs?.title || b.title || b.song_title || '').toLowerCase();
                        return titleA.localeCompare(titleB);
                      });

                      if (activeSongs.length === 0) {
                        return (
                          <div
                            onClick={() => setShowCreateSongModal(true)}
                            style={{
                              background: 'rgba(248, 250, 252, 0.7)',
                              borderRadius: '16px',
                              border: '2px dashed #cbd5e1',
                              padding: '20px 16px',
                              cursor: 'pointer',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                              textAlign: 'center',
                              transition: 'all 0.2s',
                              flex: 1
                            }}
                            className="hover-scale"
                          >
                            <div style={{
                              width: '34px',
                              height: '34px',
                              borderRadius: '50%',
                              background: '#ffffff',
                              border: '1.5px solid #e2e8f0',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#34a853',
                              boxShadow: '0 2px 6px rgba(0,0,0,0.04)'
                            }}>
                              <Plus size={16} strokeWidth={2.5} />
                            </div>
                            <div>
                              <div style={{ fontSize: '0.80rem', fontWeight: 900, color: '#0f172a' }}>Noch kein aktives Song-Projekt</div>
                              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b', marginTop: '2px' }}>+ Klicke hier, um deinen ersten Song anzulegen</div>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                          flex: 1,
                          overflowY: 'auto',
                          paddingRight: '2px'
                        }}>
                          {activeSongs.map(skill => {
                            const progress = skill.is_stage_ready ? 100 : (skill.progress_percent || 0);
                            const songTitle = skill.songs?.title || skill.title || skill.song_title || 'Unbenannter Song';
                            const songArtist = skill.songs?.artist || skill.artist || 'Song-Projekt';
                            const songColor = getSongColor(songTitle);
                            const isSelected = selectedActiveSongId === skill.id && activeSubView === 'song';

                            return (
                              <div
                                key={skill.id}
                                onClick={() => selectActiveSong(skill)}
                                style={{
                                  background: isSelected ? 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)' : '#ffffff',
                                  borderRadius: '14px',
                                  border: isSelected ? '1.5px solid #34a853' : '1px solid #e8e8ed',
                                  boxShadow: isSelected ? '0 4px 14px rgba(52, 168, 83, 0.15)' : '0 2px 6px rgba(0,0,0,0.02)',
                                  padding: '8px 12px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  gap: '12px',
                                  transition: 'all 0.16s ease'
                                }}
                                className="hover-scale"
                              >
                                {/* Left: Miniatur Cover & Typography */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                                  {/* 34x34 Miniatur Vinyl/Album Icon */}
                                  <div style={{
                                    width: '34px',
                                    height: '34px',
                                    borderRadius: '10px',
                                    background: `linear-gradient(135deg, ${songColor.from}, ${songColor.to})`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: songColor.text || '#ffffff',
                                    flexShrink: 0,
                                    boxShadow: '0 2px 6px rgba(0,0,0,0.12)'
                                  }}>
                                    <Music size={15} strokeWidth={2.4} />
                                  </div>

                                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <span style={{
                                        fontSize: '0.84rem',
                                        fontWeight: 900,
                                        color: '#0f172a',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis'
                                      }}>
                                        {songTitle}
                                      </span>
                                      {skill.songs?.teacher_id || skill.created_by_teacher ? (
                                        <span style={{
                                          fontSize: '0.58rem',
                                          fontWeight: 850,
                                          color: '#15803d',
                                          background: '#dcfce7',
                                          padding: '1px 5px',
                                          borderRadius: '4px',
                                          flexShrink: 0
                                        }}>
                                          Lehrer
                                        </span>
                                      ) : null}
                                    </div>
                                    <span style={{
                                      fontSize: '0.68rem',
                                      color: '#64748b',
                                      fontWeight: 650,
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis'
                                    }}>
                                      {songArtist}
                                    </span>
                                  </div>
                                </div>

                                {/* Right: Progress Pill & Delete Button */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                                  {progressItems.some(item => isSongMatch(item, skill) && item.is_current_homework) && (
                                    <span style={{
                                      fontSize: '0.62rem',
                                      fontWeight: 850,
                                      color: '#b45309',
                                      background: '#fef3c7',
                                      border: '1px solid #fde68a',
                                      padding: '2px 7px',
                                      borderRadius: '6px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '3px'
                                    }}>
                                      <span>📌</span>
                                      <span>Hausaufgabe</span>
                                    </span>
                                  )}

                                  <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    background: progress >= 100 ? '#dcfce7' : '#f1f5f9',
                                    color: progress >= 100 ? '#15803d' : '#475569',
                                    padding: '2px 8px',
                                    borderRadius: '100px',
                                    fontSize: '0.68rem',
                                    fontWeight: 900,
                                    border: progress >= 100 ? '1px solid #bbf7d0' : '1px solid #e2e8f0'
                                  }}>
                                    <span>{progress}%</span>
                                  </div>

                                  {!readOnly && (skill.songs?.teacher_id || skill.created_by_teacher) && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleRemoveSong(skill.id, e);
                                      }}
                                      style={{
                                        background: 'none',
                                        border: 'none',
                                        color: '#94a3b8',
                                        cursor: 'pointer',
                                        padding: '3px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        borderRadius: '50%'
                                      }}
                                      className="hover-scale"
                                      title="Song entfernen"
                                    >
                                      <X size={13} />
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                </div>

                {/* SaaS Enterprise+ Song Selection & Creation Modal */}
                {showCreateSongModal && (
                  <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(15, 23, 42, 0.55)',
                    backdropFilter: 'blur(8px)',
                    zIndex: 1000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px'
                  }} onClick={() => setShowCreateSongModal(false)}>
                    <div style={{
                      background: '#ffffff',
                      borderRadius: '24px',
                      boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.3)',
                      border: '1px solid rgba(0,0,0,0.08)',
                      width: '100%',
                      maxWidth: '480px',
                      display: 'flex',
                      flexDirection: 'column',
                      overflow: 'hidden'
                    }} onClick={(e) => e.stopPropagation()}>
                      
                      {/* Modal Header */}
                      <div style={{
                        padding: '18px 24px',
                        borderBottom: '1px solid #f1f5f9',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: '#fafafa'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '10px',
                            background: 'rgba(52, 168, 83, 0.1)',
                            color: '#34a853',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <Music size={18} />
                          </div>
                          <div>
                            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 900, color: '#0f172a' }}>Song hinzufügen</h3>
                            <p style={{ margin: 0, fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Aus Schulkatalog wählen oder eigenen Song anlegen</p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setShowCreateSongModal(false)}
                          style={{
                            background: '#f1f5f9',
                            border: 'none',
                            borderRadius: '50%',
                            width: '32px',
                            height: '32px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            color: '#64748b'
                          }}
                        >
                          <X size={16} />
                        </button>
                      </div>

                      {/* Segmented Control / Tabs */}
                      <div style={{ padding: '16px 24px 8px 24px' }}>
                        <div style={{
                          background: '#f1f5f9',
                          borderRadius: '14px',
                          padding: '4px',
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: '4px'
                        }}>
                          <button
                            type="button"
                            onClick={() => setSongModalTab('catalog')}
                            style={{
                              border: 'none',
                              padding: '8px 12px',
                              borderRadius: '10px',
                              fontSize: '0.78rem',
                              fontWeight: 850,
                              cursor: 'pointer',
                              background: songModalTab === 'catalog' ? '#ffffff' : 'transparent',
                              color: songModalTab === 'catalog' ? '#0f172a' : '#64748b',
                              boxShadow: songModalTab === 'catalog' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            📚 Schulkatalog
                          </button>
                          <button
                            type="button"
                            onClick={() => setSongModalTab('create')}
                            style={{
                              border: 'none',
                              padding: '8px 12px',
                              borderRadius: '10px',
                              fontSize: '0.78rem',
                              fontWeight: 850,
                              cursor: 'pointer',
                              background: songModalTab === 'create' ? '#ffffff' : 'transparent',
                              color: songModalTab === 'create' ? '#0f172a' : '#64748b',
                              boxShadow: songModalTab === 'create' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            ✨ Neu erstellen
                          </button>
                        </div>
                      </div>

                      {/* Modal Body */}
                      <div style={{ padding: '12px 24px 24px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {songModalTab === 'catalog' ? (
                          <>
                            <div style={{ position: 'relative' }}>
                              <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                              <input
                                type="text"
                                placeholder="Song oder Künstler suchen..."
                                value={songSearch}
                                onChange={(e) => setSongSearch(e.target.value)}
                                style={{
                                  width: '100%',
                                  padding: '10px 14px 10px 36px',
                                  borderRadius: '12px',
                                  border: '1.5px solid #e2e8f0',
                                  fontSize: '0.85rem',
                                  fontWeight: 600,
                                  outline: 'none',
                                  background: '#f8fafc',
                                  boxSizing: 'border-box'
                                }}
                                autoFocus
                              />
                            </div>

                            <div style={{
                              maxHeight: '260px',
                              overflowY: 'auto',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '6px',
                              paddingRight: '4px'
                            }}>
                              {(() => {
                                const filtered = songs.filter(s => {
                                  const t = (s.title || '').toLowerCase().trim();
                                  if (t === 'test' || t === 'test - test' || t === 'test-test') return false;
                                  if (!songSearch.trim()) return true;
                                  return (s.title || '').toLowerCase().includes(songSearch.toLowerCase()) || 
                                         (s.artist || '').toLowerCase().includes(songSearch.toLowerCase());
                                });

                                if (filtered.length === 0) {
                                  return (
                                    <div style={{ padding: '30px 16px', textAlign: 'center', color: '#94a3b8', fontSize: '0.82rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                      <span>Kein passender Song im Katalog gefunden.</span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setNewSongTitle(songSearch);
                                          setSongModalTab('create');
                                        }}
                                        style={{
                                          background: '#e6f4ea',
                                          color: '#34a853',
                                          border: 'none',
                                          padding: '6px 14px',
                                          borderRadius: '10px',
                                          fontSize: '0.75rem',
                                          fontWeight: 850,
                                          cursor: 'pointer'
                                        }}
                                      >
                                        ✨ "{songSearch}" als neuen Song anlegen
                                      </button>
                                    </div>
                                  );
                                }

                                return filtered.map((song) => (
                                  <div
                                    key={song.id}
                                    onClick={() => {
                                      handleAssignSongFromCatalog(song.id);
                                      setShowCreateSongModal(false);
                                      setSongSearch('');
                                    }}
                                    style={{
                                      padding: '10px 14px',
                                      borderRadius: '14px',
                                      border: '1.5px solid #f1f5f9',
                                      background: '#ffffff',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      transition: 'all 0.15s ease'
                                    }}
                                    className="hover-scale"
                                  >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                      <div style={{
                                        width: '32px',
                                        height: '32px',
                                        borderRadius: '8px',
                                        background: 'linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0
                                      }}>
                                        <Music size={14} color="#475569" />
                                      </div>
                                      <div>
                                        <div style={{ fontWeight: 900, fontSize: '0.85rem', color: '#0f172a' }}>{song.title}</div>
                                        <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 650 }}>{song.artist || 'Unbekannter Künstler'}</div>
                                      </div>
                                    </div>

                                    <button
                                      type="button"
                                      style={{
                                        background: '#34a853',
                                        color: 'white',
                                        border: 'none',
                                        padding: '6px 12px',
                                        borderRadius: '10px',
                                        fontSize: '0.72rem',
                                        fontWeight: 900,
                                        cursor: 'pointer'
                                      }}
                                    >
                                      + Hinzufügen
                                    </button>
                                  </div>
                                ));
                              })()}
                            </div>
                          </>
                        ) : (
                          <form onSubmit={(e) => {
                            handleCreateAndAssignSong(e);
                            setShowCreateSongModal(false);
                          }} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#334155' }}>Songtitel</label>
                              <input
                                type="text"
                                placeholder="z. B. Wonderwall..."
                                value={newSongTitle}
                                onChange={(e) => setNewSongTitle(e.target.value)}
                                style={{
                                  width: '100%',
                                  padding: '10px 14px',
                                  borderRadius: '12px',
                                  border: '1.5px solid #e2e8f0',
                                  fontSize: '0.85rem',
                                  fontWeight: 600,
                                  outline: 'none',
                                  background: '#f8fafc',
                                  boxSizing: 'border-box'
                                }}
                                required
                                autoFocus
                              />
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#334155' }}>Künstler / Band</label>
                              <input
                                type="text"
                                placeholder="z. B. Oasis..."
                                value={newSongArtist}
                                onChange={(e) => setNewSongArtist(e.target.value)}
                                style={{
                                  width: '100%',
                                  padding: '10px 14px',
                                  borderRadius: '12px',
                                  border: '1.5px solid #e2e8f0',
                                  fontSize: '0.85rem',
                                  fontWeight: 600,
                                  outline: 'none',
                                  background: '#f8fafc',
                                  boxSizing: 'border-box'
                                }}
                                required
                              />
                            </div>

                            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                              <button
                                type="button"
                                onClick={() => setShowCreateSongModal(false)}
                                style={{
                                  flex: 1,
                                  background: '#f1f5f9',
                                  color: '#64748b',
                                  border: 'none',
                                  borderRadius: '12px',
                                  padding: '10px',
                                  fontSize: '0.8rem',
                                  fontWeight: 800,
                                  cursor: 'pointer'
                                }}
                              >
                                Abbrechen
                              </button>
                              <button
                                type="submit"
                                style={{
                                  flex: 2,
                                  background: '#34a853',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '12px',
                                  padding: '10px',
                                  fontSize: '0.8rem',
                                  fontWeight: 900,
                                  cursor: 'pointer',
                                  boxShadow: '0 4px 12px rgba(52, 168, 83, 0.25)'
                                }}
                              >
                                ✨ Song erstellen & zuweisen
                              </button>
                            </div>
                          </form>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>{/* close inner scrollable div */}

          {/* Meisterwerke, Sticker-Album & Audio-Biografie Buttons - pinned at bottom (Trophy Dock) */}
                <div style={{ padding: '8px 16px 14px 16px', display: 'flex', gap: '8px', borderTop: '1px solid #f1f5f9', background: '#ffffff' }}>
                  <button
                    type="button"
                    onClick={() => setActiveModalTab('logbook')}
                    style={{
                      flex: 1, padding: '10px 6px', borderRadius: '12px', border: 'none',
                      background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', color: 'white', fontWeight: 800, fontSize: '0.76rem', cursor: 'pointer',
                      boxShadow: '0 3px 8px rgba(99, 102, 241, 0.25)',
                      transition: 'all 0.15s ease',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px'
                    }}
                    className="hover-scale"
                  >
                    <Award size={14} />
                    <span style={{ whiteSpace: 'nowrap' }}>Deine Meisterwerke</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setActiveModalTab('stickeralbum'); setActiveSubView('hub'); }}
                    style={{
                      flex: 1, padding: '10px 6px', borderRadius: '12px', border: 'none',
                      background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', color: 'white', fontWeight: 800, fontSize: '0.76rem', cursor: 'pointer',
                      boxShadow: '0 3px 8px rgba(217, 119, 6, 0.25)',
                      transition: 'all 0.15s ease',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px'
                    }}
                    className="hover-scale"
                  >
                    <Star size={14} fill="#fff" />
                    <span style={{ whiteSpace: 'nowrap' }}>
                      {uiLevel === 'junior' ? 'Sticker-Album' : uiLevel === 'teen' ? 'Badges & Trophäen' : 'Meilensteine'}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setActiveModalTab('audiobiography'); setActiveSubView('hub'); }}
                    style={{
                      flex: 1, padding: '10px 6px', borderRadius: '12px', border: 'none',
                      background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)', color: 'white', fontWeight: 800, fontSize: '0.76rem', cursor: 'pointer',
                      boxShadow: '0 3px 8px rgba(16, 185, 129, 0.25)',
                      transition: 'all 0.15s ease',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px'
                    }}
                    className="hover-scale"
                  >
                    <Disc size={14} />
                    <span style={{ whiteSpace: 'nowrap' }}>Audio-Biografie</span>
                  </button>
                </div>
              </>
        )}
      </div>

        {useNotebookLayout && !isMobileView && (
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
            flex: isMobileView ? 'none' : '1 1 0%',
            width: 'auto',
            maxWidth: 'none',
            margin: '0',
            height: isMobileView ? 'auto' : '100%',
            minHeight: '0',
            maxHeight: isMobileView ? 'none' : '100%',
            padding: useNotebookLayout ? (isMobileView ? '16px 16px calc(280px + env(safe-area-inset-bottom, 40px)) 16px' : '24px 24px 24px 60px') : (isMobileView ? '16px 16px calc(280px + env(safe-area-inset-bottom, 40px)) 16px' : '24px'),
            overflowY: isMobileView ? 'visible' : 'auto',
            display: isMobileView ? (mobileProtokollTab === 'homework' ? 'flex' : 'none') : 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start',
            gap: '20px',
            background: useNotebookLayout ? 'white' : '#f8fafc',
            backgroundImage: useNotebookLayout ? 'repeating-linear-gradient(white, white 27px, #e5e0d4 27px, #e5e0d4 28px)' : 'none',
            borderLeft: useNotebookLayout ? 'none' : '1px solid #e4e4e7',
            borderRadius: '0',
            boxShadow: 'none',
            position: 'relative',
            boxSizing: 'border-box'
          }}>
            {useNotebookLayout && !isMobileView && (
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
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><Calendar size={15} style={{ color: '#34a853', verticalAlign: 'middle', marginTop: '-2px' }} /> Details KW {weekNum}</span>
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
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><FileText size={15} style={{ color: '#34a853', verticalAlign: 'middle', marginTop: '-2px' }} /> Hausaufgaben-Bemerkungen</span>
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
                      {!readOnly && (
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
)}
                    </div>
                  </div>
                );
              })()
            ) : activeSubView === 'lehrwerk' && activeLehrwerkId ? (
              // textbook detail notebook view
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeIn 0.25s ease' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '16px', flexWrap: 'wrap' }}>
                  {(() => {
                    const activeBookAssigned = assignedLehrwerke.find(a => a.lehrwerkId === activeLehrwerkId);
                    const isCurrentPageStudentFocused = Boolean(activeBookAssigned?.pageStates?.[activePageNumber || -1]?.studentFocus);
                    const isStudentCreated = Boolean(activeBookAssigned?.isStudentCreated || activeBookAssigned?.createdByRole === 'student');
                    const isStudentViewingTeacherBook = Boolean(readOnly && !isStudentCreated);

                    return (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0, flexWrap: 'wrap' }}>
                          <div style={{
                            width: '18px',
                            height: '18px',
                            borderRadius: '50%',
                            background: status === 'MASTERED' ? 'hsl(130, 65%, 82%)' : (isCurrentHomework ? 'hsl(47, 85%, 84%)' : 'hsl(355, 75%, 84%)'),
                            border: '1.5px solid rgba(0,0,0,0.1)',
                            boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)',
                            flexShrink: 0
                          }} />
                          <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>
                            {activePageNumber ? `Seite ${activePageNumber}` : 'Keine Seite ausgewählt'}
                          </h3>
                          {isCurrentPageStudentFocused && (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              color: '#6d28d9',
                              background: '#f5f3ff',
                              border: '1.5px solid #c4b5fd',
                              padding: '2px 8px',
                              borderRadius: '999px',
                              boxShadow: '0 1px 3px rgba(109, 40, 217, 0.1)'
                            }}>
                              <span>🟣</span>
                              <span>{readOnly ? 'Dein Übe-Fokus' : 'Schüler-Übefokus'}</span>
                            </span>
                          )}
                        </div>

                        {/* Right side controls: If student on teacher-assigned book, show focus toggle; otherwise teacher color buttons */}
                        {isStudentViewingTeacherBook ? (
                          <button
                            type="button"
                            onClick={() => {
                              if (activeLehrwerkId && activePageNumber) {
                                toggleStudentFocusPage(activeLehrwerkId, activePageNumber);
                              }
                            }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '5px 12px',
                              borderRadius: '999px',
                              background: isCurrentPageStudentFocused ? '#f5f3ff' : '#ffffff',
                              border: isCurrentPageStudentFocused ? '2px solid #8b5cf6' : '1.5px solid #cbd5e1',
                              color: isCurrentPageStudentFocused ? '#6d28d9' : '#475569',
                              fontWeight: 800,
                              fontSize: '0.72rem',
                              cursor: 'pointer',
                              boxShadow: isCurrentPageStudentFocused ? '0 0 10px rgba(139, 92, 246, 0.3)' : '0 1px 3px rgba(0,0,0,0.04)',
                              transition: 'all 0.15s ease'
                            }}
                            className="tactile-btn"
                            title={isCurrentPageStudentFocused ? "Übe-Fokus aufheben" : "Als Übe-Fokus markieren (Max. 3)"}
                          >
                            <span style={{
                              width: '10px',
                              height: '10px',
                              borderRadius: '50%',
                              background: '#8b5cf6',
                              display: 'inline-block'
                            }} />
                            <span>{isCurrentPageStudentFocused ? '🟣 Im Übe-Fokus (Klick zum Entfernen)' : '🟣 Als Übe-Fokus markieren'}</span>
                          </button>
                        ) : (
                          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexShrink: 0 }}>
                            {[
                              { mode: 'LOCKED', color: '#fca5a5', label: 'Rot (keine Hausaufgabe)', getActive: () => status === 'IN_PROGRESS' && !isCurrentHomework, action: () => { setStatus('IN_PROGRESS'); setIsCurrentHomework(false); setHasChanges(true); if (activeLehrwerkId && activePageNumber) triggerDirectSave(activeLehrwerkId, activePageNumber, 'IN_PROGRESS', false); } },
                              { mode: 'HOMEWORK', color: '#fde047', label: 'Gelb (Hausaufgabe)', getActive: () => status === 'IN_PROGRESS' && isCurrentHomework, action: () => { setStatus('IN_PROGRESS'); setIsCurrentHomework(true); setHasChanges(true); if (activeLehrwerkId && activePageNumber) triggerDirectSave(activeLehrwerkId, activePageNumber, 'IN_PROGRESS', true); } },
                              { mode: 'MASTERED', color: '#86efac', label: 'Grün (erledigt)', getActive: () => status === 'MASTERED', action: () => { setStatus('MASTERED'); setIsCurrentHomework(false); setHasChanges(true); if (activeLehrwerkId && activePageNumber) triggerDirectSave(activeLehrwerkId, activePageNumber, 'MASTERED', false); } }
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
                                    border: isActive ? '3px solid #0f172a' : '1.5px solid rgba(0,0,0,0.18)',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                                    transform: isActive ? 'scale(1.25)' : 'scale(1)',
                                    outline: 'none',
                                    boxShadow: isActive ? '0 4px 12px rgba(0,0,0,0.2)' : '0 2px 4px rgba(0,0,0,0.06)'
                                  }}
                                  title={b.label}
                                />
                              );
                            })}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>

                {/* textbook page documentation form */}
                <form onSubmit={(e) => handleSave(e, false)} style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '80px' }}>
                  {/* Teacher View: Homework & Notes Editor */}
                  {!readOnly ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                        <label style={{ fontSize: '0.86rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          📝 Hausaufgabe & Notiz für diese Seite:
                        </label>
                        <SpeechDictationButton
                          onTranscript={(text) => {
                            setPageHomeworkNotes(prev => {
                              const trimmed = prev.trim();
                              return trimmed ? `${trimmed}\n${text}` : text;
                            });
                            triggerDebouncedAutoSave();
                          }}
                          title="Diktieren"
                        />
                      </div>
                      <textarea
                        placeholder="Trage hier die Hausaufgabe oder Notizen für diese Seite ein..."
                        value={pageHomeworkNotes}
                        onChange={(e) => {
                          setPageHomeworkNotes(e.target.value);
                          triggerDebouncedAutoSave();
                        }}
                        style={{
                          width: '100%',
                          height: '95px',
                          padding: '12px 14px',
                          borderRadius: '16px',
                          border: '1.5px solid #cbd5e1',
                          fontSize: '0.84rem',
                          fontWeight: 650,
                          lineHeight: '1.45',
                          outline: 'none',
                          resize: 'none',
                          background: '#fefdf8',
                          color: '#1e293b',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.02), inset 0 2px 4px rgba(0,0,0,0.02)',
                          transition: 'all 0.2s ease'
                        }}
                        onFocus={e => {
                          e.currentTarget.style.borderColor = '#34a853';
                          e.currentTarget.style.boxShadow = '0 0 0 3px rgba(19, 115, 51, 0.15)';
                        }}
                        onBlur={e => {
                          e.currentTarget.style.borderColor = '#cbd5e1';
                          e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.02), inset 0 2px 4px rgba(0,0,0,0.02)';
                        }}
                      />
                      
                      {/* Presets Grid */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                        {[
                          { label: '🎯 Ziel-Tempo', text: '🎯 Ziel-Tempo: Metronom schrittweise auf Ziel-Geschwindigkeit steigern.' },
                          { label: '🐢 Langsam & sauber', text: '🐢 Langsam & sauber: Knifflige Takte isoliert im Schnecken-Tempo üben.' },
                          { label: '🔂 3x fehlerfrei', text: '🔂 3x-Regel: Den Übergang 3 Mal hintereinander fehlerfrei wiederholen.' },
                          { label: '🎵 Dynamik', text: '🎵 Dynamik: Auf präzisen Ausdruck und Laut-Leise-Kontraste achten.' }
                        ].map((tpl, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => {
                              const newNotes = pageHomeworkNotes ? `${pageHomeworkNotes}\n${tpl.text}` : tpl.text;
                              setPageHomeworkNotes(newNotes);
                              triggerDebouncedAutoSave();
                            }}
                            style={{
                              background: '#f8fafc',
                              color: '#334155',
                              border: '1.5px solid #e2e8f0',
                              padding: '5px 10px',
                              borderRadius: '99px',
                              fontSize: '0.70rem',
                              fontWeight: 750,
                              cursor: 'pointer',
                              transition: 'all 0.15s'
                            }}
                            className="hover-scale"
                          >
                            {tpl.label}
                          </button>
                        ))}
                      </div>

                      {/* Display Student Note to Teacher if visible */}
                      {studentNotes && !isStudentNotePrivate && (
                        <div style={{
                          marginTop: '12px',
                          background: '#f0fdf4',
                          border: '1.5px solid #86efac',
                          borderRadius: '16px',
                          padding: '12px 16px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px'
                        }}>
                          <div style={{ fontSize: '0.76rem', fontWeight: 900, color: '#166534', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>🧑‍🎓 Schüler-Übenotiz / Rückmeldung vom Schüler:</span>
                          </div>
                          <div style={{ fontSize: '0.84rem', fontWeight: 650, color: '#14532d', whiteSpace: 'pre-wrap' }}>
                            {studentNotes}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Student View: Read-Only Teacher Homework + Student Practice Notes & Tagebuch Widget */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      {(() => {
                        const cleanTeacherNotes = getCleanTeacherHomeworkText(pageHomeworkNotes);
                        if (!cleanTeacherNotes) return null;
                        return (
                          <div style={{
                            background: '#fefdf8',
                            border: '1.5px solid #fde68a',
                            borderRadius: '16px',
                            padding: '14px 16px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px'
                          }}>
                            <div style={{ fontSize: '0.76rem', fontWeight: 900, color: '#b45309', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span>👨‍🏫 Hausaufgabe von deiner Lehrkraft:</span>
                            </div>
                            <div style={{ fontSize: '0.86rem', fontWeight: 650, color: '#1e293b', whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
                              {cleanTeacherNotes}
                            </div>
                          </div>
                        );
                      })()}

                      <div style={{
                        background: '#f8fafc',
                        border: '1.5px solid #cbd5e1',
                        borderRadius: '20px',
                        padding: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                          <label style={{ fontSize: '0.86rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            🧑‍🎓 Meine Übe-Notizen & Fragen an den Lehrer:
                          </label>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <SpeechDictationButton
                              onTranscript={(text) => {
                                setStudentNotes(prev => {
                                  const trimmed = prev.trim();
                                  return trimmed ? `${trimmed}\n${text}` : text;
                                });
                              }}
                              title="Diktieren"
                            />

                            <div style={{ display: 'flex', background: '#e2e8f0', borderRadius: '999px', padding: '2px' }}>
                              <button
                                type="button"
                                onClick={() => setIsStudentNotePrivate(false)}
                                style={{
                                  padding: '4px 10px',
                                  borderRadius: '999px',
                                  fontSize: '0.7rem',
                                  fontWeight: 800,
                                  border: 'none',
                                  cursor: 'pointer',
                                  background: !isStudentNotePrivate ? '#ffffff' : 'transparent',
                                  color: !isStudentNotePrivate ? '#059669' : '#64748b',
                                  boxShadow: !isStudentNotePrivate ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                              >
                                👁️ Für Lehrer sichtbar
                              </button>
                              <button
                                type="button"
                                onClick={() => setIsStudentNotePrivate(true)}
                                style={{
                                  padding: '4px 10px',
                                  borderRadius: '999px',
                                  fontSize: '0.7rem',
                                  fontWeight: 800,
                                  border: 'none',
                                  cursor: 'pointer',
                                  background: isStudentNotePrivate ? '#ffffff' : 'transparent',
                                  color: isStudentNotePrivate ? '#6366f1' : '#64748b',
                                  boxShadow: isStudentNotePrivate ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                              >
                                🔒 Privat (Nur für mich)
                              </button>
                            </div>
                          </div>
                        </div>

                        <textarea
                          placeholder={isStudentNotePrivate ? "Trage hier deine privaten Übe-Notizen ein (nur für dich sichtbar)..." : "Schreibe hier Fragen oder Übe-Notizen für deine nächste Unterrichtsstunde..."}
                          value={studentNotes}
                          onChange={(e) => setStudentNotes(e.target.value)}
                          style={{
                            width: '100%',
                            height: '110px',
                            padding: '14px',
                            borderRadius: '16px',
                            border: '1.5px solid #cbd5e1',
                            fontSize: '0.86rem',
                            fontWeight: 650,
                            lineHeight: '1.5',
                            outline: 'none',
                            resize: 'none',
                            background: '#ffffff',
                            color: '#1e293b',
                            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)',
                            transition: 'all 0.2s ease'
                          }}
                        />

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            💡 Schnell-Textbausteine (Antippen zum Hinzufügen / Entfernen):
                          </span>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {[
                              { 
                                id: 'frage', 
                                label: '❓ Frage im Unterricht', 
                                prefix: '❓ Frage für die nächste Stunde:',
                                getSnippet: () => '❓ Frage für die nächste Stunde: '
                              },
                              { 
                                id: 'takt', 
                                label: '🛑 Takt unklar', 
                                prefix: '🛑 Takt',
                                getSnippet: () => {
                                  const takt = prompt("Welcher Takt ist noch unklar? (z. B. Takt 4)", "Takt 4");
                                  return `🛑 ${takt || 'Takt 4'} bereitet mir noch Schwierigkeiten.`;
                                }
                              },
                              { 
                                id: 'fingersatz', 
                                label: '🖐️ Fingersatz / Haltung', 
                                prefix: '🖐️ Fingersatz',
                                getSnippet: () => '🖐️ Fingersatz & Handhaltung fühlen sich noch ungewohnt an.'
                              },
                              { 
                                id: 'bpm', 
                                label: '🎯 Ziel-BPM erreicht', 
                                prefix: '🎯 Geschafft: Ziel-Tempo auf',
                                getSnippet: () => {
                                  const bpm = prompt("Welches Tempo hast du erreicht? (BPM)", "120");
                                  return `🎯 Geschafft: Ziel-Tempo auf ${bpm || '120'} BPM gesteigert!`;
                                }
                              },
                              { 
                                id: 'metronom', 
                                label: '🥁 Mit Metronom geübt', 
                                prefix: '🥁 Regelmäßig mit Metronom',
                                getSnippet: () => '🥁 Regelmäßig mit Metronom & Begleit-Beat geübt.'
                              },
                              { 
                                id: 'auswendig', 
                                label: '⭐ Auswendig geübt', 
                                prefix: '⭐ Kann den Abschnitt bereits auswendig',
                                getSnippet: () => '⭐ Kann den Abschnitt bereits auswendig spielen.'
                              }
                            ].map((chip) => {
                              const isActive = studentNotes.includes(chip.prefix);
                              return (
                                <button
                                  key={chip.id}
                                  type="button"
                                  onClick={() => {
                                    if (isActive) {
                                      const lines = studentNotes.split('\n').filter(line => !line.includes(chip.prefix));
                                      setStudentNotes(lines.join('\n').trim());
                                    } else {
                                      const snippet = chip.getSnippet();
                                      setStudentNotes(prev => prev ? `${prev.trim()}\n${snippet}` : snippet);
                                    }
                                  }}
                                  style={{
                                    background: isActive ? '#e6f4ea' : '#ffffff',
                                    color: isActive ? '#137333' : '#334155',
                                    border: isActive ? '1.5px solid #34a853' : '1.5px solid #cbd5e1',
                                    padding: '8px 14px',
                                    borderRadius: '12px',
                                    fontSize: '0.78rem',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    boxShadow: isActive ? '0 2px 6px rgba(52, 168, 83, 0.2)' : '0 1px 3px rgba(0,0,0,0.04)',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    transition: 'all 0.15s ease'
                                  }}
                                  className="hover-scale"
                                >
                                  {isActive && <span style={{ color: '#34a853', fontWeight: 900 }}>✓</span>}
                                  <span>{chip.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                    {!readOnly && (
                      <div style={{
                        marginTop: '12px',
                        background: 'rgba(251, 191, 36, 0.05)',
                        border: '1.5px dashed rgba(251, 191, 36, 0.3)',
                        borderRadius: '16px',
                        padding: '14px 16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px'
                      }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span>👁️ Live-Vorschau (im Hausaufgaben-Widget des Schülers):</span>
                        </div>
                        {(() => {
                          const book = globalLehrwerke.find(b => b.id === activeLehrwerkId);
                          const bookColor = getLehrwerkColor(book?.title || '');
                          const assignedBook = assignedLehrwerke.find(a => a.lehrwerkId === activeLehrwerkId);
                          const pageStates = assignedBook?.pageStates || {};

                          // Collect all pages assigned as homework for this book
                          const homeworkPagesSet = new Set<number>();
                          Object.entries(pageStates).forEach(([pNumStr, pState]: [string, any]) => {
                            if (pState?.status === 'homework' || pState?.isCurrentHomework) {
                              const num = parseInt(pNumStr, 10);
                              if (!isNaN(num)) homeworkPagesSet.add(num);
                            }
                          });

                          // Include active page if marked as homework in current form state
                          if (activePageNumber !== null && (isCurrentHomework || status === 'IN_PROGRESS')) {
                            homeworkPagesSet.add(activePageNumber);
                          }

                          const homeworkPagesList = Array.from(homeworkPagesSet).sort((a, b) => a - b);
                          const pagesToRender = homeworkPagesList.length > 0 ? homeworkPagesList : (activePageNumber !== null ? [activePageNumber] : [1]);
                          const formattedPagesStr = formatPageNumbers(pagesToRender);

                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <div style={{ fontSize: '0.88rem', color: '#09090b', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '6px' }}>
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
                                <span>{book?.title || 'Lehrwerk'}</span>
                                {formattedPagesStr && (
                                  <span style={{ color: '#4b5563', fontWeight: 700 }}>· {formattedPagesStr}</span>
                                )}
                              </div>

                              <div style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                background: '#ffffff',
                                color: '#475569',
                                padding: '4px 12px',
                                borderRadius: '999px',
                                fontSize: '0.74rem',
                                fontWeight: 900,
                                border: '1px solid rgba(251, 191, 36, 0.3)',
                                boxShadow: '0 3px 8px rgba(0,0,0,0.03), 0 0 12px rgba(251, 191, 36, 0.2)',
                                alignSelf: 'flex-start'
                              }}>
                                <span>📄 {formattedPagesStr ? formattedPagesStr : `S. ${activePageNumber}`}</span>
                              </div>

                              {/* Stacked notes for all homework pages in this book */}
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '2px' }}>
                                {pagesToRender.map(pNum => {
                                  let pageNoteText = '';
                                  if (pNum === activePageNumber) {
                                    pageNoteText = cleanNotesText(homeworkNotes);
                                  } else {
                                    const savedPageState = pageStates[pNum];
                                    const rawSavedNote = savedPageState?.homeworkNotes || savedPageState?.notes || '';
                                    pageNoteText = cleanNotesText(rawSavedNote);
                                    
                                    if (!pageNoteText) {
                                      // Fallback search in progressItems
                                      const matchProgress = progressItems.find(pi => pi.topic_name === `${book?.title} - Seite ${pNum}`);
                                      if (matchProgress?.homework_notes) {
                                        pageNoteText = cleanNotesText(matchProgress.homework_notes);
                                      }
                                    }
                                  }

                                  return (
                                    <div key={pNum} style={{ 
                                      display: 'flex', 
                                      gap: '6px', 
                                      alignItems: 'flex-start', 
                                      fontSize: '0.75rem', 
                                      color: '#475569', 
                                      lineHeight: '1.4',
                                      background: '#ffffff',
                                      border: pNum === activePageNumber ? '1.5px solid rgba(251, 191, 36, 0.4)' : '1px solid rgba(251, 191, 36, 0.18)',
                                      borderRadius: '12px',
                                      padding: '8px 12px',
                                      boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)'
                                    }}>
                                      <span style={{ fontWeight: 800, color: '#b45309', flexShrink: 0 }}>S. {pNum}:</span>
                                      <span style={{ fontWeight: 650, color: pageNoteText ? '#1e293b' : '#94a3b8', fontStyle: pageNoteText ? 'normal' : 'italic', whiteSpace: 'pre-wrap' }}>
                                        {pageNoteText || 'Keine Hausaufgabe eingetragen'}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}

                  {!readOnly && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                        <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1e293b' }}>
                          🔒 Interne Notiz (nur für Lehrer)
                        </label>
                        <SpeechDictationButton
                          onTranscript={(text) => {
                            setTeacherNotes(prev => {
                              const trimmed = prev.trim();
                              return trimmed ? `${trimmed}\n${text}` : text;
                            });
                            triggerDebouncedAutoSave();
                          }}
                          title="Diktieren"
                        />
                      </div>
                      <textarea
                        placeholder="Interne Bemerkungen..."
                        value={teacherNotes}
                        onChange={(e) => {
                          setTeacherNotes(e.target.value);
                          triggerDebouncedAutoSave();
                        }}
                        style={{
                          width: '100%', height: '50px', padding: '8px 12px', borderRadius: '12px',
                          border: '1px solid #cbd5e1', fontSize: '0.78rem', fontWeight: 600, outline: 'none', resize: 'none', background: 'white'
                        }}
                      />
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '12px', marginTop: '12px', paddingBottom: (isMobileView || isInsideSim || isFullscreen) ? '180px' : '48px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        triggerImmediateAutoSave();
                        setActiveSubView('hub');
                        setActiveLehrwerkId(null);
                        setActivePageNumber(null);
                      }}
                      style={{
                        flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid #cbd5e1',
                        background: 'white', color: '#1e293b', fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.04)'
                      }}
                      className="hover-scale"
                    >
                      <span>← Zurück zur Übersicht</span>
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flexWrap: 'wrap' }}>
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
                          <span style={{
                            fontSize: '0.70rem',
                            fontWeight: 800,
                            color: '#10b981',
                            background: '#ecfdf5',
                            border: '1px solid #d1fae5',
                            padding: '2px 8px',
                            borderRadius: '999px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            flexShrink: 0
                          }}>
                            <Check size={12} strokeWidth={2.5} />
                            <span>Auto-Save aktiv</span>
                          </span>
                        </div>

                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                          {[
                             { mode: 'LOCKED', color: 'hsl(355, 75%, 84%)', label: 'Rot (keine Hausaufgabe)', getActive: () => status === 'IN_PROGRESS' && !isCurrentHomework, action: () => { setStatus('IN_PROGRESS'); setIsCurrentHomework(false); setHasChanges(true); if (selectedActiveSongId) triggerDirectSongSave(selectedActiveSongId, 'IN_PROGRESS', false); } },
                             { mode: 'HOMEWORK', color: 'hsl(47, 85%, 84%)', label: 'Gelb (Hausaufgabe)', getActive: () => status === 'IN_PROGRESS' && isCurrentHomework, action: () => { setStatus('IN_PROGRESS'); setIsCurrentHomework(true); setHasChanges(true); if (selectedActiveSongId) triggerDirectSongSave(selectedActiveSongId, 'IN_PROGRESS', true); } },
                             { mode: 'MASTERED', color: 'hsl(130, 65%, 82%)', label: 'Grün (erledigt)', getActive: () => status === 'MASTERED', action: () => { setStatus('MASTERED'); setIsCurrentHomework(false); setHasChanges(true); if (selectedActiveSongId) triggerDirectSongSave(selectedActiveSongId, 'MASTERED', false); } }
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

                    <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '80px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                          <label style={{ fontSize: '0.86rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            📝 Übungs-Fahrplan & Hausaufgabe:
                          </label>
                          <SpeechDictationButton
                            onTranscript={(text) => {
                              const newNotes = songHomeworkNotes ? `${songHomeworkNotes.trim()}\n${text}` : text;
                              setSongHomeworkNotes(newNotes);
                              setHasChanges(true);
                              if (selectedActiveSongId) {
                                try {
                                  localStorage.setItem(`song_note_${student.id}_${selectedActiveSongId}`, newNotes);
                                } catch (err) {}
                                triggerDebouncedSongSave(newNotes);
                              }
                            }}
                            title="Diktieren"
                          />
                        </div>
                        <textarea
                          placeholder="Passagen, Anschlagstechniken oder Rhythmen eintragen..."
                          value={songHomeworkNotes}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSongHomeworkNotes(val);
                            setHasChanges(true);
                            if (selectedActiveSongId) {
                              try {
                                localStorage.setItem(`song_note_${student.id}_${selectedActiveSongId}`, val);
                              } catch (err) {}
                              triggerDebouncedSongSave(val);
                            }
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
                            e.currentTarget.style.borderColor = 'var(--primary-color, #34a853)';
                            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(52, 168, 83, 0.15)';
                          }}
                          onBlur={e => {
                            e.currentTarget.style.borderColor = '#cbd5e1';
                            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.02), inset 0 2px 4px rgba(0,0,0,0.02)';
                          }}
                        />
                        {/* Schnell-Textbausteine */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                          {[
                            { label: '🐌 Schnecke', text: '• 🐌 Schnecken-Tempo: Schwierige Passage ganz langsam & präzise üben.' },
                            { label: '🔂 Ritter-Drei', text: '• 🔂 Ritter-Drei: Kniffligen Übergang 3x hintereinander fehlerfrei spielen.' },
                            { label: '🎵 Laut-Leise', text: '• 🎵 Dynamik: Auf deutliche Laut-Leise-Unterschiede achten.' },
                            { label: '⏱️ 10-Min.', text: '• ⏱️ Fokus-Timer: 10 Minuten täglich konzentriert wiederholen.' }
                          ].map((tpl, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => {
                                const newNotes = songHomeworkNotes ? `${songHomeworkNotes}\n${tpl.text}` : tpl.text;
                                setSongHomeworkNotes(newNotes);
                                setStatus('IN_PROGRESS');
                                setIsCurrentHomework(true);
                                setHasChanges(true);
                                if (selectedActiveSongId) {
                                  try {
                                    localStorage.setItem(`song_note_${student.id}_${selectedActiveSongId}`, newNotes);
                                  } catch (err) {}
                                  triggerDirectSongSave(selectedActiveSongId, 'IN_PROGRESS', true, newNotes, teacherNotes);
                                }
                              }}
                              style={{
                                background: '#f8fafc',
                                color: '#334155',
                                border: '1.5px solid #e2e8f0',
                                padding: '6px 12px',
                                borderRadius: '99px',
                                fontSize: '0.72rem',
                                fontWeight: 750,
                                cursor: 'pointer',
                                transition: 'all 0.15s'
                              }}
                              className="hover-scale"
                            >
                              {tpl.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {!readOnly && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                            <label style={{ fontSize: '0.86rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              🔒 Interne Notiz (nur für Lehrer):
                            </label>
                            <SpeechDictationButton
                              onTranscript={(text) => {
                                const newNotes = teacherNotes ? `${teacherNotes.trim()}\n${text}` : text;
                                setTeacherNotes(newNotes);
                                setHasChanges(true);
                                if (selectedActiveSongId) {
                                  try {
                                    localStorage.setItem(`song_teacher_note_${student.id}_${selectedActiveSongId}`, newNotes);
                                  } catch (err) {}
                                  triggerDebouncedTeacherNoteSave(newNotes);
                                } else {
                                  triggerDebouncedAutoSave();
                                }
                              }}
                              title="Diktieren"
                            />
                          </div>
                          <textarea
                            placeholder="Interne Bemerkungen..."
                            value={teacherNotes}
                            onChange={(e) => {
                              const val = e.target.value;
                              setTeacherNotes(val);
                              setHasChanges(true);
                              if (selectedActiveSongId) {
                                try {
                                  localStorage.setItem(`song_teacher_note_${student.id}_${selectedActiveSongId}`, val);
                                } catch (err) {}
                                triggerDebouncedTeacherNoteSave(val);
                              } else {
                                triggerDebouncedAutoSave();
                              }
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
                              e.currentTarget.style.borderColor = 'var(--primary-color, #34a853)';
                              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(52, 168, 83, 0.15)';
                            }}
                            onBlur={e => {
                              e.currentTarget.style.borderColor = '#cbd5e1';
                              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.02), inset 0 2px 4px rgba(0,0,0,0.02)';
                            }}
                          />
                        </div>
                      )}

                      {/* SCHÜLER TROPHÄEN- & MEILENSTEIN-PASS (Right Column Trophy Center for Apple Balance) */}
                      {readOnly && (
                        <div style={{
                          background: '#ffffff',
                          border: '1.5px solid #e2e8f0',
                          borderRadius: '24px',
                          padding: '18px 20px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px',
                          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '0.84rem', fontWeight: 900, color: '#09090b', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Sparkles size={16} style={{ color: '#f59e0b' }} />
                              <span>Auszeichnungen & Meilenstein-Pass</span>
                            </span>
                            <span style={{ fontSize: '0.70rem', background: matchHistory.length >= 3 ? '#dcfce7' : '#f1f5f9', color: matchHistory.length >= 3 ? '#15803d' : '#475569', padding: '2px 8px', borderRadius: '99px', fontWeight: 850 }}>
                              {matchHistory.length} von 3 Matches
                            </span>
                          </div>

                          {/* Latest Hologram Sticker if at least 1 match exists */}
                          {matchHistory.length > 0 && (() => {
                            const latest = matchHistory[matchHistory.length - 1];
                            return (
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b' }}>
                                  ✨ Dein neuester Sticker (Match #{matchHistory.length}):
                                </div>
                                <MeisterOhrSticker
                                  matchedAt={latest.matched_at}
                                  teacherPercent={latest.teacher_percent}
                                  studentPercent={latest.student_percent}
                                  xpAmount={latest.xp_amount}
                                  isCompact={false}
                                />
                              </div>
                            );
                          })()}

                          {/* 3 Horizontal Milestone Cards */}
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                            {[0, 1, 2].map((slotIdx) => {
                              const entry = matchHistory[slotIdx];
                              const slotNum = slotIdx + 1;
                              if (entry) {
                                const isGold = entry.tier === 'tier1';
                                const isBlue = entry.tier === 'tier2';
                                return (
                                  <div key={slotIdx} style={{
                                    background: isGold ? 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)' : (isBlue ? 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)' : 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)'),
                                    border: `1.5px solid ${isGold ? '#f59e0b' : (isBlue ? '#38bdf8' : '#c084fc')}`,
                                    borderRadius: '14px',
                                    padding: '10px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '4px',
                                    boxShadow: '0 2px 6px rgba(0,0,0,0.04)'
                                  }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <span style={{ fontSize: '0.66rem', fontWeight: 900, color: '#64748b' }}>
                                        #{slotNum} Match
                                      </span>
                                      <span style={{ fontSize: '0.64rem', fontWeight: 750, color: '#94a3b8' }}>
                                        {new Date(entry.matched_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}
                                      </span>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.74rem', fontWeight: 900, color: '#0f172a' }}>
                                      <span>{isGold ? '🎯' : (isBlue ? '✨' : '🚀')}</span>
                                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {isGold ? 'Meister-Ohr' : (isBlue ? 'Super Gehör' : 'Weiter-Rocker')}
                                      </span>
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px', fontSize: '0.68rem', color: '#475569' }}>
                                      <span>L:{entry.teacher_percent}% • S:{entry.student_percent}%</span>
                                      <span style={{ fontWeight: 900, color: '#16a34a', background: 'rgba(34,197,94,0.12)', padding: '1px 5px', borderRadius: '5px', fontSize: '0.64rem' }}>
                                        +{entry.xp_amount} XP
                                      </span>
                                    </div>
                                  </div>
                                );
                              } else {
                                const isNextSlot = slotIdx === matchHistory.length;
                                return (
                                  <div key={slotIdx} style={{
                                    border: isNextSlot ? '1.5px dashed #94a3b8' : '1.5px dashed #e2e8f0',
                                    background: isNextSlot ? '#f8fafc' : '#ffffff',
                                    borderRadius: '14px',
                                    padding: '10px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    minHeight: '74px',
                                    textAlign: 'center',
                                    gap: '3px'
                                  }}>
                                    <span style={{ fontSize: '0.95rem', opacity: isNextSlot ? 1 : 0.4 }}>
                                      {slotIdx === 0 ? '🌱' : (slotIdx === 1 ? '⚡' : '🏆')}
                                    </span>
                                    <span style={{ fontSize: '0.66rem', fontWeight: 800, color: isNextSlot ? '#475569' : '#94a3b8' }}>
                                      {slotIdx === 0 ? '1. Match' : (slotIdx === 1 ? '2. Match' : '3. Finale')}
                                    </span>
                                    <span style={{ fontSize: '0.60rem', color: isNextSlot ? '#16a34a' : '#cbd5e1', fontWeight: 750 }}>
                                      {isNextSlot ? 'Tipp abgeben 🔒' : 'Gesperrt'}
                                    </span>
                                  </div>
                                );
                              }
                            })}
                          </div>
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: '12px', marginTop: '8px', paddingBottom: (isMobileView || isInsideSim || isFullscreen || isMobileOrSim) ? '180px' : '48px' }}>
                        <button
                          type="button"
                          onClick={() => {
                            handleBackToHub();
                          }}
                          style={{
                            flex: 1,
                            padding: '14px 20px',
                            borderRadius: '16px',
                            border: 'none',
                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                            color: '#ffffff',
                            fontWeight: 800,
                            fontSize: '0.88rem',
                            cursor: 'pointer',
                            boxShadow: '0 4px 14px rgba(16, 185, 129, 0.25)',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px'
                          }}
                          className="hover-scale"
                        >
                          <Check size={18} strokeWidth={2.5} />
                          <span>Fertig & Schließen</span>
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
                    <span style={{ fontSize: '0.84rem', fontWeight: 900, color: '#09090b', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Edit3 size={16} style={{ color: '#0f172a' }} />
                      <span>{readOnly ? 'Hausaufgaben & Wochenplan' : 'Eintrag & Hausaufgabe'}</span>
                    </span>
                    <p style={{ margin: '3px 0 0 0', fontSize: '0.76rem', color: '#71717a', fontWeight: 550, lineHeight: '1.3' }}>
                      {readOnly 
                        ? 'Deine aktuellen Aufgaben, Stücke und Übungsmemos für diese Woche.' 
                        : 'Dokumentiere den heutigen Unterricht für den Schüler.'}
                    </p>
                  </div>
                </div>

                {/* The Main Input Form Card */}
                <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, gap: '16px' }}>
                  <div style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px'
                  }}>
                    <div style={{
                      background: '#f8fafc',
                      border: '1.5px solid #e2e8f0',
                      borderRadius: '24px',
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '14px',
                      boxShadow: '0 2px 12px rgba(0, 0, 0, 0.02)'
                    }}>
                      {/* ========================================================================= */}
                      {/* ZONE 1: MINIMALISTISCHE SCHÜLERVORSCHAU (Hero Card)                      */}
                      {/* ========================================================================= */}
                      <div style={{
                        background: '#ffffff',
                        border: '1px solid rgba(226, 232, 240, 0.9)',
                        borderRadius: '20px',
                        padding: '16px 18px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        boxShadow: '0 8px 24px -4px rgba(0, 0, 0, 0.06), 0 2px 6px -1px rgba(0, 0, 0, 0.03)'
                      }}>
                        {/* ========================================================================= */}
                        {/* HERO CARD CONTENT (100% SSOT: Single Source of Truth for Voice & UI)     */}
                        {/* ========================================================================= */}
                        {(() => {
                          const getTargetWeekIso = (offset: number): string => {
                            if (offset === 0) return getISOWeek();
                            const d = new Date();
                            d.setDate(d.getDate() + (offset * 7));
                            return getISOWeek(d);
                          };

                          const viewingWeekIso = getTargetWeekIso(viewingWeekOffset);
                          const viewingWeekNum = viewingWeekIso.split('-W')[1] || '';
                          const isPastWeek = viewingWeekOffset !== 0;

                          // 1. Deduplicate progress items
                          const uniqueItemsMap = new Map<string, any>();
                          (progressItems || []).forEach(item => {
                            const canonicalKey = getCanonicalSongKey(item);
                            const normTitle = getNormalizedSongTitle(item).toLowerCase();
                            const name = canonicalKey || normTitle || (item.topic_name || '').trim().toLowerCase();
                            if (name && !uniqueItemsMap.has(name)) {
                              uniqueItemsMap.set(name, item);
                            }
                          });
                          const deduplicatedItems = Array.from(uniqueItemsMap.values());

                          const activeHWs = deduplicatedItems.filter(item => {
                            if (item.topic_name && item.topic_name.includes(' - Seite ')) {
                              const parts = item.topic_name.split(' - Seite ');
                              const bookTitle = parts[0].trim();
                              const pageNum = parseInt(parts[1], 10);
                              const book = globalLehrwerke.find(g => g.title === bookTitle);
                              if (book) {
                                const assignment = assignedLehrwerke.find(a => a.lehrwerkId === book.id);
                                const pageState = assignment?.pageStates?.[pageNum];
                                return pageState?.status === 'homework' || pageState?.isCurrentHomework;
                              }
                            }
                            return Boolean(item.is_current_homework) && !item.topic_name?.startsWith('Hausaufgabe KW ');
                          });

                          const activeTheories = deduplicatedItems.filter(item => {
                            if (item.topic_name && item.topic_name.includes(' - Seite ')) {
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
                                   getISOWeek(item.updated_at) === viewingWeekIso &&
                                   !item.topic_name?.startsWith('Hausaufgabe KW ');
                          });

                          const groupedLehrwerke: Record<string, { pages: number[]; notes: string[] }> = {};
                          const otherHWs: any[] = [];
                          
                          // Process assignedLehrwerke page states
                          (assignedLehrwerke || []).forEach(assignment => {
                            const book = globalLehrwerke.find(g => g.id === assignment.lehrwerkId);
                            if (!book || !assignment.pageStates) return;
                            
                            Object.entries(assignment.pageStates).forEach(([pNumStr, pState]: [string, any]) => {
                              if (pState?.status === 'homework' || pState?.isCurrentHomework) {
                                const pageNum = parseInt(pNumStr, 10);
                                if (!isNaN(pageNum)) {
                                  if (!groupedLehrwerke[book.title]) {
                                    groupedLehrwerke[book.title] = { pages: [], notes: [] };
                                  }
                                  if (!groupedLehrwerke[book.title].pages.includes(pageNum)) {
                                    groupedLehrwerke[book.title].pages.push(pageNum);
                                    const cleanNote = getCleanPageNotes(pState.homeworkNotes || pState.homework_notes);
                                    if (cleanNote) {
                                      groupedLehrwerke[book.title].notes.push(`Seite ${pageNum}: ${cleanNote}`);
                                    }
                                  }
                                }
                              }
                            });
                          });

                          const allActive = [...activeHWs, ...activeTheories];
                          allActive.forEach(item => {
                            if (item.topic_name && item.topic_name.includes(' - Seite ')) {
                              const parts = item.topic_name.split(' - Seite ');
                              const bookTitle = parts[0].trim();
                              const book = globalLehrwerke.find(g => g.title === bookTitle);
                              const isBookAssigned = book && assignedLehrwerke.some(a => a.lehrwerkId === book.id);
                              if (!isBookAssigned) return;

                              const pageNum = parseInt(parts[1], 10);
                              if (!groupedLehrwerke[bookTitle]) {
                                groupedLehrwerke[bookTitle] = { pages: [], notes: [] };
                              }
                              if (!isNaN(pageNum) && !groupedLehrwerke[bookTitle].pages.includes(pageNum)) {
                                groupedLehrwerke[bookTitle].pages.push(pageNum);
                                if (item.homework_notes) {
                                  const cleanNote = getCleanPageNotes(item.homework_notes);
                                  if (cleanNote && !groupedLehrwerke[bookTitle].notes.includes(`Seite ${pageNum}: ${cleanNote}`)) {
                                    groupedLehrwerke[bookTitle].notes.push(`Seite ${pageNum}: ${cleanNote}`);
                                  }
                                }
                              }
                            } else {
                              const cleanTopic = getNormalizedSongTitle(item);
                              const canKey = getCanonicalSongKey(item);
                              if (cleanTopic && !otherHWs.some(existing => getCanonicalSongKey(existing) === canKey || getNormalizedSongTitle(existing) === cleanTopic)) {
                                const cachedNote = localStorage.getItem(`song_note_${student.id}_${item.id}`) ||
                                                   localStorage.getItem(`song_note_${student.id}_${item.song_id}`) ||
                                                   item.homework_notes || '';
                                otherHWs.push({
                                  ...item,
                                  homework_notes: cachedNote
                                });
                              }
                            }
                          });

                          // Also check activeSongSkills with localStorage backup for instant sync
                          (activeSongSkills || []).forEach(skill => {
                            const isHwInLs = localStorage.getItem(`song_hw_${student.id}_${skill.id}`) === 'true' ||
                                             localStorage.getItem(`song_hw_${student.id}_${skill.song_id}`) === 'true';
                            if (isHwInLs) {
                              const cleanTopic = getNormalizedSongTitle(skill);
                              const canKey = getCanonicalSongKey(skill);
                              const alreadyExists = otherHWs.some(existing => 
                                getCanonicalSongKey(existing) === canKey || getNormalizedSongTitle(existing) === cleanTopic
                              );
                              if (!alreadyExists) {
                                const songArtist = skill.songs?.artist || skill.artist || '';
                                const songTitle = skill.songs?.title || skill.title || skill.song_title || 'Song';
                                const songInstrument = skill.instrument ? ` (${skill.instrument})` : '';
                                const fullTitle = songArtist ? `${songArtist} - ${songTitle}${songInstrument}` : `${songTitle}${songInstrument}`;
                                const cachedNote = localStorage.getItem(`song_note_${student.id}_${skill.id}`) ||
                                                   localStorage.getItem(`song_note_${student.id}_${skill.song_id}`) || '';
                                otherHWs.push({
                                  id: skill.id,
                                  topic_name: fullTitle,
                                  is_current_homework: true,
                                  status: 'IN_PROGRESS',
                                  homework_notes: cachedNote
                                });
                              }
                            }
                          });
                          
                          const lehrwerkeList = Object.entries(groupedLehrwerke).map(([title, info]) => {
                            info.pages.sort((a: number, b: number) => a - b);
                            return { title, pages: info.pages, notes: info.notes };
                          });

                          const audioNotes = homeworkNotesList
                            .map((note, idx) => ({ note, idx }))
                            .filter(item => item.note.startsWith("AUDIO:"))
                            .map((item, index) => {
                              const parts = item.note.substring(6).split('|');
                              return {
                                url: parts[0],
                                duration: parseInt(parts[1] || '0', 10),
                                label: parts[3] || `Play-Along #${index + 1}`,
                                originalIdx: item.idx,
                                idx: item.idx
                              };
                            });

                          const hasActiveItems = lehrwerkeList.length > 0 || otherHWs.length > 0 || audioNotes.length > 0 || generalHomeworkNotes.trim().length > 0;
                          
                          const currentHour = getSimulatedNow().getHours();
                          const isSilentTime = currentHour >= 20 || currentHour < 7;

                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                              {/* 1. Header Bar with KW Stepper & Enterprise+ TTS Vorlesen */}
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <div style={{
                                    width: '24px',
                                    height: '24px',
                                    borderRadius: '7px',
                                    background: '#34a853',
                                    color: '#ffffff',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: '0 2px 6px rgba(52, 168, 83, 0.25)',
                                    flexShrink: 0
                                  }}>
                                    <Calendar size={13} strokeWidth={2.5} />
                                  </div>

                                  {/* Title with KW Week Navigation Arrows */}
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    <button
                                      type="button"
                                      onClick={() => setViewingWeekOffset(prev => prev - 1)}
                                      title="Vorherige Woche (KW)"
                                      style={{
                                        background: '#f1f5f9',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '7px',
                                        width: '24px',
                                        height: '24px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        color: '#334155',
                                        transition: 'all 0.15s ease'
                                      }}
                                      className="hover-scale-mini"
                                    >
                                      <ChevronLeft size={14} strokeWidth={2.5} />
                                    </button>

                                    <span style={{ fontSize: '0.88rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>
                                      {readOnly ? 'Deine Hausaufgabe' : 'Schülervorschau'} (KW {viewingWeekNum})
                                    </span>

                                    <button
                                      type="button"
                                      onClick={() => setViewingWeekOffset(prev => Math.min(1, prev + 1))}
                                      title="Nächste Woche (KW)"
                                      style={{
                                        background: '#f1f5f9',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '7px',
                                        width: '24px',
                                        height: '24px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        color: '#334155',
                                        transition: 'all 0.15s ease'
                                      }}
                                      className="hover-scale-mini"
                                    >
                                      <ChevronRight size={14} strokeWidth={2.5} />
                                    </button>

                                    {viewingWeekOffset !== 0 && (
                                      <button
                                        type="button"
                                        onClick={() => setViewingWeekOffset(0)}
                                        style={{
                                          background: '#e6f4ea',
                                          border: '1px solid #bbf7d0',
                                          color: '#15803d',
                                          borderRadius: '7px',
                                          padding: '3px 7px',
                                          fontSize: '0.68rem',
                                          fontWeight: 800,
                                          cursor: 'pointer',
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '4px',
                                          marginLeft: '2px'
                                        }}
                                        className="hover-scale-mini"
                                        title="Zurück zur aktuellen Woche"
                                      >
                                        <RotateCcw size={10} />
                                        <span>Heute</span>
                                      </button>
                                    )}
                                  </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  {/* 🔊 Global TTS Audio Assistant Vorlese-Button (100% SSOT Synchronisiert) */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (isTtsSpeaking && activeTtsKey === 'global_homework') {
                                        handleStopSpeaking();
                                      } else {
                                        const speechPhrases = buildCompleteWeeklyHomeworkSpeechPhrases(
                                          viewingWeekNum,
                                          lehrwerkeList,
                                          otherHWs.map(s => ({
                                            title: s.topic_name?.replace(/\s*\([^)]*\)\s*$/, '') || '',
                                            note: getCleanPageNotes(s.homework_notes)
                                          })),
                                          audioNotes,
                                          generalHomeworkNotes
                                        );
                                        handleSpeakText(speechPhrases, 'global_homework');
                                      }
                                    }}
                                    style={{
                                      background: (isTtsSpeaking && activeTtsKey === 'global_homework') 
                                        ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' 
                                        : 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                                      border: 'none',
                                      color: '#ffffff',
                                      borderRadius: '100px',
                                      padding: '6px 14px',
                                      fontSize: '0.80rem',
                                      fontWeight: 950,
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '6px',
                                      boxShadow: (isTtsSpeaking && activeTtsKey === 'global_homework') 
                                        ? '0 3px 0 #991b1b, 0 6px 14px rgba(239, 68, 68, 0.35)' 
                                        : '0 3px 0 #15803d, 0 6px 14px rgba(34, 197, 94, 0.35)',
                                      transform: (isTtsSpeaking && activeTtsKey === 'global_homework') ? 'translateY(1px)' : 'none',
                                      transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)'
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.filter = 'brightness(1.06)';
                                      e.currentTarget.style.transform = 'translateY(-1px)';
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.filter = 'none';
                                      e.currentTarget.style.transform = (isTtsSpeaking && activeTtsKey === 'global_homework') ? 'translateY(1px)' : 'none';
                                    }}
                                    onMouseDown={(e) => {
                                      e.currentTarget.style.transform = 'translateY(2px)';
                                      e.currentTarget.style.boxShadow = (isTtsSpeaking && activeTtsKey === 'global_homework') ? '0 1px 0 #991b1b' : '0 1px 0 #15803d';
                                    }}
                                    onMouseUp={(e) => {
                                      e.currentTarget.style.transform = 'translateY(-1px)';
                                      e.currentTarget.style.boxShadow = (isTtsSpeaking && activeTtsKey === 'global_homework') 
                                        ? '0 3px 0 #991b1b, 0 6px 14px rgba(239, 68, 68, 0.35)' 
                                        : '0 3px 0 #15803d, 0 6px 14px rgba(34, 197, 94, 0.35)';
                                    }}
                                    title={isTtsSpeaking && activeTtsKey === 'global_homework' ? "Vorlesen stoppen" : "Gesamte Hausaufgabe vorlesen lassen"}
                                  >
                                    {isTtsSpeaking && activeTtsKey === 'global_homework' ? (
                                      <>
                                        <VolumeX size={15} color="#ffffff" strokeWidth={2.8} />
                                        <span>Stopp ⏹</span>
                                      </>
                                    ) : (
                                      <>
                                        <Volume2 size={15} color="#ffffff" strokeWidth={2.8} />
                                        <span>Hör zu! ✨</span>
                                      </>
                                    )}
                                  </button>

                                  {(progressItems.some(item => item.is_current_homework) || generalHomeworkNotes.trim() !== '') && !readOnly && (
                                    <button 
                                      type="button" 
                                      onClick={async () => {
                                        await handleResetAllCurrentHomework();
                                        setGeneralHomeworkNotes('');
                                      }}
                                      style={{ 
                                        border: 'none', 
                                        background: 'rgba(239, 68, 68, 0.08)', 
                                        color: '#dc2626', 
                                        fontSize: '0.72rem', 
                                        fontWeight: 800, 
                                        cursor: 'pointer', 
                                        padding: '3px 8px',
                                        borderRadius: '8px',
                                        transition: 'all 0.15s ease'
                                      }}
                                      className="hover-scale-mini"
                                    >
                                      ✕ Zurücksetzen
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* 2. Silent Mode Banner (falls aktiv) */}
                              {isSilentTime && (
                                <div style={{
                                  background: '#f8fafc',
                                  border: '1px solid #e2e8f0',
                                  borderRadius: '10px',
                                  padding: '6px 10px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  color: '#64748b'
                                }}>
                                  <span>🌙</span>
                                  <span>
                                    {readOnly
                                      ? 'Nachtruhe aktiv: Keine störenden Benachrichtigungen bis 07:00 Uhr.'
                                      : 'Silent-Modus aktiv: Der Schüler erhält die Aufgabe morgen früh ab 07:00 Uhr ohne Nacht-Störung.'}
                                  </span>
                                </div>
                              )}

                              {/* 3. Empty State oder Items */}
                              {!hasActiveItems ? (
                                <div style={{
                                  padding: '20px 14px',
                                  background: '#ffffff',
                                  borderRadius: '14px',
                                  border: '1.5px dashed #cbd5e1',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '8px',
                                  textAlign: 'center'
                                }}>
                                  <span style={{ fontSize: '1.4rem' }}>{isPastWeek ? '🏖️' : '📖'}</span>
                                  <span style={{ fontSize: '0.82rem', color: '#475569', fontWeight: 750 }}>
                                    {isPastWeek
                                      ? `Keine Hausaufgaben für KW ${viewingWeekNum} eingetragen.`
                                      : `Noch keine Aufgaben für KW ${viewingWeekNum} zugewiesen.`}
                                  </span>
                                  <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 550 }}>
                                    {isPastWeek
                                      ? 'Unterrichtsfreie Zeit, Ferien oder keine Notizen hinterlegt.'
                                      : 'Wähle links im Protokoll ein Lehrwerk oder einen Song aus.'}
                                  </span>
                                  {isPastWeek && (
                                    <button
                                      type="button"
                                      onClick={() => setViewingWeekOffset(0)}
                                      style={{
                                        marginTop: '4px',
                                        padding: '5px 12px',
                                        borderRadius: '8px',
                                        background: '#34a853',
                                        color: '#ffffff',
                                        border: 'none',
                                        fontSize: '0.74rem',
                                        fontWeight: 800,
                                        cursor: 'pointer'
                                      }}
                                      className="hover-scale"
                                    >
                                      Zurück zur aktuellen Woche
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '2px 0' }}>
                              {/* Lehrwerke Books */}
                              {lehrwerkeList.map((item, idx) => {
                                const bookColor = getLehrwerkColor(item.title);
                                const bookObj = globalLehrwerke.find(b => b.title === item.title);
                                const assignedBook = bookObj ? assignedLehrwerke.find(a => a.lehrwerkId === bookObj.id) : null;
                                
                                const pagesWithNotes = assignedBook ? item.pages.filter((p: number) => {
                                  const pState = assignedBook.pageStates?.[p];
                                  if (pState && getCleanPageNotes(pState.homeworkNotes || pState.homework_notes) !== '') return true;
                                  const dbItem = allActive.find(x => x.topic_name === `${item.title} - Seite ${p}`);
                                  if (dbItem && getCleanPageNotes(dbItem.homework_notes) !== '') return true;
                                  return false;
                                }) : [];

                                return (
                                  <div key={`lw-${idx}`} style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '6px',
                                    paddingBottom: idx < lehrwerkeList.length - 1 || otherHWs.length > 0 ? '10px' : '0',
                                    borderBottom: idx < lehrwerkeList.length - 1 || otherHWs.length > 0 ? '1px solid rgba(0,0,0,0.06)' : 'none'
                                  }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                                        <div style={{
                                          width: '26px',
                                          height: '30px',
                                          background: `linear-gradient(135deg, ${bookColor.from}, ${bookColor.to})`,
                                          borderRadius: '6px',
                                          flexShrink: 0,
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
                                        }}>
                                          <BookOpen size={13} color={bookColor.text} />
                                        </div>
                                        <span style={{
                                          fontSize: '0.90rem',
                                          fontWeight: 850,
                                          color: '#0f172a',
                                          overflow: 'hidden',
                                          textOverflow: 'ellipsis',
                                          whiteSpace: 'nowrap'
                                        }}>
                                          {item.title}
                                        </span>
                                      </div>

                                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                                        {/* Granular Page Badges */}
                                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                          {item.pages.map((p: number) => (
                                            <span key={`p-pill-${p}`} style={{
                                              fontSize: '0.72rem',
                                              fontWeight: 800,
                                              color: '#15803d',
                                              background: '#dcfce7',
                                              padding: '3px 8px',
                                              borderRadius: '99px',
                                              display: 'inline-flex',
                                              alignItems: 'center',
                                              gap: '4px'
                                            }}>
                                              S. {p}
                                              {!readOnly && (
                                                <button
                                                  type="button"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleRemoveSinglePageHomework(item.title, p);
                                                  }}
                                                  style={{
                                                    border: 'none',
                                                    background: 'none',
                                                    color: '#15803d',
                                                    cursor: 'pointer',
                                                    fontSize: '0.66rem',
                                                    fontWeight: 900,
                                                    padding: '0',
                                                    lineHeight: 1
                                                  }}
                                                  className="hover-scale-mini"
                                                  title={`Seite ${p} aus Hausaufgaben entfernen`}
                                                >
                                                  ✕
                                                </button>
                                              )}
                                            </span>
                                          ))}
                                        </div>

                                        {!readOnly && (
                                          <button
                                            type="button"
                                            onClick={() => handleRemoveBookHomework(item.title)}
                                            style={{
                                              border: 'none',
                                              background: 'rgba(239, 68, 68, 0.08)',
                                              color: '#dc2626',
                                              cursor: 'pointer',
                                              fontSize: '0.72rem',
                                              fontWeight: 800,
                                              padding: '4px 8px',
                                              borderRadius: '8px',
                                              marginLeft: '2px'
                                            }}
                                            className="hover-scale-mini"
                                            title={`Gesamtes Buch "${item.title}" aus Hausaufgaben entfernen`}
                                          >
                                            ✕
                                          </button>
                                        )}
                                      </div>
                                    </div>

                                    {/* Specific Page Notes (Frameless Editorial Flow + Micro TTS Speaker Pill) */}
                                    {pagesWithNotes.map((p: number) => {
                                      const pState = assignedBook?.pageStates?.[p];
                                      let noteText = getCleanPageNotes(pState?.homeworkNotes || pState?.homework_notes);
                                      if (!noteText) {
                                        const dbItem = allActive.find(x => x.topic_name === `${item.title} - Seite ${p}`);
                                        if (dbItem?.homework_notes) {
                                          noteText = getCleanPageNotes(dbItem.homework_notes);
                                        }
                                      }
                                      const isSpeakingThis = isTtsSpeaking && activeTtsKey === `book_note_${item.title}_${p}`;

                                      return (
                                        <div key={`p-note-${p}`} style={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'space-between',
                                          gap: '8px',
                                          fontSize: '0.78rem',
                                          padding: '3px 6px',
                                          marginLeft: '32px',
                                          borderRadius: '6px',
                                          background: isSpeakingThis ? '#dcfce7' : 'transparent',
                                          transition: 'all 0.15s ease'
                                        }}>
                                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', minWidth: 0 }}>
                                            <span style={{ fontWeight: 850, color: '#e11d48', flexShrink: 0 }}>S. {p}:</span>
                                            <span style={{ fontWeight: 600, color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{noteText}</span>
                                          </div>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleSpeakText(`Seite ${p}: ${noteText}`, `book_note_${item.title}_${p}`);
                                              }}
                                              style={{
                                                border: 'none',
                                                background: isSpeakingThis ? '#bbf7d0' : 'none',
                                                color: isSpeakingThis ? '#15803d' : '#94a3b8',
                                                cursor: 'pointer',
                                                padding: '2px 4px',
                                                borderRadius: '4px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                transition: 'transform 0.15s ease'
                                              }}
                                              onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.2)'; }}
                                              onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; }}
                                              title="Notiz vorlesen"
                                            >
                                              <Volume2 size={12} strokeWidth={2.4} />
                                            </button>

                                            {!readOnly && (
                                              <button
                                                type="button"
                                                onClick={() => handleDeletePageNote(item.title, p)}
                                                style={{
                                                  border: 'none',
                                                  background: 'none',
                                                  color: '#94a3b8',
                                                  cursor: 'pointer',
                                                  fontSize: '0.70rem',
                                                  fontWeight: 800,
                                                  padding: '2px'
                                                }}
                                                className="hover-scale-mini"
                                                title="Notiz löschen"
                                              >
                                                ✕
                                              </button>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                );
                              })}

                              {/* Songs List */}
                              {otherHWs.length > 0 && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                  {otherHWs.map((item, idx) => {
                                    const songNote = getCleanPageNotes(item.homework_notes);
                                    const isSpeakingThisSong = isTtsSpeaking && activeTtsKey === `song_note_${idx}`;
                                    return (
                                      <div key={`song-hw-${idx}`} style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '6px',
                                        paddingBottom: idx < otherHWs.length - 1 ? '10px' : '0',
                                        borderBottom: idx < otherHWs.length - 1 ? '1px solid rgba(0,0,0,0.06)' : 'none'
                                      }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                                            <div style={{
                                              width: '26px',
                                              height: '26px',
                                              borderRadius: '8px',
                                              background: 'linear-gradient(135deg, #e0e7ff, #c7d2fe)',
                                              display: 'flex',
                                              alignItems: 'center',
                                              justifyContent: 'center',
                                              color: '#4338ca',
                                              flexShrink: 0
                                            }}>
                                              <Music size={13} strokeWidth={2.4} />
                                            </div>
                                            <span style={{
                                              fontSize: '0.90rem',
                                              fontWeight: 850,
                                              color: '#0f172a',
                                              overflow: 'hidden',
                                              textOverflow: 'ellipsis',
                                              whiteSpace: 'nowrap'
                                            }}>
                                              {item.topic_name.replace(/\s*\([^)]*\)\s*$/, '')}
                                            </span>
                                          </div>

                                          {!readOnly && (
                                            <button
                                              type="button"
                                              onClick={() => handleRemoveSongHomework(item)}
                                              style={{
                                                border: 'none',
                                                background: 'rgba(239, 68, 68, 0.08)',
                                                color: '#dc2626',
                                                cursor: 'pointer',
                                                fontSize: '0.72rem',
                                                fontWeight: 800,
                                                padding: '4px 8px',
                                                borderRadius: '8px',
                                                flexShrink: 0
                                              }}
                                              className="hover-scale-mini"
                                              title="Song aus Hausaufgaben entfernen"
                                            >
                                              ✕
                                            </button>
                                          )}
                                        </div>

                                        {/* Specific Song Practice Note (Frameless Editorial Flow + Micro TTS Speaker Pill) */}
                                        {songNote ? (
                                          <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            gap: '8px',
                                            fontSize: '0.78rem',
                                            padding: '3px 6px',
                                            marginLeft: '32px',
                                            borderRadius: '6px',
                                            background: isSpeakingThisSong ? '#e0e7ff' : 'transparent',
                                            transition: 'all 0.15s ease'
                                          }}>
                                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', minWidth: 0 }}>
                                              <span style={{ fontWeight: 850, color: '#4f46e5', flexShrink: 0 }}>📌 Fahrplan:</span>
                                              <span style={{ fontWeight: 600, color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{songNote}</span>
                                            </div>
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleSpeakText(`Fahrplan für ${item.topic_name.replace(/\s*\([^)]*\)\s*$/, '')}: ${songNote}`, `song_note_${idx}`);
                                              }}
                                              style={{
                                                border: 'none',
                                                background: isSpeakingThisSong ? '#c7d2fe' : 'none',
                                                color: isSpeakingThisSong ? '#4338ca' : '#94a3b8',
                                                cursor: 'pointer',
                                                padding: '2px 4px',
                                                borderRadius: '4px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                flexShrink: 0,
                                                transition: 'transform 0.15s ease'
                                              }}
                                              onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.2)'; }}
                                              onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; }}
                                              title="Fahrplan vorlesen"
                                            >
                                              <Volume2 size={12} strokeWidth={2.4} />
                                            </button>
                                          </div>
                                        ) : null}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                              {/* Audio Badges in Live Preview */}
                              {audioNotes.length > 0 && (
                                <div style={{ paddingTop: '2px' }}>
                                  <AudioTrackCarousel
                                    tracks={audioNotes}
                                    onDelete={!readOnly ? handleDeleteNote : undefined}
                                    readOnly={readOnly}
                                  />
                                </div>
                              )}

                              {/* Compact Note Indicator in Live Preview with Micro TTS */}
                              {generalHomeworkNotes.trim() && (
                                <div style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  gap: '8px',
                                  padding: '6px 6px 2px 6px',
                                  fontSize: '0.78rem',
                                  borderRadius: '6px',
                                  background: (isTtsSpeaking && activeTtsKey === 'general_note_tts') ? '#dcfce7' : 'transparent',
                                  borderTop: (lehrwerkeList.length > 0 || otherHWs.length > 0 || audioNotes.length > 0) ? '1px dashed #e2e8f0' : 'none',
                                  transition: 'all 0.15s ease'
                                }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                                    <FileText size={14} style={{ color: '#16a34a', flexShrink: 0 }} />
                                    <span style={{ fontWeight: 850, color: '#15803d', flexShrink: 0 }}>Hinweis:</span>
                                    <span style={{ color: '#334155', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                      {generalHomeworkNotes.trim()}
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleSpeakText(`Zusätzlicher Hinweis: ${generalHomeworkNotes.trim()}`, 'general_note_tts');
                                    }}
                                    style={{
                                      border: 'none',
                                      background: (isTtsSpeaking && activeTtsKey === 'general_note_tts') ? '#bbf7d0' : 'none',
                                      color: (isTtsSpeaking && activeTtsKey === 'general_note_tts') ? '#15803d' : '#94a3b8',
                                      cursor: 'pointer',
                                      padding: '2px 4px',
                                      borderRadius: '4px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      flexShrink: 0,
                                      transition: 'transform 0.15s ease'
                                    }}
                                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.2)'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; }}
                                    title="Hinweis vorlesen"
                                  >
                                    <Volume2 size={12} strokeWidth={2.4} />
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                      {/* ========================================================================= */}
                      {/* ZONE 2: SEGMENTIERTE UNTERRICHTS-WERKZEUGE & EINGABE                     */}
                      {/* ========================================================================= */}
                      {!readOnly && (
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px',
                          background: 'rgba(241, 245, 249, 0.8)',
                          border: '1px solid rgba(226, 232, 240, 0.95)',
                          borderRadius: '20px',
                          padding: '12px',
                          boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.02)'
                        }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '2px 4px 4px 4px'
                          }}>
                            <span style={{
                              fontSize: '0.68rem',
                              fontWeight: 900,
                              color: '#64748b',
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}>
                              <span>🛠️</span>
                              <span>Unterrichts-Werkzeuge & Eingabe</span>
                            </span>
                            <span style={{ fontSize: '0.64rem', color: '#94a3b8', fontWeight: 650 }}>
                              Lehrer-Studio
                            </span>
                          </div>

                          {/* --------------------------------------------------------------------- */}
                          {/* KACHEL A: PLAY-ALONG AUDIO STUDIO                                     */}
                          {/* --------------------------------------------------------------------- */}
                          <div style={{
                            background: '#ffffff',
                            borderRadius: '14px',
                            border: '1px solid #e2e8f0',
                            padding: '12px 14px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)'
                          }}>
                            {/* Studio Header */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontSize: '0.82rem', fontWeight: 900, color: '#0f172a' }}>
                                  🎙️ Play-Along Studio
                                </span>
                                <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 650 }}>
                                  {hasTresorStorage ? '(max. 7 Min.)' : '(max. 60s)'}
                                </span>
                              </div>

                              {!isRecordingAudio ? (
                                <button
                                  type="button"
                                  onClick={startRecordingAudio}
                                  disabled={isUploadingAudio}
                                  style={{
                                    background: '#0f172a',
                                    color: '#ffffff',
                                    border: 'none',
                                    padding: '6px 14px',
                                    borderRadius: '10px',
                                    fontSize: '0.74rem',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                                    transition: 'all 0.15s ease',
                                    flexShrink: 0
                                  }}
                                  className="hover-scale"
                                >
                                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
                                  <span>Aufnahme starten</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => stopRecordingAudio()}
                                  style={{
                                    background: '#ef4444',
                                    color: '#ffffff',
                                    border: 'none',
                                    padding: '6px 14px',
                                    borderRadius: '10px',
                                    fontSize: '0.74rem',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    boxShadow: '0 0 12px rgba(239, 68, 68, 0.4)',
                                    flexShrink: 0
                                  }}
                                >
                                  <span style={{ width: '7px', height: '7px', background: 'currentColor', display: 'inline-block' }} />
                                  <span>Stopp ({hasTresorStorage ? `${formatRecordTime(audioDuration)} / 7:00 Min.` : `${audioDuration}s / 60s`})</span>
                                </button>
                              )}
                            </div>

                            {/* Title Input Field before Recording */}
                            {!isRecordingAudio && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', marginTop: '2px' }}>
                                <input
                                  type="text"
                                  placeholder="Name der Aufnahme (z. B. Akkordwechsel G-Dur & D-Dur)..."
                                  value={audioLabel}
                                  onChange={(e) => setAudioLabel(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      startRecordingAudio();
                                    }
                                  }}
                                  style={{
                                    flex: 1,
                                    fontSize: '0.78rem',
                                    padding: '7px 12px',
                                    borderRadius: '10px',
                                    border: '1.5px solid #e2e8f0',
                                    background: '#f8fafc',
                                    color: '#0f172a',
                                    outline: 'none',
                                    boxSizing: 'border-box',
                                    transition: 'all 0.15s ease'
                                  }}
                                  onFocus={(e) => {
                                    e.currentTarget.style.borderColor = '#34a853';
                                    e.currentTarget.style.background = '#ffffff';
                                  }}
                                  onBlur={(e) => {
                                    e.currentTarget.style.borderColor = '#e2e8f0';
                                    e.currentTarget.style.background = '#f8fafc';
                                  }}
                                />
                              </div>
                            )}

                            {/* Active Live Recording Pulse Banner */}
                            {isRecordingAudio && (
                              <div style={{
                                background: '#fef2f2',
                                border: '1.5px solid #fecaca',
                                borderRadius: '12px',
                                padding: '10px 14px',
                                display: 'flex',
                                alignItems: 'center',
                                justifySelf: 'stretch',
                                justifyContent: 'space-between',
                                fontSize: '0.80rem'
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#b91c1c', fontWeight: 850 }}>
                                  <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#ef4444', display: 'inline-block', animation: 'pulse 1.2s infinite' }} />
                                  <span>
                                    Mikrofon aktiv {audioLabel.trim() ? `für „${audioLabel.trim()}“` : ''}... {hasTresorStorage ? `${formatRecordTime(audioDuration)} / 7:00 Min.` : `${audioDuration}s / 60s`}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => stopRecordingAudio()}
                                  style={{
                                    background: '#ef4444',
                                    color: '#ffffff',
                                    border: 'none',
                                    borderRadius: '8px',
                                    padding: '4px 10px',
                                    fontSize: '0.74rem',
                                    fontWeight: 800,
                                    cursor: 'pointer'
                                  }}
                                >
                                  Fertigstellen ✓
                                </button>
                              </div>
                            )}

                            {/* Uploading Status Indicator */}
                            {isUploadingAudio && (
                              <div style={{
                                fontSize: '0.74rem',
                                color: '#15803d',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                fontWeight: 700,
                                padding: '4px 2px'
                              }}>
                                <span>⏳</span> Aufnahme wird gesichert und zur Schülervorschau hinzugefügt...
                              </div>
                            )}
                          </div>

                          {/* --------------------------------------------------------------------- */}
                          {/* KACHEL B: WOCHEN-HINWEIS & SCHNELLBAUKASTEN                            */}
                          {/* --------------------------------------------------------------------- */}
                          <div style={{
                            background: '#ffffff',
                            borderRadius: '14px',
                            border: '1px solid #e2e8f0',
                            padding: '12px 14px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)'
                          }}>
                            {/* Editor Header */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <label style={{ fontSize: '0.82rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                                <FileText size={14} style={{ color: '#34a853' }} />
                                <span>Zusätzliche Hausaufgaben-Bemerkungen</span>
                              </label>

                              <SpeechDictationButton
                                onTranscript={(text) => {
                                  setGeneralHomeworkNotes(prev => {
                                    const trimmed = prev.trim();
                                    const next = trimmed ? `${trimmed}\n${text}` : text;
                                    try {
                                      localStorage.setItem(`campus_homework_notes_${student.id}`, next);
                                    } catch {}
                                    return next;
                                  });
                                  triggerDebouncedAutoSave(350);
                                }}
                                title="Diktieren"
                              />
                            </div>

                            {/* Textarea */}
                            <textarea
                              placeholder="Trage hier zusätzliche Bemerkungen zur Hausaufgabe ein..."
                              value={generalHomeworkNotes}
                              onChange={(e) => {
                                const val = e.target.value;
                                setGeneralHomeworkNotes(val);
                                try {
                                  localStorage.setItem(`campus_homework_notes_${student.id}`, val);
                                } catch {}
                                triggerDebouncedAutoSave(350);
                              }}
                              onFocus={() => setIsNotesFocused(true)}
                              onBlur={() => {
                                triggerImmediateAutoSave();
                                if (!generalHomeworkNotes.trim()) {
                                  setIsNotesFocused(false);
                                }
                              }}
                              style={{
                                width: '100%',
                                height: '64px',
                                padding: '8px 10px',
                                borderRadius: '10px',
                                border: '1.5px solid #cbd5e1',
                                fontSize: '0.82rem',
                                fontWeight: 600,
                                lineHeight: '1.4',
                                outline: 'none',
                                resize: 'none',
                                background: '#fefdf8',
                                color: '#1e293b',
                                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)',
                                boxSizing: 'border-box'
                              }}
                            />

                            {/* Schnellbaukasten Horizontale Leiste */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              {(() => {
                                const isPresetActive = (itemText: string, isBpm = false) => {
                                  if (isBpm) {
                                    return generalHomeworkNotes.toLowerCase().includes('bpm');
                                  }
                                  return generalHomeworkNotes.includes(itemText);
                                };

                                const togglePreset = (itemText: string, isBpm = false, tagKey?: string) => {
                                  if (isBpm) {
                                    setGeneralHomeworkNotes(prev => {
                                      const clean = prev.replace(/\s*\(?\d+\s*BPM\)?/gi, '').trim();
                                      const next = clean ? `${clean} (60 BPM)` : '60 BPM';
                                      try { localStorage.setItem(`campus_homework_notes_${student.id}`, next); } catch {}
                                      return next;
                                    });
                                  } else {
                                    setGeneralHomeworkNotes(prev => {
                                      let next = '';
                                      if (prev.includes(itemText)) {
                                        next = prev.replace(itemText, '').replace(/\n\n+/g, '\n').trim();
                                      } else {
                                        next = prev.trim() ? `${prev.trim()}\n${itemText}` : itemText;
                                      }
                                      try { localStorage.setItem(`campus_homework_notes_${student.id}`, next); } catch {}
                                      return next;
                                    });
                                  }

                                  if (tagKey) {
                                    setPendingTargetFocusTags(prev => {
                                      if (prev.includes(tagKey)) {
                                        return prev.filter(k => k !== tagKey);
                                      } else {
                                        return [...prev, tagKey];
                                      }
                                    });
                                  }

                                  triggerImmediateAutoSave();
                                };

                                const allPresets = [
                                  {
                                    label: '⏱️ Tempo halten',
                                    desc: 'Metronom & Puls',
                                    text: 'Achte auf ein gleichmäßiges Tempo und übe gezielt mit dem Metronom.',
                                    tagKey: 'rhythmus',
                                    isBpm: false,
                                    onClick: () => togglePreset('Achte auf ein gleichmäßiges Tempo und übe gezielt mit dem Metronom.', false, 'rhythmus')
                                  },
                                  {
                                    label: '✨ Sauber spielen',
                                    desc: 'Klangkultur',
                                    text: 'Spiele diese Stelle besonders sauber, achte auf saubere Töne und klaren Klang.',
                                    tagKey: 'intonation',
                                    isBpm: false,
                                    onClick: () => togglePreset('Spiele diese Stelle besonders sauber, achte auf saubere Töne und klaren Klang.', false, 'intonation')
                                  },
                                  {
                                    label: '🥁 Rhythmus-Metronom',
                                    desc: 'Timing & BPM',
                                    text: 'Übe diesen Rhythmus präzise auf den Klick.',
                                    tagKey: 'rhythmus',
                                    isBpm: true,
                                    onClick: () => togglePreset('Übe diesen Rhythmus präzise auf den Klick.', true, 'rhythmus')
                                  },
                                  {
                                    label: '🖐️ Fingersatz üben',
                                    desc: 'Präzise Motorik',
                                    text: 'Halte dich exakt an den notierten Fingersatz und achte auf eine entspannte Handhaltung.',
                                    tagKey: 'technik',
                                    isBpm: false,
                                    onClick: () => togglePreset('Halte dich exakt an den notierten Fingersatz und achte auf eine entspannte Handhaltung.', false, 'technik')
                                  },
                                  {
                                    label: '🦅 Ausdruck & Dynamik',
                                    desc: 'Emotion & Gefühl',
                                    text: 'Gestalte die Dynamik bewusst (p/f) und bringe Emotion und Gefühl in deinen Ausdruck.',
                                    tagKey: 'ausdruck',
                                    isBpm: false,
                                    onClick: () => togglePreset('Gestalte die Dynamik bewusst (p/f) und bringe Emotion und Gefühl in deinen Ausdruck.', false, 'ausdruck')
                                  },
                                  {
                                    label: '🧠 Auswendig spielen',
                                    desc: 'Freies Spiel',
                                    text: 'Präge dir diesen Abschnitt auswendig ein und spiele frei ohne Notenblatt.',
                                    tagKey: 'auswendig',
                                    isBpm: false,
                                    onClick: () => togglePreset('Präge dir diesen Abschnitt auswendig ein und spiele frei ohne Notenblatt.', false, 'auswendig')
                                  },
                                  {
                                    label: '🔄 Kontinuität üben',
                                    desc: 'Tägliche Routine',
                                    text: 'Übe diese Stelle täglich 10 Minuten für eine hohe Kontinuität und Sicherheit.',
                                    tagKey: 'kontinuitaet',
                                    isBpm: false,
                                    onClick: () => togglePreset('Übe diese Stelle täglich 10 Minuten für eine hohe Kontinuität und Sicherheit.', false, 'kontinuitaet')
                                  },
                                  {
                                    label: '💪 Selbstständig üben',
                                    desc: 'Pionier-Üben',
                                    text: 'Erarbeite dir die nächsten Takte selbstständig und achte auf eigene Fehlerkorrektur.',
                                    tagKey: 'selbststaendigkeit',
                                    isBpm: false,
                                    onClick: () => togglePreset('Erarbeite dir die nächsten Takte selbstständig und achte auf eigene Fehlerkorrektur.', false, 'selbststaendigkeit')
                                  }
                                ];

                                const topPresets = allPresets.slice(0, 5);
                                const extraPresets = allPresets.slice(5);

                                const renderPill = (item: any, idx: number) => {
                                  const active = isPresetActive(item.text, item.isBpm);
                                  return (
                                    <button
                                      key={idx}
                                      type="button"
                                      onClick={item.onClick}
                                      style={{
                                        flexShrink: 0,
                                        background: active ? 'linear-gradient(135deg, #34a853 0%, #2e7d32 100%)' : '#f8fafc',
                                        color: active ? '#ffffff' : '#1e293b',
                                        border: active ? '1px solid #34a853' : '1px solid #e2e8f0',
                                        padding: '4px 10px',
                                        borderRadius: '100px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        outline: 'none',
                                        boxShadow: active ? '0 2px 6px rgba(52, 168, 83, 0.2)' : 'none',
                                        transition: 'all 0.15s ease',
                                        whiteSpace: 'nowrap'
                                      }}
                                      className="preset-chip-card hover-scale"
                                    >
                                      <span style={{ fontWeight: 800, fontSize: '0.70rem', letterSpacing: '-0.01em' }}>
                                        {item.label}
                                      </span>
                                    </button>
                                  );
                                };

                                return (
                                  <>
                                    <div
                                      style={{
                                        display: 'flex',
                                        gap: '6px',
                                        overflowX: 'auto',
                                        padding: '2px 0',
                                        WebkitOverflowScrolling: 'touch',
                                        flexWrap: 'nowrap',
                                        width: '100%',
                                        boxSizing: 'border-box'
                                      }}
                                      className="presets-scrollbar-container hide-scrollbar"
                                    >
                                      {topPresets.map((item, idx) => renderPill(item, idx))}

                                      {extraPresets.length > 0 && !showAllPresets && (
                                        <button
                                          type="button"
                                          onClick={() => setShowAllPresets(true)}
                                          style={{
                                            flexShrink: 0,
                                            background: '#f1f5f9',
                                            color: '#34a853',
                                            border: '1px dashed #34a853',
                                            padding: '4px 10px',
                                            borderRadius: '100px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '3px',
                                            fontWeight: 850,
                                            fontSize: '0.70rem',
                                            whiteSpace: 'nowrap'
                                          }}
                                          className="preset-chip-card hover-scale"
                                        >
                                          <span>+ Mehr ({extraPresets.length}) ▾</span>
                                        </button>
                                      )}
                                    </div>

                                    {showAllPresets && (
                                      <div style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        background: 'rgba(248, 250, 252, 0.95)',
                                        borderRadius: '12px',
                                        border: '1px solid #e2e8f0',
                                        marginTop: '2px',
                                        boxSizing: 'border-box',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '6px',
                                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
                                      }} className="animation-fade-in">
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px' }}>
                                          <span style={{ fontSize: '0.72rem', fontWeight: 850, color: '#1e293b' }}>
                                            🎯 Alle Schnelltext-Bausteine:
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() => setShowAllPresets(false)}
                                            style={{
                                              background: 'none',
                                              border: 'none',
                                              color: '#64748b',
                                              fontSize: '0.70rem',
                                              fontWeight: 800,
                                              cursor: 'pointer'
                                            }}
                                          >
                                            ✕ Schließen
                                          </button>
                                        </div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', paddingTop: '4px' }}>
                                          {extraPresets.map((item, idx) => renderPill(item, idx + 5))}
                                        </div>
                                      </div>
                                    )}
                                  </>
                                );
                              })()}
                            </div>
                          </div>

                          {/* --------------------------------------------------------------------- */}
                          {/* KACHEL C: VERTRAULICHE LEHRER-NOTIZ                                    */}
                          {/* --------------------------------------------------------------------- */}
                          <div style={{
                            background: '#ffffff',
                            borderRadius: '14px',
                            border: '1px solid #e2e8f0',
                            padding: '10px 12px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px',
                            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)'
                          }}>
                            <label style={{ fontSize: '0.76rem', fontWeight: 850, color: '#64748b', margin: 0, display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <span>🔒 Interne Notiz (nur für Lehrer sichtbar)</span>
                            </label>
                            <textarea
                              placeholder="Vertrauliche Notizen zum Unterricht..."
                              value={teacherNotes}
                              onChange={(e) => {
                                const val = e.target.value;
                                setTeacherNotes(val);
                                try {
                                  localStorage.setItem(`campus_teacher_notes_${student.id}`, val);
                                } catch {}
                                triggerDebouncedAutoSave(350);
                              }}
                              onBlur={() => {
                                triggerImmediateAutoSave();
                              }}
                              style={{
                                width: '100%',
                                height: '46px',
                                padding: '6px 10px',
                                borderRadius: '8px',
                                border: '1px solid #cbd5e1',
                                fontSize: '0.78rem',
                                fontWeight: 600,
                                outline: 'none',
                                resize: 'none',
                                background: '#f8fafc',
                                boxSizing: 'border-box'
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Clean Bottom Spacing */}
                  <div style={{ paddingBottom: (isMobileView || isInsideSim || isFullscreen) ? '24px' : '8px' }} />
                </form>
              </>
            )}
          </div>
        </>
      ) : activeModalTab === 'stickeralbum' ? (
        /* STICKER SAMMELALBUM VIEW - 3D PANINI SAMMELALBUM (SENIOR DESIGNER LEVEL) */
        <div style={{
          flex: 1,
          width: '100%',
          padding: isMobileOrSim ? '20px 16px calc(280px + env(safe-area-inset-bottom, 40px)) 16px' : '28px 32px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
          background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
          borderRadius: '0',
          position: 'relative',
          boxSizing: 'border-box'
        }}>
          {/* Keyframe animations */}
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes holoShimmer {
              0% { background-position: 0% 0%; }
              50% { background-position: 100% 100%; }
              100% { background-position: 0% 0%; }
            }
            @keyframes stickerGlow {
              0%, 100% { box-shadow: 0 0 15px rgba(52, 168, 83, 0.25); }
              50% { box-shadow: 0 0 28px rgba(52, 168, 83, 0.5); }
            }
            @keyframes peelIn {
              0% { transform: scale(0.7) rotate(-6deg); opacity: 0; }
              70% { transform: scale(1.04) rotate(2deg); }
              100% { transform: scale(1) rotate(0deg); opacity: 1; }
            }
            .panini-sticker-card {
              transition: transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.2s ease, border-color 0.2s ease;
              transform-style: preserve-3d;
            }
            .panini-sticker-card:hover {
              transform: translateY(-4px);
            }
            .holo-foil-overlay {
              background: linear-gradient(135deg, 
                rgba(255, 0, 128, 0.25) 0%, 
                rgba(0, 255, 255, 0.25) 25%, 
                rgba(255, 255, 0, 0.25) 50%, 
                rgba(0, 255, 128, 0.25) 75%, 
                rgba(255, 0, 255, 0.25) 100%
              );
              background-size: 300% 300%;
              mix-blend-mode: color-dodge;
              animation: holoShimmer 4s ease infinite;
            }
            .panini-row-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 16px;
              width: 100%;
            }
            @media (max-width: 1100px) {
              .panini-row-grid {
                grid-template-columns: repeat(2, 1fr);
                gap: 14px;
              }
            }
            @media (max-width: 580px) {
              .panini-row-grid {
                grid-template-columns: repeat(2, 1fr);
                gap: 10px;
              }
            }
          `}} />

          {/* TOP BAR: Back to Hub Button */}
          <div style={{ flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => { setActiveModalTab('document'); setActiveSubView('hub'); }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: '#ffffff',
                border: '1.5px solid #e2e8f0',
                color: '#334155',
                padding: '7px 14px',
                borderRadius: '20px',
                fontSize: '0.75rem',
                fontWeight: 800,
                cursor: 'pointer',
                width: 'fit-content',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
                transition: 'all 0.15s ease'
              }}
              className="hover-scale"
            >
              <span>← Zurück zum Hub</span>
            </button>
          </div>

          {/* SIMULATOR TOGGLE BAR (Dev Mode Only) */}
          {!readOnly && (import.meta.env.DEV || (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || new URLSearchParams(window.location.search).has('dev_tools')))) && (
            <div style={{
              background: 'white',
              borderRadius: '16px',
              padding: '10px 18px',
              border: '1.5px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
              zIndex: 20,
              flexShrink: 0
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sliders size={14} color="#64748b" />
                <span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#334155' }}>
                  Entwickler-Modus (Simulation)
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700, color: '#64748b' }}>
                  <input
                    type="checkbox"
                    checked={isDevSimulationActive}
                    onChange={(e) => setIsDevSimulationActive(e.target.checked)}
                    style={{ cursor: 'pointer', width: '14px', height: '14px', accentColor: '#34a853' }}
                  />
                  <span>Klick-Vergabe simulieren</span>
                </label>

                <button
                  type="button"
                  onClick={simulateMultiYearProgress}
                  style={{
                    background: 'linear-gradient(135deg, #facc15 0%, #eab308 100%)',
                    border: '1px solid #ca8a04',
                    color: '#0f172a',
                    fontSize: '0.72rem',
                    fontWeight: 900,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 10px',
                    borderRadius: '10px',
                    boxShadow: '0 2px 4px rgba(234, 179, 8, 0.25)',
                    transition: 'all 0.15s ease'
                  }}
                  className="hover-scale"
                >
                  <span>🎓 3 Schuljahre simulieren</span>
                </button>

                <button
                  type="button"
                  onClick={resetStickerAlbum}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#ef4444',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    transition: 'background 0.1s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#fef2f2'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                >
                  <RotateCcw size={12} color="#ef4444" />
                  Album leeren
                </button>
              </div>
            </div>
          )}

          {/* ALBUM HEADER & PROGRESS TRACKER HERO BANNER (APPLE SQUIRCLE WHITE STAGE) */}
          {(() => {
            const activeStickerSource = selectedSchoolYear === currentSchoolYear 
              ? collectedStickers 
              : (simulatedSchoolYearData[selectedSchoolYear] || {});

            const totalCount = ALL_STICKERS.length;
            const collectedCount = ALL_STICKERS.filter(st => (activeStickerSource[st.id]?.count || 0) > 0).length;
            const percentage = Math.round((collectedCount / totalCount) * 100);

            if (selectedSchoolYear !== currentSchoolYear) {
              return (
                <div style={{
                  background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 40%, #ffffff 100%)',
                  borderRadius: '20px',
                  padding: isMobileOrSim ? '16px' : '20px 24px',
                  color: '#1e293b',
                  boxShadow: '0 8px 24px -4px rgba(245, 158, 11, 0.12), 0 1px 3px rgba(0,0,0,0.02)',
                  position: 'relative',
                  overflow: 'hidden',
                  border: '1.5px solid #fde68a',
                  flexShrink: 0,
                  width: '100%',
                  boxSizing: 'border-box'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', position: 'relative', zIndex: 2 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '1.5rem' }}>🏛️</span>
                        <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 900, letterSpacing: '-0.4px', color: '#92400e' }}>
                          Schuljahr-Ehrentafel {selectedSchoolYear}
                        </h2>
                        {renderSchoolYearSelector()}
                      </div>
                      <p style={{ margin: 0, fontSize: '0.82rem', color: '#78350f', fontWeight: 600, maxWidth: '580px', lineHeight: '1.4' }}>
                        Abgeheftete Meilensteine aus dem Schuljahr {selectedSchoolYear}. Alle gelernten Songs & Lehrwerke bleiben lebenslang im Repertoire!
                      </p>
                    </div>

                    <div style={{
                      background: '#ffffff',
                      border: '1.5px solid #fcd34d',
                      borderRadius: '16px',
                      padding: '10px 18px',
                      textAlign: 'right',
                      boxShadow: '0 2px 8px rgba(245, 158, 11, 0.1)',
                      flexShrink: 0
                    }}>
                      <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 900, color: '#d97706' }}>
                        SIEGEL {selectedSchoolYear}
                      </span>
                      <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#92400e', marginTop: '2px' }}>
                        {collectedCount} Trophäen ✓
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            let rankTitle = '🌱 Rookie-Sammler';
            if (percentage >= 100) rankTitle = '👑 Master Collector';
            else if (percentage >= 75) rankTitle = '🔥 Sammel-Legende';
            else if (percentage >= 50) rankTitle = '⚡ Groove-Profi';
            else if (percentage >= 25) rankTitle = '🎵 Vinyl-Jäger';

            return (
              <div style={{
                background: '#ffffff',
                borderRadius: '20px',
                padding: isMobileOrSim ? '16px 18px' : '20px 26px',
                color: '#0f172a',
                boxShadow: '0 8px 24px -4px rgba(0, 0, 0, 0.06), 0 1px 3px rgba(0, 0, 0, 0.02)',
                position: 'relative',
                overflow: 'hidden',
                border: '1px solid #e2e8f0',
                flexShrink: 0,
                width: '100%',
                boxSizing: 'border-box'
              }}>
                {/* Subtle soft green aura */}
                <div style={{
                  position: 'absolute',
                  top: '-40px',
                  right: '-40px',
                  width: '220px',
                  height: '220px',
                  background: 'radial-gradient(circle, rgba(52, 168, 83, 0.08) 0%, transparent 70%)',
                  pointerEvents: 'none',
                  borderRadius: '50%'
                }} />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', position: 'relative', zIndex: 2 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '1.4rem' }}>🏆</span>
                      <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 900, letterSpacing: '-0.4px', color: '#0f172a' }}>
                        Sticker Sammelalbum
                      </h2>
                      <span style={{
                        background: '#e6f4ea',
                        border: '1px solid #a7f3d0',
                        color: '#137333',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        padding: '3px 10px',
                        borderRadius: '20px',
                        letterSpacing: '0.02em'
                      }}>
                        {rankTitle}
                      </span>
                      {renderSchoolYearSelector()}
                    </div>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b', fontWeight: 600, maxWidth: '520px', lineHeight: '1.4' }}>
                      Sammle XP, erstelle Streaks & meistere Songs, um alle haptischen Sammel-Sticker für dein Musik-Album freizuschalten.
                    </p>
                  </div>

                  {/* Score pill */}
                  <div style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '16px',
                    padding: '10px 18px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-end',
                    gap: '2px',
                    flexShrink: 0
                  }}>
                    <span style={{ fontSize: '0.64rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 800, color: '#64748b' }}>
                      Sammelfortschritt
                    </span>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '5px' }}>
                      <strong style={{ fontSize: '1.45rem', fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>
                        {collectedCount}
                      </strong>
                      <span style={{ fontSize: '0.86rem', color: '#64748b', fontWeight: 700 }}>
                        / {totalCount} Sticker ({percentage}%)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div style={{ marginTop: '14px', position: 'relative', zIndex: 2 }}>
                  <div style={{ width: '100%', height: '8px', background: '#f1f5f9', borderRadius: '10px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${percentage}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, #34a853 0%, #4ade80 100%)',
                      borderRadius: '10px',
                      transition: 'width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)'
                    }} />
                  </div>
                </div>
              </div>
            );
          })()}

          {/* XP LEGENDE TOGGLEABLE PANEL */}
          <div style={{
            background: 'white',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
            boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
            flexShrink: 0
          }}>
            <div 
              onClick={() => setIsXpLegendOpen(!isXpLegendOpen)}
              style={{
                padding: '12px 18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                background: isXpLegendOpen ? '#f8fafc' : 'white',
                transition: 'background 0.15s'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '1.1rem' }}>🎮</span>
                <strong style={{ fontSize: '0.84rem', fontWeight: 800, color: '#1e293b' }}>
                  XP-Legende & Punkte-Guide
                </strong>
                <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
                  (Wie du Punkte & Sticker sammelst)
                </span>
              </div>
              <ChevronRight 
                size={16} 
                color="#64748b" 
                style={{ 
                  transform: isXpLegendOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s ease'
                }} 
              />
            </div>

            {isXpLegendOpen && (
              <div style={{
                padding: '14px 18px 18px 18px',
                borderTop: '1px solid #e2e8f0',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '12px',
                animation: 'fadeIn 0.2s ease-out'
              }}>
                <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '1.3rem' }}>⏱️</span>
                  <div>
                    <strong style={{ fontSize: '0.78rem', display: 'block', color: '#1e293b' }}>Übe-Fokus</strong>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', lineHeight: '1.3' }}>Pro absolvierte Minute Übezeit erhältst du <strong>1 XP</strong>.</span>
                  </div>
                </div>
                <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '1.3rem' }}>🎯</span>
                  <div>
                    <strong style={{ fontSize: '0.78rem', display: 'block', color: '#1e293b' }}>Tägliches Fokus-Ziel</strong>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', lineHeight: '1.3' }}>Tägliches Fokus-Ziel erreicht = <strong>+10 XP</strong> Bonus <em>(z.B. 3m Timer + 1m Extra = 4 XP Übezeit + 10 XP Bonus = 14 XP total)</em>.</span>
                  </div>
                </div>
                <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '1.3rem' }}>🏆</span>
                  <div>
                    <strong style={{ fontSize: '0.78rem', display: 'block', color: '#1e293b' }}>Song meistern</strong>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', lineHeight: '1.3' }}>Lied auf 100% oder Stage-Ready = <strong>+50 XP</strong> Bonus.</span>
                  </div>
                </div>
                <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '1.3rem' }}>🔥</span>
                  <div>
                    <strong style={{ fontSize: '0.78rem', display: 'block', color: '#1e293b' }}>Streak-Bonus</strong>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', lineHeight: '1.3' }}>Disziplin-Bonus: 7 Tage = <strong>+25 XP</strong>, 14 Tage = <strong>+50 XP</strong>, 30 Tage = <strong>+100 XP</strong>.</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* CATEGORIES FILTER BAR TABS */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            overflowX: 'auto',
            padding: '2px 2px 4px 2px',
            flexShrink: 0,
            minHeight: '44px'
          }}>
            {[
              { id: 'all', label: `Alle (${ALL_STICKERS.length})` },
              { id: 'ueben', label: '⏱️ Übe-Fleiß' },
              { id: 'xp', label: '⭐ XP & Stufen' },
              { id: 'streaks', label: '🔥 Streaks' },
              { id: 'songs', label: '🎵 Repertoire' },
              { id: 'spezial', label: '🏆 Spezial' }
            ].map(tab => {
              const isActive = stickerCategoryFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStickerCategoryFilter(tab.id as any)}
                  style={{
                    background: isActive ? '#0f172a' : '#ffffff',
                    color: isActive ? '#ffffff' : '#475569',
                    border: isActive ? '1.5px solid #0f172a' : '1.5px solid #e2e8f0',
                    borderRadius: '20px',
                    padding: '8px 16px',
                    fontSize: '0.76rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: isActive ? '0 4px 12px rgba(15, 23, 42, 0.12)' : '0 1px 3px rgba(0,0,0,0.02)',
                    transition: 'all 0.15s ease'
                  }}
                  className="hover-scale"
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* 3D PANINI STICKER ALBUM ROWS (GENAU 4 STICKER PRO REIHE • JEDE KATEGORIE EINE REIHE) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', width: '100%' }}>
            {[
              { id: 'ueben', title: 'Übe-Fleiß & Zeiterfolge', icon: '⏱️', desc: 'Fokussierte Übezeit am Instrument sammeln' },
              { id: 'xp', title: 'XP & Meilensteine', icon: '⭐', desc: 'Erfahrungspunkte durch Unterricht und Fleiß aufbauen' },
              { id: 'streaks', title: 'Übe-Streaks & Kontinuität', icon: '🔥', desc: 'Tägliche Spielroutine und Beständigkeit meistern' },
              { id: 'songs', title: 'Repertoire & Meisterwerke', icon: '🎵', desc: 'Songs bühnenreif erlernen und Repertoire erweitern' },
              { id: 'spezial', title: 'Spezial-Auszeichnungen & Bühnenreife', icon: '🏆', desc: 'Live-Auftritte, Kreativität und besondere Leistungen' }
            ]
              .filter(cat => stickerCategoryFilter === 'all' || cat.id === stickerCategoryFilter)
              .map(cat => {
                const categoryStickers = ALL_STICKERS.filter(st => st.category === cat.id);
                const activeStickerSource = selectedSchoolYear === currentSchoolYear 
                  ? collectedStickers 
                  : (simulatedSchoolYearData[selectedSchoolYear] || {});
                const catCollectedCount = categoryStickers.filter(st => (activeStickerSource[st.id]?.count || 0) > 0).length;
                const isCatComplete = catCollectedCount === categoryStickers.length;

                return (
                  <div key={cat.id} style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
                    {/* Category Header Row */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '8px',
                      padding: '0 4px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '1.2rem' }}>{cat.icon}</span>
                        <h3 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 900, color: '#0f172a' }}>
                          {cat.title}
                        </h3>
                        <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600, display: isMobileOrSim ? 'none' : 'inline' }}>
                          • {cat.desc}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{
                          background: isCatComplete ? '#e6f4ea' : '#f1f5f9',
                          border: isCatComplete ? '1px solid #a7f3d0' : '1px solid #e2e8f0',
                          color: isCatComplete ? '#137333' : '#64748b',
                          fontSize: '0.68rem',
                          fontWeight: 800,
                          padding: '3px 9px',
                          borderRadius: '12px'
                        }}>
                          {catCollectedCount} / {categoryStickers.length} gesammelt {isCatComplete ? '✓' : ''}
                        </span>
                      </div>
                    </div>

                    {/* 4-Column Grid for this category row */}
                    <div className="panini-row-grid">
                      {categoryStickers.map(st => {
                        const info = activeStickerSource[st.id] || { count: 0, details: [] };
                        const isCollected = info.count > 0;
                        const isLegendary = st.rarity === 'legendary';
                        const isEpic = st.rarity === 'epic';
                        const isRare = st.rarity === 'rare';

                        return (
                          <div
                            key={st.id}
                            className="panini-sticker-card"
                            onClick={() => {
                              if (!readOnly && isDevSimulationActive) {
                                awardSticker(st.id, "Simulation");
                              } else {
                                setSelectedPreviewSticker(st);
                              }
                            }}
                            style={{
                              background: isCollected ? '#ffffff' : '#f8fafc',
                              border: isCollected 
                                ? (isLegendary ? '2px solid #eab308' : isEpic ? '2px solid #af52de' : isRare ? '2px solid #3b82f6' : '2px solid #34a853') 
                                : '1.5px dashed #cbd5e1',
                              borderRadius: '20px',
                              padding: '18px 14px 14px 14px',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              textAlign: 'center',
                              gap: '10px',
                              position: 'relative',
                              boxShadow: isCollected 
                                ? (isLegendary ? '0 8px 24px -4px rgba(234, 179, 8, 0.22), 0 1px 3px rgba(0,0,0,0.02)' : '0 6px 18px -4px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.02)') 
                                : 'inset 0 1px 4px rgba(0,0,0,0.02)',
                              cursor: 'pointer',
                              boxSizing: 'border-box',
                              minHeight: '260px',
                              justifyContent: 'space-between'
                            }}
                          >
                            {/* Holographic foil overlay for legendary/epic stickers */}
                            {isCollected && (isLegendary || isEpic) && (
                              <div 
                                className="holo-foil-overlay" 
                                style={{
                                  position: 'absolute',
                                  inset: 0,
                                  borderRadius: '18px',
                                  pointerEvents: 'none',
                                  opacity: isLegendary ? 0.35 : 0.2,
                                  zIndex: 1
                                }} 
                              />
                            )}

                            {/* Manual Award Button for Teachers ONLY */}
                            {!readOnly && st.id !== 'song-master' && !st.auto && (
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
                                  width: '26px',
                                  height: '26px',
                                  borderRadius: '50%',
                                  background: st.color,
                                  color: 'white',
                                  border: 'none',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer',
                                  boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                                  zIndex: 10,
                                  fontWeight: 'bold',
                                  fontSize: '0.9rem'
                                }}
                                title="Sticker manuell vergeben (Nur für Lehrer)"
                                className="hover-scale"
                              >
                                +
                              </button>
                            )}

                            {/* Rarity Pill Badge */}
                            <div style={{
                              position: 'absolute',
                              top: '12px',
                              right: '12px',
                              zIndex: 5,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              {isCollected && st.multi && info.count > 1 && (
                                <span style={{
                                  background: st.color,
                                  color: 'white',
                                  fontWeight: 900,
                                  fontSize: '0.66rem',
                                  padding: '2px 6px',
                                  borderRadius: '10px',
                                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                }}>
                                  x{info.count}
                                </span>
                              )}

                              <span style={{
                                background: isCollected 
                                  ? (isLegendary ? '#fef3c7' : isEpic ? '#f3e8ff' : isRare ? '#eff6ff' : '#e6f4ea') 
                                  : '#f1f5f9',
                                color: isCollected 
                                  ? (isLegendary ? '#b45309' : isEpic ? '#7e22ce' : isRare ? '#1d4ed8' : '#137333') 
                                  : '#94a3b8',
                                border: isCollected 
                                  ? (isLegendary ? '1px solid #fde68a' : isEpic ? '1px solid #e9d5ff' : isRare ? '1px solid #bfdbfe' : '1px solid #a7f3d0') 
                                  : '1px solid #e2e8f0',
                                fontSize: '0.62rem',
                                fontWeight: 800,
                                padding: '2px 7px',
                                borderRadius: '8px',
                                letterSpacing: '0.02em',
                                textTransform: 'uppercase'
                              }}>
                                {st.rarityLabel || 'Standard'}
                              </span>
                            </div>

                            {/* Top info section: Graphic Badge */}
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', gap: '8px', marginTop: '10px' }}>
                              {/* BALANCED DIE-CUT STICKER GRAPHIC (100px Diameter) */}
                              <div style={{
                                width: '100px',
                                height: '100px',
                                borderRadius: '50%',
                                background: isCollected ? st.bg : '#f1f5f9',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                position: 'relative',
                                border: isCollected ? '3.5px solid #ffffff' : '1.5px dashed #cbd5e1',
                                boxShadow: isCollected 
                                  ? '0 6px 16px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(0,0,0,0.04)' 
                                  : 'inset 0 2px 4px rgba(0,0,0,0.03)',
                                transition: 'all 0.25s ease',
                                zIndex: 2
                              }}>
                                <div style={{
                                  position: 'relative',
                                  width: '100%',
                                  height: '100%',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  borderRadius: '50%',
                                  overflow: 'hidden'
                                }}>
                                  {/* Emoji Fallback */}
                                  <span style={{ 
                                    fontSize: isCollected ? '2.7rem' : '2.4rem', 
                                    zIndex: 1, 
                                    filter: isCollected ? 'none' : 'grayscale(100%) opacity(0.3)',
                                    userSelect: 'none'
                                  }}>
                                    {st.emoji}
                                  </span>

                                  {/* High-Res PNG Image */}
                                  <img 
                                    src={`/stickers/${st.id}.png?v=1`} 
                                    alt={st.title} 
                                    loading="eager"
                                    decoding="async"
                                    style={{ 
                                      position: 'absolute',
                                      inset: 0,
                                      width: '100%', 
                                      height: '100%', 
                                      objectFit: 'cover',
                                      borderRadius: '50%',
                                      zIndex: 2,
                                      filter: isCollected ? 'drop-shadow(0 2px 6px rgba(0,0,0,0.1))' : 'grayscale(100%) opacity(0.3) blur(1px)',
                                      transition: 'opacity 0.2s ease-in-out'
                                    }}
                                    onError={(e) => {
                                      e.currentTarget.style.opacity = '0';
                                    }}
                                  />
                                </div>

                                {!isCollected && (
                                  <div style={{
                                    position: 'absolute',
                                    inset: 0,
                                    borderRadius: '50%',
                                    background: 'rgba(241, 245, 249, 0.75)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#94a3b8',
                                    fontSize: '1.2rem'
                                  }}>
                                    🔒
                                  </div>
                                )}
                              </div>

                              {/* STICKER TITLE & DESCRIPTION */}
                              <div style={{ position: 'relative', zIndex: 2, width: '100%' }}>
                                <h4 style={{ 
                                  margin: '0 0 3px 0', 
                                  fontSize: '0.9rem', 
                                  fontWeight: 900, 
                                  color: isCollected ? '#0f172a' : '#64748b' 
                                }}>
                                  {st.title}
                                </h4>
                                <p style={{ 
                                  margin: 0, 
                                  fontSize: '0.72rem', 
                                  color: isCollected ? '#64748b' : '#94a3b8', 
                                  fontWeight: 600, 
                                  lineHeight: '1.3' 
                                }}>
                                  {st.desc}
                                </p>
                              </div>
                            </div>

                            {/* Bottom status / history preview */}
                            <div style={{ width: '100%', zIndex: 2, paddingTop: '6px' }}>
                              {isCollected ? (
                                <div style={{
                                  width: '100%',
                                  borderTop: '1px solid #f1f5f9',
                                  paddingTop: '6px',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  fontSize: '0.66rem',
                                  color: '#34a853',
                                  fontWeight: 750
                                }}>
                                  <span>✓ Freigeschaltet</span>
                                  <span style={{ color: '#94a3b8', fontWeight: 600 }}>
                                    {st.multi ? `${info.count}x` : (info.details[0]?.date || 'Aktiv')}
                                  </span>
                                </div>
                              ) : (
                                <div style={{
                                  width: '100%',
                                  borderTop: '1px solid #f1f5f9',
                                  paddingTop: '6px',
                                  display: 'flex',
                                  justifyContent: 'center',
                                  alignItems: 'center',
                                  fontSize: '0.66rem',
                                  color: '#94a3b8',
                                  fontWeight: 600
                                }}>
                                  <span>🔒 Noch gesperrt</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
          </div>

          {/* BRAND NEW 3D PANINI INSPECTOR & DETAIL MODAL (REPLACING SPOTIFY-WRAPPED) */}
          {selectedPreviewSticker && (() => {
            const st = selectedPreviewSticker;
            const info = collectedStickers[st.id] || { count: 0, details: [] };
            const isCollected = info.count > 0;
            const details = info.details || [];
            
            const activeIdx = (selectedStickerDetailIdx !== null && selectedStickerDetailIdx >= 0 && selectedStickerDetailIdx < details.length)
              ? selectedStickerDetailIdx
              : (details.length > 0 ? details.length - 1 : 0);

            const activeDetail = details[activeIdx];
            const activeTopic = activeDetail?.topic || details.slice(-1)[0]?.topic;
            const displayDate = activeDetail?.date || info.details?.[0]?.date || new Date().toLocaleDateString('de-DE');
            const displayTopic = activeTopic || 'Herausforderung gemeistert';
            const isLegendary = st.rarity === 'legendary';
            const isEpic = st.rarity === 'epic';

            return (
              <div 
                style={{
                  position: 'fixed',
                  inset: 0,
                  background: 'rgba(15, 23, 42, 0.88)',
                  backdropFilter: 'blur(16px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 10000,
                  padding: '20px',
                  animation: 'fadeIn 0.25s ease-out'
                }} 
                onClick={() => setSelectedPreviewSticker(null)}
              >
                {/* 3D PANINI COLLECTOR'S CARD */}
                <div 
                  style={{
                    width: '100%',
                    maxWidth: '440px',
                    background: 'linear-gradient(145deg, #1e293b 0%, #0f172a 100%)',
                    borderRadius: '32px',
                    border: isLegendary 
                      ? '2.5px solid #eab308' 
                      : isEpic 
                      ? '2.5px solid #af52de' 
                      : '2px solid rgba(255, 255, 255, 0.12)',
                    boxShadow: isLegendary
                      ? '0 25px 60px -12px rgba(234, 179, 8, 0.35)'
                      : '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
                    padding: '32px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '20px',
                    color: 'white',
                    position: 'relative',
                    overflow: 'hidden',
                    animation: 'peelIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)'
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Holographic foil overlay inside card modal */}
                  {(isLegendary || isEpic) && (
                    <div 
                      className="holo-foil-overlay" 
                      style={{
                        position: 'absolute',
                        inset: 0,
                        borderRadius: '30px',
                        pointerEvents: 'none',
                        opacity: isLegendary ? 0.3 : 0.15
                      }} 
                    />
                  )}

                  {/* Close button */}
                  <button
                    onClick={() => setSelectedPreviewSticker(null)}
                    style={{
                      position: 'absolute',
                      top: '20px',
                      right: '20px',
                      background: 'rgba(255,255,255,0.08)',
                      border: 'none',
                      borderRadius: '50%',
                      width: '36px',
                      height: '36px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      color: '#94a3b8',
                      transition: 'all 0.15s',
                      zIndex: 10
                    }}
                    className="hover-scale"
                  >
                    <X size={18} />
                  </button>

                  {/* Header Badge & Rarity Tag with Schuljahr Stamp */}
                  <div style={{ textAlign: 'center', marginTop: '4px', zIndex: 2 }}>
                    <span style={{ 
                      fontSize: '0.72rem', 
                      fontWeight: 900, 
                      textTransform: 'uppercase', 
                      letterSpacing: '0.12em', 
                      color: isLegendary ? '#facc15' : isEpic ? '#c084fc' : st.color || '#34a853',
                      background: 'rgba(255,255,255,0.06)',
                      padding: '4px 14px',
                      borderRadius: '100px',
                      border: '1px solid rgba(255,255,255,0.1)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      <Star size={12} fill="currentColor" /> {st.rarityLabel || 'Standard'} • Schuljahr {getSchoolYearString(displayDate)}
                    </span>
                    <h3 style={{ fontSize: '1.65rem', fontWeight: 900, margin: '10px 0 0 0', letterSpacing: '-0.5px', color: '#ffffff' }}>
                      {st.title}
                    </h3>
                  </div>

                  {/* XXL STICKER DISPLAY IMAGE (170px) */}
                  <div style={{
                    width: '170px',
                    height: '170px',
                    borderRadius: '50%',
                    background: isCollected ? st.bg : 'rgba(255,255,255,0.05)',
                    border: '5px solid #ffffff',
                    boxShadow: isCollected 
                      ? `0 12px 30px ${st.color}50, 0 0 0 2px rgba(255,255,255,0.8)` 
                      : '0 8px 20px rgba(0,0,0,0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    position: 'relative',
                    zIndex: 2,
                    margin: '8px 0'
                  }}>
                    <img 
                      src={`/stickers/${st.id}.png?v=1`} 
                      alt={st.title} 
                      style={{ 
                        width: '100%', 
                        height: '100%', 
                        objectFit: 'cover',
                        filter: isCollected ? 'none' : 'grayscale(80%) opacity(0.75)'
                      }}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const parent = e.currentTarget.parentElement;
                        if (parent) {
                          const span = document.createElement('span');
                          span.style.fontSize = '4.5rem';
                          span.innerText = st.emoji;
                          span.style.filter = isCollected ? 'none' : 'grayscale(80%) opacity(0.5)';
                          parent.appendChild(span);
                        }
                      }}
                    />
                    {!isCollected && (
                      <div style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'rgba(15, 23, 42, 0.35)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        pointerEvents: 'none'
                      }}>
                        <Lock size={36} color="#facc15" style={{ filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.6))' }} />
                      </div>
                    )}
                  </div>

                  {/* Student Name & Instrument Badge */}
                  <div style={{ textAlign: 'center', width: '100%', zIndex: 2, marginTop: '-4px' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#ffffff', margin: 0, letterSpacing: '-0.02em' }}>
                      {actualStudentName}
                    </h2>
                    {studentInstrument && (
                      <span style={{ fontSize: '0.74rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '4px', display: 'block' }}>
                        {studentInstrument}
                      </span>
                    )}
                  </div>

                  {/* Song Master Interpret & Title Badge (Clean, Non-overloaded Meisterwerk Dedication) */}
                  {(st.category === 'songs' || st.id === 'song-master' || activeTopic) && (
                    <div style={{
                      width: '100%',
                      textAlign: 'center',
                      margin: '4px 0 0 0',
                      zIndex: 2
                    }}>
                      <div style={{ fontSize: '0.68rem', fontWeight: 900, color: '#facc15', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        <Music size={12} color="#facc15" /> Gemeistertes Werk
                      </div>
                      {(() => {
                        const topicStr = activeTopic || (details[0]?.topic) || (isCollected ? 'Song gemeistert' : '');
                        if (!topicStr) return null;
                        
                        if (topicStr.includes(' - ')) {
                          const parts = topicStr.split(' - ');
                          const artist = parts[0].trim();
                          const songTitle = parts.slice(1).join(' - ').trim();
                          return (
                            <div style={{ fontSize: '1.25rem', fontWeight: 950, color: '#ffffff', marginTop: '2px', wordBreak: 'break-word', letterSpacing: '-0.02em' }}>
                              <span style={{ color: '#facc15' }}>{artist}</span>
                              <span style={{ opacity: 0.45, margin: '0 6px', fontWeight: 400 }}>–</span>
                              <span>{songTitle}</span>
                            </div>
                          );
                        }
                        return (
                          <div style={{ fontSize: '1.25rem', fontWeight: 950, color: '#ffffff', marginTop: '2px', wordBreak: 'break-word', letterSpacing: '-0.02em' }}>
                            {topicStr}
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* Multi-song Sleek Chip Selector (Modern Glass Pills instead of heavy select box) */}
                  {details.length > 1 && (
                    <div style={{
                      width: '100%',
                      margin: '4px 0 0 0',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '5px',
                      zIndex: 3
                    }}>
                      <span style={{ fontSize: '0.65rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        {details.length} Songs im Repertoire (Klick zum Wechseln):
                      </span>
                      <div style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        justifyContent: 'center',
                        gap: '6px',
                        maxWidth: '100%'
                      }}>
                        {details.map((d: any, idx: number) => {
                          const isSel = idx === activeIdx;
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setSelectedStickerDetailIdx(idx)}
                              style={{
                                background: isSel ? 'rgba(250, 204, 21, 0.22)' : 'rgba(255, 255, 255, 0.06)',
                                border: isSel ? '1.5px solid #facc15' : '1px solid rgba(255, 255, 255, 0.12)',
                                color: isSel ? '#facc15' : '#e2e8f0',
                                borderRadius: '100px',
                                padding: '4px 12px',
                                fontSize: '0.74rem',
                                fontWeight: isSel ? 900 : 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                transition: 'all 0.15s ease',
                                boxShadow: isSel ? '0 2px 8px rgba(250, 204, 21, 0.25)' : 'none'
                              }}
                              className="hover-scale"
                            >
                              <span>🎵</span>
                              <span style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {d.topic}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Open, Borderless Description Flow */}
                  <div style={{ 
                    width: '100%', 
                    textAlign: 'center', 
                    padding: '8px 12px', 
                    zIndex: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}>
                    <p style={{ fontSize: '0.94rem', color: '#f8fafc', margin: 0, lineHeight: '1.45', fontWeight: 700 }}>
                      {st.desc}
                    </p>
                    {st.equiv && (
                      <p style={{
                        fontSize: '0.84rem',
                        fontWeight: 650,
                        color: '#38bdf8',
                        margin: 0,
                        lineHeight: '1.4'
                      }}>
                        {st.equiv}
                      </p>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '6px' }}>
                      <span style={{ 
                        fontSize: '0.74rem', 
                        color: isCollected ? '#4ade80' : '#94a3b8', 
                        fontWeight: 800,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        {isCollected ? (
                          <>
                            <Check size={13} color="#4ade80" /> Freigeschaltet ({info.count}x gesammelt)
                          </>
                        ) : (
                          <>
                            <Lock size={12} color="#94a3b8" /> {info.progressText || 'Noch nicht freigeschaltet'}
                          </>
                        )}
                      </span>
                      <span style={{ color: 'rgba(255,255,255,0.2)' }}>•</span>
                      <span style={{ fontSize: '0.74rem', color: '#34a853', fontWeight: 900 }}>
                        campus-groovelab.de
                      </span>
                    </div>
                  </div>

                  {/* Collection Timeline Details */}
                  {isCollected && details.length > 0 && (
                    <div style={{ 
                      width: '100%', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: '8px', 
                      maxHeight: '130px', 
                      overflowY: 'auto',
                      background: 'rgba(0,0,0,0.25)',
                      padding: '12px 16px',
                      borderRadius: '16px',
                      border: '1px solid rgba(255,255,255,0.08)',
                      zIndex: 2
                    }}>
                      <span style={{ fontSize: '0.66rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        Erhalten am (Klick zum Auswählen):
                      </span>
                      {details.map((dt: any, dIdx: number) => (
                        <div 
                          key={dIdx} 
                          onClick={() => setSelectedStickerDetailIdx(dIdx)}
                          style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center',
                            fontSize: '0.74rem', 
                            color: dIdx === activeIdx ? '#facc15' : '#cbd5e1', 
                            fontWeight: dIdx === activeIdx ? 900 : 600,
                            background: dIdx === activeIdx ? 'rgba(250, 204, 21, 0.18)' : 'transparent',
                            border: dIdx === activeIdx ? '1px solid rgba(250, 204, 21, 0.5)' : '1px solid transparent',
                            padding: '6px 10px',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                          className="hover-scale"
                        >
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '220px' }}>
                            {dIdx === activeIdx ? '✓ ' : ''}{dt.topic}
                          </span>
                          <span style={{ color: dIdx === activeIdx ? '#facc15' : '#94a3b8' }}>{dt.date}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px', zIndex: 2, marginTop: '4px' }}>
                    {isCollected && (
                      <button
                        type="button"
                        onClick={() => shareCard(st, activeTopic)}
                        style={{
                          width: '100%',
                          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '16px',
                          padding: '14px',
                          fontSize: '0.9rem',
                          fontWeight: 900,
                          cursor: 'pointer',
                          boxShadow: '0 6px 20px rgba(245, 158, 11, 0.35)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          transition: 'all 0.15s'
                        }}
                        className="hover-scale"
                      >
                        <Download size={18} />
                        <span>Sticker als JPG herunterladen</span>
                      </button>
                    )}

                    {st.id !== 'song-master' && !st.auto && (
                      <button
                        type="button"
                        onClick={() => {
                          const context = prompt(`Beschreibung für den Sticker "${st.title}" eingeben (z.B. Name des Auftritts):`);
                          if (context !== null) {
                            awardSticker(st.id, context || undefined);
                            setSelectedPreviewSticker(null);
                          }
                        }}
                        style={{
                          width: '100%',
                          background: st.color || '#34a853',
                          color: 'white',
                          border: 'none',
                          borderRadius: '16px',
                          padding: '12px',
                          fontSize: '0.82rem',
                          fontWeight: 900,
                          cursor: 'pointer',
                          boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
                          transition: 'all 0.15s'
                        }}
                        className="hover-scale"
                      >
                        + Sticker jetzt vergeben
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setSelectedPreviewSticker(null)}
                      style={{
                        width: '100%',
                        background: 'rgba(255, 255, 255, 0.06)',
                        color: '#94a3b8',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '16px',
                        padding: '12px',
                        fontSize: '0.82rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        transition: 'all 0.15s'
                      }}
                      className="hover-scale"
                    >
                      Schließen
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* STICKER AWARD CELEBRATION ANIMATION POPUP */}
          {awardedStickerToAnimate && (
            <div style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15, 23, 42, 0.92)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 20000,
              animation: 'fadeIn 0.25s ease-out'
            }}>
              <Confetti recycle={false} numberOfPieces={300} />
              <div 
                style={{
                  background: 'white',
                  borderRadius: '32px',
                  padding: '40px',
                  textAlign: 'center',
                  maxWidth: '420px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '24px',
                  boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
                  animation: 'scaleIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)'
                }}
              >
                <span style={{ fontSize: '0.8rem', fontWeight: 900, textTransform: 'uppercase', color: '#34a853', letterSpacing: '0.1em' }}>
                  Sticker freigeschaltet!
                </span>
                <div style={{
                  width: '160px',
                  height: '160px',
                  borderRadius: '50%',
                  background: awardedStickerToAnimate.bg,
                  border: `6px solid ${awardedStickerToAnimate.color}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: `0 12px 30px ${awardedStickerToAnimate.bg}`,
                  overflow: 'hidden',
                  animation: 'spinStickerAward 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)'
                }}>
                  <img 
                    src={`/stickers/${awardedStickerToAnimate.id}.png?v=1`} 
                    alt={awardedStickerToAnimate.title} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      const parent = e.currentTarget.parentElement;
                      if (parent) {
                        const span = document.createElement('span');
                        span.style.fontSize = '4.5rem';
                        span.innerText = awardedStickerToAnimate.emoji;
                        parent.appendChild(span);
                      }
                    }}
                  />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#0f172a', margin: '0 0 4px 0' }}>
                    {awardedStickerToAnimate.title}
                  </h2>
                  {(awardedStickerToAnimate.category === 'songs' || awardedStickerToAnimate.id === 'song-master' || topicName) && (
                    <div style={{ textAlign: 'center', margin: '4px 0 8px 0' }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 900, color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        <Music size={12} /> Interpret &amp; Songtitel
                      </div>
                      <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#0f172a', marginTop: '2px' }}>
                        {topicName || 'Song gemeistert'}
                      </div>
                    </div>
                  )}
                  <p style={{ fontSize: '0.88rem', color: '#475569', fontWeight: 650, margin: 0, lineHeight: 1.35 }}>
                    {awardedStickerToAnimate.desc}
                  </p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
                  <button
                    type="button"
                    onClick={() => downloadShareCard(awardedStickerToAnimate, topicName)}
                    style={{
                      background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '16px',
                      padding: '14px 24px',
                      fontWeight: 900,
                      fontSize: '0.92rem',
                      cursor: 'pointer',
                      boxShadow: '0 6px 18px rgba(245, 158, 11, 0.35)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      transition: 'all 0.15s'
                    }}
                    className="hover-scale"
                  >
                    <Download size={18} />
                    <span>Sticker als JPG herunterladen</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAwardedStickerToAnimate(null)}
                    style={{
                      background: 'linear-gradient(135deg, #34a853 0%, #2e7d32 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '16px',
                      padding: '12px 24px',
                      fontWeight: 900,
                      fontSize: '0.92rem',
                      cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(52, 168, 83, 0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      transition: 'all 0.15s'
                    }}
                    className="hover-scale"
                  >
                    <BookOpen size={18} />
                    <span>In mein Album kleben</span>
                  </button>
                </div>
              </div>
              <style dangerouslySetInnerHTML={{__html: `
                @keyframes spinStickerAward {
                  from { transform: scale(0) rotate(-180deg); }
                  to { transform: scale(1) rotate(0deg); }
                }
              `}} />
            </div>
          )}


        </div>
      ) : activeModalTab === 'audiobiography' ? (
        /* AUDIO-BIOGRAFIE VIEW (AKUSTISCHES STAMMBAUCH & MEILENSTEINE) */
        <AudioBiographyView
          student={{
            ...student,
            school_id: student?.school_id || (student as any)?.schoolId || studentSchoolId || localStorage.getItem('campus_school_id') || localStorage.getItem('groovelab_school_id') || localStorage.getItem('school_id'),
            school_name: schoolName || (student as any)?.school_name,
            schools: (student as any)?.schools || (window as any).__groovelab_active_school
          }}
          teacherId={teacherId}
          isTeacher={isTeacherTools}
          onBackToHub={() => { setActiveModalTab('document'); setActiveSubView('hub'); }}
          isMobileOrSim={isMobileOrSim}
          studentUiLevel={uiLevel}
        />
      ) : (
        /* COLUMN 4: 🏆 MEISTERWERKE & LOGBUCH (Full Width in Swiss Modernist Style) */
        <div style={{
          flex: 1,
          padding: isMobileOrSim ? '20px 16px 100px 16px' : (useNotebookLayout ? '32px 32px 80px 60px' : '32px 32px 80px 32px'),
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

            const masteredSongsMap = new Map<string, any>();

            // 1. From activeSongSkills
            (activeSongSkills || []).forEach(skill => {
              if (skill.is_stage_ready || skill.progress_percent === 100 || skill.status === 'MASTERED') {
                const title = skill.songs?.title || skill.title || skill.song_title;
                const artist = skill.songs?.artist || skill.artist || 'Unbekannt';
                if (title) {
                  const key = title.toLowerCase().trim();
                  masteredSongsMap.set(key, {
                    title,
                    artist,
                    instrument: skill.instrument || 'Campus',
                    id: skill.id
                  });
                }
              }
            });

            // 2. From progressItems
            (progressItems || []).forEach((item: any) => {
              const rawTopic = (item.topic_name || item.title || '').trim();
              if (!rawTopic || rawTopic.includes(' - Seite ') || rawTopic.startsWith('Hausaufgabe KW ') || rawTopic.toLowerCase() === 'test' || rawTopic.toLowerCase() === 'test - test' || rawTopic.toLowerCase() === 'test-test') return;
              if (item.status === 'MASTERED' || (item.progress_percent || 0) === 100) {
                const cleanT = rawTopic.replace(/\s*\([^)]*\)\s*$/, '').trim();
                const key = cleanT.toLowerCase();
                if (!masteredSongsMap.has(key)) {
                  let artist = 'Unbekannt';
                  let title = cleanT;
                  if (cleanT.includes(' - ')) {
                    const parts = cleanT.split(' - ');
                    artist = parts[0].trim();
                    title = parts.slice(1).join(' - ').trim();
                  }
                  masteredSongsMap.set(key, {
                    title,
                    artist,
                    instrument: item.instrument || 'Campus',
                    id: item.id
                  });
                }
              }
            });

            const masteredSongs = Array.from(masteredSongsMap.values());

            const hasMastered = masteredBooksList.length > 0 || masteredSongs.length > 0;

            if (!hasMastered) {
              return (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', margin: '40px auto 0 auto', maxWidth: '600px' }}>
                  <div style={{
                    padding: '60px 24px',
                    textAlign: 'center',
                    border: useNotebookLayout ? '2px dashed #32483e' : '2px dashed #cbd5e1',
                    borderRadius: '24px',
                    color: useNotebookLayout ? '#8fa399' : '#475569',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    background: useNotebookLayout ? 'rgba(0,0,0,0.1)' : 'white',
                    width: '100%'
                  }}>
                    Noch keine Meisterwerke eingetragen. Auf geht's! 🚀
                  </div>

                  {/* Audio-Tresor Retro-Kassette Promo Banner */}
                  <div style={{
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    borderRadius: '20px',
                    padding: '18px 22px',
                    color: 'white',
                    width: '100%',
                    boxShadow: '0 8px 22px rgba(16, 185, 129, 0.2)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '26px' }}>📼</span>
                      <div>
                        <div style={{ fontWeight: 900, fontSize: '0.92rem', letterSpacing: '-0.01em' }}>
                          Meisterwerk Audio-Tresor (Retro-Kassette 📼)
                        </div>
                        <div style={{ fontSize: '0.78rem', opacity: 0.95, marginTop: '3px', lineHeight: 1.4 }}>
                          Sobald deine Musikschule ein Tresor-Paket gebucht hat, wird jede gemeisterte Aufnahme auf einer digitalen <strong>Retro-Kassette mit Spulen-Animation, Datumsstempel &amp; Beschriftung</strong> dauerhaft für dich und deine Eltern archiviert!
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', fontSize: '0.72rem', background: 'rgba(255,255,255,0.15)', padding: '8px 14px', borderRadius: '12px', backdropFilter: 'blur(4px)' }}>
                      <span>🔒 <strong>100 % DSGVO-konform:</strong> Lückenlose Speicherung deiner musikalischen Meilensteine – ohne private Kamerafotos!</span>
                    </div>
                  </div>
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
                    color: useNotebookLayout ? '#34a853' : '#475569',
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
                      const songColor = getSongColor(skill.title || 'Song');
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
                          {renderSongVinylCover(songColor, 'sm')}

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
                              {skill.artist} - {skill.title}
                            </div>
                            <span style={{ fontSize: '0.72rem', background: '#dcfce7', color: '#15803d', padding: '3px 8px', borderRadius: '8px', fontWeight: 800, border: '1px solid #bbf7d0', flexShrink: 0 }}>
                              🏆 Meisterwerk
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
                    color: useNotebookLayout ? '#34a853' : '#475569',
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
                    const isStudentFocus = Boolean(pageState?.studentFocus);

                    let borderColor = '#ef4444';
                    let bg = '#fef2f2';
                    let textColor = '#991b1b';

                    if (status === 'homework') {
                      borderColor = '#eab308';
                      bg = '#fffbeb';
                      textColor = '#92400e';
                    } else if (status === 'mastered') {
                      borderColor = '#34a853';
                      bg = '#e6f4ea';
                      textColor = '#34a853';
                    } else if (status === 'purple') {
                      borderColor = '#af52de';
                      bg = '#f5f3ff';
                      textColor = '#6d28d9';
                    }

                    let solidActiveBg = '#ef4444';
                    if (status === 'homework') {
                      solidActiveBg = '#eab308';
                    } else if (status === 'mastered') {
                      solidActiveBg = '#34a853';
                    } else if (status === 'purple') {
                      solidActiveBg = '#af52de';
                    }

                    const isPageActive = activePageNumber === num;

                    return (
                      <button
                        key={num}
                        onClick={() => {
                          const isStudentCreated = Boolean(assigned?.isStudentCreated || assigned?.createdByRole === 'student' || book.created_by_role === 'student');
                          const isStudentViewingTeacherBook = Boolean(readOnly && !isStudentCreated);

                          if (activeBrush === 'STUDENT_FOCUS') {
                            toggleStudentFocusPage(assigned.lehrwerkId, num);
                            selectTextbookPage(assigned.lehrwerkId, num);
                            setShowAllPagesGrid(false);
                            return;
                          }

                          if (activeBrush !== 'NONE' && !isStudentViewingTeacherBook) {
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
                            setShowAllPagesGrid(false);
                            return;
                          }

                          const now = Date.now();
                          if (lastClickRef.current && lastClickRef.current.pageNum === num && (now - lastClickRef.current.timestamp) < 250) {
                            if (clickTimeoutRef.current) {
                              clearTimeout(clickTimeoutRef.current);
                              clickTimeoutRef.current = null;
                            }
                            lastClickRef.current = null;
                            if (!isStudentViewingTeacherBook) {
                              handlePageDoubleClick(assigned.lehrwerkId, num);
                            } else {
                              selectTextbookPage(assigned.lehrwerkId, num);
                            }
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
                          position: 'relative',
                          width: '46px',
                          height: '46px',
                          borderRadius: '50%',
                          border: isPageActive 
                            ? `2.5px solid ${solidActiveBg}` 
                            : (isStudentFocus ? '2.5px solid #8b5cf6' : `2px solid ${borderColor}`),
                          background: isPageActive ? solidActiveBg : bg,
                          color: isPageActive ? 'white' : textColor,
                          fontWeight: 900,
                          fontSize: '0.95rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.15s',
                          boxShadow: isStudentFocus 
                            ? (isPageActive ? '0 0 0 3px #8b5cf6, 0 4px 12px rgba(139, 92, 246, 0.4)' : '0 0 0 2px #8b5cf6, 0 2px 8px rgba(139, 92, 246, 0.35)')
                            : (isPageActive ? '0 4px 10px rgba(0,0,0,0.15)' : 'none'),
                          transform: isPageActive ? 'scale(1.1)' : 'none'
                        }}
                      >
                        <span>{num}</span>
                        {isStudentFocus && (
                          <span 
                            title="Schüler-Übefokus" 
                            style={{
                              position: 'absolute',
                              top: '-3px',
                              right: '-3px',
                              width: '12px',
                              height: '12px',
                              borderRadius: '50%',
                              background: '#8b5cf6',
                              border: '2px solid #ffffff',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                              display: 'inline-block'
                            }}
                          />
                        )}
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

        {/* Premium Schritt-für-Schritt Onboarding Modal Overlay */}
        {showProtokollOnboarding && (
          <div style={{
            position: 'absolute',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(28px)',
            WebkitBackdropFilter: 'blur(28px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            animation: 'fadeIn 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
          }}>
            <div style={{
              background: '#ffffff',
              borderRadius: '28px',
              width: '100%',
              maxWidth: '640px',
              padding: '36px',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.9)',
              border: '1.5px solid rgba(255, 255, 255, 0.8)',
              display: 'flex',
              flexDirection: 'column',
              gap: '24px',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {/* Top Progress Bar & Step Dots */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {[0, 1, 2, 3].map((stepIdx) => (
                    <div
                      key={stepIdx}
                      style={{
                        width: stepIdx === onboardingStep ? '28px' : '8px',
                        height: '8px',
                        borderRadius: '4px',
                        background: stepIdx === onboardingStep ? '#34a853' : (stepIdx < onboardingStep ? '#a7f3d0' : '#e2e8f0'),
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                      }}
                    />
                  ))}
                  <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#64748b', marginLeft: '6px' }}>
                    Schritt {onboardingStep + 1} von 4
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    try { localStorage.setItem('groovelab_protokoll_onboarding_seen', 'true'); } catch(e){}
                    setShowProtokollOnboarding(false);
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#94a3b8',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Überspringen
                </button>
              </div>

              {/* Step Content */}
              {onboardingStep === 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ background: '#e6f4ea', width: '52px', height: '52px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <BookOpen size={28} color="#34a853" />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.2rem', fontWeight: 950, color: '#0f172a', margin: 0 }}>
                        Dein zentrales Wochen-Protokoll
                      </h3>
                      <span style={{ fontSize: '0.74rem', color: '#34a853', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Wochenaufgaben & Lehrer-Notizen
                      </span>
                    </div>
                  </div>
                  <p style={{ fontSize: '0.88rem', color: '#475569', lineHeight: 1.6, margin: 0 }}>
                    Im <strong>Schüler-Protokoll</strong> findest du alle wöchentlichen Hausaufgaben, Lehrwerkseiten und Notizen deines Lehrers. Es bildet das Herzstück deines Musikunterrichts bei <strong>Campus-Groovelab</strong>.
                  </p>
                  <div style={{ background: '#f8fafc', borderRadius: '18px', padding: '16px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Check size={16} color="#34a853" />
                      <span>Transparenter Wochenfortschritt für Schüler & Eltern</span>
                    </div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Check size={16} color="#34a853" />
                      <span>Historie aller vergangenen Unterrichtsstunden nachschlagen</span>
                    </div>
                  </div>
                </div>
              )}

              {onboardingStep === 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ background: '#fef3c7', width: '52px', height: '52px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Clock size={28} color="#d97706" />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.2rem', fontWeight: 950, color: '#0f172a', margin: 0 }}>
                        Fokus-Timer, XP & Streaks
                      </h3>
                      <span style={{ fontSize: '0.74rem', color: '#d97706', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Selbstständiges Üben belohnen
                      </span>
                    </div>
                  </div>
                  <p style={{ fontSize: '0.88rem', color: '#475569', lineHeight: 1.6, margin: 0 }}>
                    Starte beim Üben zu Hause den <strong>Fokus-Timer</strong>. Erreiche mindestens 3 Minuten Fokuszeit, um deinen Tages-Bonus freizuschalten, XP-Punkte zu sammeln und deine Übe-Streak-Flamme am Brennen zu halten!
                  </p>
                  <div style={{ background: '#fffbeb', borderRadius: '18px', padding: '16px', border: '1px dashed #fde68a', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Flame size={24} color="#f97316" />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#b45309' }}>1 Min. Übezeit = 1 XP | Tages-Ziel = +10 XP Bonus</span>
                      <span style={{ fontSize: '0.74rem', color: '#d97706' }}>Disziplin zahlt sich aus: Halte deine Streak über 7, 14 & 30 Tage!</span>
                    </div>
                  </div>
                </div>
              )}

              {onboardingStep === 2 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ background: '#e0e7ff', width: '52px', height: '52px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Mic size={28} color="#4f46e5" />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.2rem', fontWeight: 950, color: '#0f172a', margin: 0 }}>
                        Audio-Aufnahme & Loopstation Studio
                      </h3>
                      <span style={{ fontSize: '0.74rem', color: '#4f46e5', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Interaktives Recording & Band-Labor
                      </span>
                    </div>
                  </div>
                  <p style={{ fontSize: '0.88rem', color: '#475569', lineHeight: 1.6, margin: 0 }}>
                    Nimm deine Übe-Fortschritte direkt als Sprach-/Instrumenten-Memo im Protokoll auf oder nutze die <strong>Web-Audio Loopstation</strong> zum Einspielen eigener Mehrspur-Beats & Songs!
                  </p>
                  <div style={{ background: '#f8fafc', borderRadius: '18px', padding: '16px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Headphones size={24} color="#4f46e5" />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#1e293b' }}>Sample-Accurate Recording & Dynamic Waveforms</span>
                      <span style={{ fontSize: '0.74rem', color: '#64748b' }}>Höre deine Aufnahmen jederzeit im Hausaufgabenheft an.</span>
                    </div>
                  </div>
                </div>
              )}

              {onboardingStep === 3 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ background: '#fef9c3', width: '52px', height: '52px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Award size={28} color="#ca8a04" />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.2rem', fontWeight: 950, color: '#0f172a', margin: 0 }}>
                        Meisterwerke & Panini-Sticker
                      </h3>
                      <span style={{ fontSize: '0.74rem', color: '#ca8a04', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Glänzende Auszeichnungen sammeln
                      </span>
                    </div>
                  </div>
                  <p style={{ fontSize: '0.88rem', color: '#475569', lineHeight: 1.6, margin: 0 }}>
                    Für gemeisterte Songs und Meilensteine erhältst du glänzende <strong>Panini-Sticker</strong> für dein virtuelles Sammelalbum. Sammle seltene, epische & legendäre Sticker und teile deine Urkunden!
                  </p>
                  <div style={{ background: '#fefce8', borderRadius: '18px', padding: '16px', border: '1px dashed #fef08a', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Star size={24} color="#eab308" />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#854d0e' }}>Dein persönliches Sticker-Sammelalbum</span>
                      <span style={{ fontSize: '0.74rem', color: '#a16207' }}>Erfolge bleiben dein ganzes Schuljahr über sichtbar!</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Bottom Control Buttons */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                <button
                  type="button"
                  disabled={onboardingStep === 0}
                  onClick={() => setOnboardingStep(prev => Math.max(0, prev - 1))}
                  style={{
                    background: 'transparent',
                    border: '1px solid #cbd5e1',
                    color: onboardingStep === 0 ? '#cbd5e1' : '#475569',
                    borderRadius: '12px',
                    padding: '10px 18px',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: onboardingStep === 0 ? 'default' : 'pointer'
                  }}
                >
                  Zurück
                </button>

                {onboardingStep < 3 ? (
                  <button
                    type="button"
                    onClick={() => setOnboardingStep(prev => Math.min(3, prev + 1))}
                    style={{
                      background: '#34a853',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '12px',
                      padding: '10px 24px',
                      fontSize: '0.84rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      boxShadow: '0 4px 14px rgba(52, 168, 83, 0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <span>Weiter</span>
                    <ChevronRight size={16} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      try { localStorage.setItem('groovelab_protokoll_onboarding_seen', 'true'); } catch(e){}
                      setShowProtokollOnboarding(false);
                    }}
                    style={{
                      background: 'linear-gradient(135deg, #34a853 0%, #16a34a 100%)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '12px',
                      padding: '10px 24px',
                      fontSize: '0.86rem',
                      fontWeight: 900,
                      cursor: 'pointer',
                      boxShadow: '0 6px 18px rgba(52, 168, 83, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <span>Protokoll erkunden 🚀</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );

    // ── Skill-Radar Drawer ──────────────────────────────────────────────
    const skillRadarDrawer = showSkillRadar ? createPortal(
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 999999, background: 'rgba(9,9,11,0.72)', backdropFilter: 'blur(18px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
        onClick={() => setShowSkillRadar(false)}
      >
        <div
          style={{ background: 'white', borderRadius: '28px', width: '100%', maxWidth: '840px', maxHeight: '90vh', overflowY: 'auto', padding: '20px', boxShadow: '0 30px 80px rgba(0,0,0,0.35)', display: 'flex', flexDirection: 'column', gap: '16px' }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid #f1f5f9' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#0f172a' }}>Skill-Radar Cockpit</h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>Entwicklungs-Analyse & Kompetenz-Cockpit</p>
            </div>
            <button
              onClick={() => setShowSkillRadar(false)}
              style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <X size={16} color="#475569" />
            </button>
          </div>

          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
            {renderSkillRadarTabContent()}
          </div>
        </div>
      </div>,
      document.body
    ) : null;
    // ────────────────────────────────────────────────────────────────────

    // Embed-Modus ohne Fullscreen: normal eingebettet (kein Overlay)
    if (isEmbed && !isFullscreen) {
      return (
        <>
          <div style={{ width: '100%', height: (isMobileOrSim || isMobileView) ? '100%' : 'calc(100vh - 120px)', minHeight: (isMobileOrSim || isMobileView) ? '100%' : '600px', fontFamily: '"Inter", sans-serif' }}>
            {content}
          </div>
          {skillRadarDrawer}
        </>
      );
    }

    const simTarget = typeof document !== 'undefined' ? (document.querySelector('.sim-viewport-mobile, .sim-viewport-portrait, .sim-viewport-tablet') as HTMLElement) : null;
    const portalTarget = simTarget || document.body;

    // Embed-Modus MIT Fullscreen ODER normales Modal → immer als Portal über alles
    return (
      <>
        {createPortal(
          <div
            ref={modalContainerRef}
            className="meisterwerk-modal-portal-overlay"
            style={{
              position: isInsideSim ? 'absolute' : 'fixed',
              inset: 0,
              zIndex: 99999,
              background: isFullscreen ? 'transparent' : (isMobileOrSim ? '#ffffff' : 'rgba(9, 9, 11, 0.85)'),
              backdropFilter: isFullscreen ? 'none' : 'blur(20px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: (isFullscreen || isInsideSim || isMobileView) ? '0' : '20px',
              fontFamily: '"Inter", sans-serif',
              overflow: 'hidden',
              overscrollBehavior: 'contain',
              transition: 'background 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          >
            {content}
          </div>,
          portalTarget
        )}
        {skillRadarDrawer}
      </>
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

// Lightweight WebAudio beep helper for 4-beat count-in
const playCountInBeep = (isAccent: boolean) => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(isAccent ? 960 : 640, ctx.currentTime);
    gain.gain.setValueAtTime(0.28, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  } catch {
    // silent fallback
  }
};

const InlineAudioPlayer: React.FC<{ 
  url: string; 
  label: string; 
  onDelete?: () => void; 
  duration?: number;
  themeColor?: string;
  themeBg?: string;
  badge?: string;
  badgeTitle?: string;
  badgeBg?: string;
  badgeColor?: string;
  onBadgeClick?: () => void;
  date?: string;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  onSaveEdited?: (result: { url: string; duration: number; label: string; mode: 'overwrite' | 'duplicate' }) => void;
}> = ({ 
  url, 
  label, 
  onDelete, 
  duration: initialDuration,
  themeColor = '#34a853',
  themeBg = '#e6f4ea',
  badge,
  badgeTitle,
  badgeBg = '#f1f5f9',
  badgeColor = '#475569',
  onBadgeClick,
  date,
  isFavorite,
  onToggleFavorite,
  onSaveEdited
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState<number>(initialDuration || 0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isLooping, setIsLooping] = useState(false);
  const [countInActive, setCountInActive] = useState(false);
  const [countInStep, setCountInStep] = useState<number | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [resolvedUrl, setResolvedUrl] = useState<string>(url);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const countInTimerRef = React.useRef<any>(null);
  const playerIdRef = React.useRef<string>(`player_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`);

  const notifyGlobalPlay = () => {
    window.dispatchEvent(new CustomEvent('campus-global-audio-play', { detail: { playerId: playerIdRef.current } }));
  };

  // 🎧 Global Single-Audio Manager: Stop if any other player on the page starts
  useEffect(() => {
    const handleOtherPlay = (e: any) => {
      if (e?.detail?.playerId && e.detail.playerId !== playerIdRef.current) {
        if (countInTimerRef.current) {
          clearTimeout(countInTimerRef.current);
          countInTimerRef.current = null;
          setCountInStep(null);
        }
        if (audioRef.current && !audioRef.current.paused) {
          audioRef.current.pause();
        }
        setIsPlaying(false);
      }
    };

    window.addEventListener('campus-global-audio-play', handleOtherPlay);
    return () => window.removeEventListener('campus-global-audio-play', handleOtherPlay);
  }, []);

  useEffect(() => {
    let active = true;
    let createdBlobUrl: string | null = null;

    if (url.startsWith('campus_blob_') || url.startsWith('campus_audio_')) {
      getBlob(url).then(raw => {
        if (active && raw) {
          const finalBlob = raw instanceof Blob ? raw : new Blob([raw], { type: 'audio/webm' });
          createdBlobUrl = URL.createObjectURL(finalBlob);
          setResolvedUrl(createdBlobUrl);
        }
      }).catch(err => console.warn('[InlineAudioPlayer] Blob load note:', err));
    } else {
      setResolvedUrl(url);
    }

    return () => {
      active = false;
      if (createdBlobUrl) URL.revokeObjectURL(createdBlobUrl);
      if (countInTimerRef.current) clearTimeout(countInTimerRef.current);
    };
  }, [url]);

  // 🔁 Seamless Gapless Native Loop
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.loop = isLooping;
    }
  }, [isLooping]);

  const togglePlay = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (countInTimerRef.current) {
      clearTimeout(countInTimerRef.current);
      countInTimerRef.current = null;
      setCountInStep(null);
      return;
    }
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      notifyGlobalPlay();
      if (countInActive) {
        let step = 4;
        setCountInStep(step);
        playCountInBeep(true);

        const runCount = () => {
          step -= 1;
          if (step > 0) {
            setCountInStep(step);
            playCountInBeep(false);
            countInTimerRef.current = setTimeout(runCount, 550);
          } else {
            setCountInStep(null);
            countInTimerRef.current = null;
            if (audioRef.current) {
              audioRef.current.loop = isLooping;
              audioRef.current.play().then(() => setIsPlaying(true)).catch(err => console.warn('[InlineAudioPlayer] Play error:', err));
            }
          }
        };
        countInTimerRef.current = setTimeout(runCount, 550);
      } else {
        audioRef.current.loop = isLooping;
        audioRef.current.play().then(() => setIsPlaying(true)).catch(err => console.warn('[InlineAudioPlayer] Play error:', err));
      }
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const handleLoadedMetadata = () => {
      if (audio.duration && isFinite(audio.duration)) {
        setDuration(Math.round(audio.duration));
      }
    };
    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };
    const handleEnded = () => {
      if (!isLooping) {
        setIsPlaying(false);
        setCurrentTime(0);
      }
    };

    if (audio.duration && isFinite(audio.duration)) {
      setDuration(Math.round(audio.duration));
    }

    audio.loop = isLooping;
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [resolvedUrl, isLooping]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
      (audioRef.current as any).preservesPitch = true;
    }
  }, [playbackRate]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // 24 dynamic waveform bar heights for organic audio visualization
  const waveformHeights = [35, 65, 30, 85, 55, 95, 70, 45, 80, 100, 60, 90, 75, 45, 80, 50, 70, 85, 40, 90, 60, 75, 45, 30];
  const progressRatio = duration > 0 ? currentTime / duration : 0;
  const isActiveOrPlaying = isPlaying || currentTime > 0;

  const formattedDate = (() => {
    if (!date) return '';
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' });
    } catch {
      return '';
    }
  })();

  const cleanTitle = label && label.trim() !== '' ? label.trim() : 'Aufnahme';

  return (
    <div style={{
      background: isPlaying ? '#f0fdf4' : '#ffffff',
      borderRadius: '14px',
      border: isPlaying ? `1.5px solid ${themeColor}` : '1.5px solid #e2e8f0',
      padding: '8px 14px',
      width: '100%',
      boxShadow: isPlaying ? `0 4px 16px ${themeColor}20, 0 1px 3px rgba(0,0,0,0.03)` : '0 1px 4px rgba(0,0,0,0.02)',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      boxSizing: 'border-box',
      position: 'relative',
      transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
      minHeight: '50px'
    }}>
      <audio ref={audioRef} src={resolvedUrl} />

      {/* Left: Play / Pause Circular Button (34px) */}
      <button
        type="button"
        onClick={(e) => togglePlay(e)}
        style={{
          width: '34px',
          height: '34px',
          borderRadius: '50%',
          background: countInStep !== null 
            ? '#f59e0b'
            : (isPlaying ? themeColor : `linear-gradient(135deg, ${themeColor} 0%, ${themeColor}ee 100%)`),
          color: '#ffffff',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          boxShadow: isPlaying ? `0 0 10px ${themeColor}55` : `0 2px 6px ${themeColor}33`,
          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          fontSize: countInStep !== null ? '0.86rem' : undefined,
          fontWeight: 900
        }}
        className="hover-scale"
        title={countInStep !== null ? `Einzähler: ${countInStep}` : (isPlaying ? 'Pause' : 'Abspielen')}
      >
        {countInStep !== null ? (
          <span>{countInStep}</span>
        ) : isPlaying ? (
          <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor">
            <rect x="6" y="5" width="4" height="14" rx="1.5" />
            <rect x="14" y="5" width="4" height="14" rx="1.5" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" style={{ marginLeft: '2px' }}>
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>

      {/* Middle: Title & Metadata */}
      <div style={{ flex: '1 1 auto', minWidth: '60px', display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
        <span style={{
          fontSize: '0.82rem',
          fontWeight: 850,
          color: '#0f172a',
          lineHeight: 1.2,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          display: 'block'
        }}>
          {cleanTitle}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.66rem', color: '#64748b', fontWeight: 650, whiteSpace: 'nowrap' }}>
          {formattedDate && <span>{formattedDate}</span>}
          {formattedDate && <span>•</span>}
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>
            {isActiveOrPlaying ? `${formatTime(currentTime)} / ${formatTime(duration)}` : `${formatTime(duration)} min`}
          </span>
        </div>
      </div>

      {/* Right Area: Dynamic Morphing (Paused = 4 Action Buttons | Playing = Live Waveform + Quick Pills) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0, marginLeft: 'auto' }}>
        {isPlaying ? (
          /* PLAYBACK MODE: Waveform + Quick Loop & Speed Pills */
          <>
            {/* Waveform Track with Touch Scrubbing */}
            <div 
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const newRatio = Math.max(0, Math.min(1, clickX / rect.width));
                const newTime = newRatio * (duration || 0);
                setCurrentTime(newTime);
                if (audioRef.current) audioRef.current.currentTime = newTime;
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '2px',
                height: '18px',
                width: '90px',
                cursor: 'pointer',
                padding: '2px 4px',
                background: '#f8fafc',
                borderRadius: '8px',
                border: '1px solid #e2e8f0'
              }}
              title="Klicken zum Spulen"
            >
              {waveformHeights.slice(0, 16).map((h, i) => {
                const barRatio = i / 16;
                const isFilled = barRatio <= progressRatio;
                return (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      height: `${h}%`,
                      minHeight: '3px',
                      borderRadius: '1.5px',
                      background: isFilled ? themeColor : '#cbd5e1',
                      transition: 'background 0.08s ease'
                    }}
                  />
                );
              })}
            </div>

            {/* Quick Loop Pill */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsLooping(!isLooping);
              }}
              style={{
                background: isLooping ? '#dcfce7' : '#f8fafc',
                border: isLooping ? '1.2px solid #16a34a' : '1px solid #cbd5e1',
                color: isLooping ? '#15803d' : '#64748b',
                borderRadius: '6px',
                padding: '4px 6px',
                fontSize: '0.62rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '28px',
                boxSizing: 'border-box'
              }}
              className="hover-scale-mini"
              title={isLooping ? 'Loop aktiv' : 'Loop aktivieren'}
            >
              <Repeat size={11} strokeWidth={isLooping ? 2.6 : 2} />
            </button>

            {/* Quick Speed Pill */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                const rates = [1, 0.85, 0.75, 0.5, 1.2];
                const nextRate = rates[(rates.indexOf(playbackRate) + 1) % rates.length];
                setPlaybackRate(nextRate);
              }}
              style={{
                background: playbackRate !== 1 ? '#eff6ff' : '#f8fafc',
                border: playbackRate !== 1 ? '1.2px solid #bfdbfe' : '1px solid #cbd5e1',
                color: playbackRate !== 1 ? '#2563eb' : '#64748b',
                borderRadius: '6px',
                padding: '4px 6px',
                fontSize: '0.62rem',
                fontWeight: 800,
                cursor: 'pointer',
                height: '28px',
                boxSizing: 'border-box'
              }}
              className="hover-scale-mini"
              title="Tempo anpassen"
            >
              {playbackRate}×
            </button>

            {/* ⭐ Star / Favorite Button (Playing Mode) */}
            {onToggleFavorite && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite();
                }}
                style={{
                  background: isFavorite ? '#fef3c7' : '#f8fafc',
                  border: isFavorite ? '1.2px solid #f59e0b' : '1px solid #cbd5e1',
                  color: isFavorite ? '#d97706' : '#94a3b8',
                  borderRadius: '6px',
                  padding: '4px 6px',
                  fontSize: '0.62rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '28px',
                  boxSizing: 'border-box',
                  transition: 'all 0.15s ease'
                }}
                className="hover-scale-mini"
                title={isFavorite ? "Aus Favoriten entfernen" : "Zu Favoriten hinzufügen"}
              >
                <Star size={12} strokeWidth={isFavorite ? 2.6 : 2} fill={isFavorite ? "#f59e0b" : "none"} color={isFavorite ? "#d97706" : "#94a3b8"} />
              </button>
            )}
          </>
        ) : (
          /* PAUSED / IDLE MODE: All 4 Action Buttons in 1 Sleek Row */
          <>
            {/* 🔁 Loop Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsLooping(!isLooping);
              }}
              style={{
                background: isLooping ? '#dcfce7' : '#f8fafc',
                border: isLooping ? '1.2px solid #16a34a' : '1px solid #cbd5e1',
                color: isLooping ? '#15803d' : '#64748b',
                borderRadius: '6px',
                padding: '4px 6px',
                fontSize: '0.62rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '28px',
                boxSizing: 'border-box'
              }}
              className="hover-scale-mini"
              title={isLooping ? 'Loop aktiv (Endlos-Schleife)' : 'Loop aktivieren (Endlos-Schleife für Play-Alongs)'}
            >
              <Repeat size={11} strokeWidth={isLooping ? 2.6 : 2} />
            </button>

            {/* ⏱️ 4-Beat Count-In Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setCountInActive(!countInActive);
              }}
              style={{
                background: countInActive ? '#dcfce7' : '#f8fafc',
                border: countInActive ? '1.2px solid #16a34a' : '1px solid #cbd5e1',
                color: countInActive ? '#15803d' : '#64748b',
                borderRadius: '6px',
                padding: '4px 6px',
                fontSize: '0.62rem',
                fontWeight: 850,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '2px',
                height: '28px',
                boxSizing: 'border-box'
              }}
              className="hover-scale-mini"
              title={countInActive ? '4-Beat Einzähler aktiv' : '4-Beat Einzähler vor Abspielen aktivieren'}
            >
              <Timer size={11} strokeWidth={countInActive ? 2.4 : 2} />
              <span>4</span>
            </button>

            {/* 🚀 Speed Rate Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                const rates = [1, 0.85, 0.75, 0.5, 1.2];
                const nextRate = rates[(rates.indexOf(playbackRate) + 1) % rates.length];
                setPlaybackRate(nextRate);
              }}
              style={{
                background: playbackRate !== 1 ? '#eff6ff' : '#f8fafc',
                border: playbackRate !== 1 ? '1.2px solid #bfdbfe' : '1px solid #cbd5e1',
                color: playbackRate !== 1 ? '#2563eb' : '#64748b',
                borderRadius: '6px',
                padding: '4px 6px',
                fontSize: '0.62rem',
                fontWeight: 800,
                cursor: 'pointer',
                height: '28px',
                boxSizing: 'border-box'
              }}
              className="hover-scale-mini"
              title="Tempo anpassen"
            >
              {playbackRate}×
            </button>

            {/* ✂️ Studio Editor Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsEditorOpen(true);
              }}
              style={{
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                color: '#6366f1',
                borderRadius: '6px',
                padding: '4px 6px',
                fontSize: '0.62rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '28px',
                boxSizing: 'border-box'
              }}
              className="hover-scale-mini"
              title="Aufnahme zuschneiden & Pitch verändern"
            >
              <Scissors size={11} strokeWidth={2.2} />
            </button>

            {/* ⭐ Star / Favorite Button */}
            {onToggleFavorite && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite();
                }}
                style={{
                  background: isFavorite ? '#fef3c7' : '#f8fafc',
                  border: isFavorite ? '1.2px solid #f59e0b' : '1px solid #cbd5e1',
                  color: isFavorite ? '#d97706' : '#94a3b8',
                  borderRadius: '6px',
                  padding: '4px 6px',
                  fontSize: '0.62rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '28px',
                  boxSizing: 'border-box',
                  transition: 'all 0.15s ease'
                }}
                className="hover-scale-mini"
                title={isFavorite ? "Aus Favoriten entfernen" : "Zu Favoriten hinzufügen"}
              >
                <Star size={12} strokeWidth={isFavorite ? 2.6 : 2} fill={isFavorite ? "#f59e0b" : "none"} color={isFavorite ? "#d97706" : "#94a3b8"} />
              </button>
            )}
          </>
        )}

        {/* Status Badge (1-Click Toggle) */}
        {badge && (
          <span 
            onClick={onBadgeClick ? (e) => { e.stopPropagation(); onBadgeClick(); } : undefined}
            style={{
              fontSize: '0.64rem',
              fontWeight: 800,
              background: badgeBg,
              color: badgeColor,
              padding: '3px 7px',
              borderRadius: '100px',
              whiteSpace: 'nowrap',
              display: 'inline-flex',
              alignItems: 'center',
              cursor: onBadgeClick ? 'pointer' : 'default',
              userSelect: 'none',
              height: '26px',
              boxSizing: 'border-box',
              transition: 'all 0.15s ease'
            }}
            className={onBadgeClick ? 'hover-scale-mini' : ''}
            title={badgeTitle || (onBadgeClick ? 'Klicken zum Umschalten (Privat / Für Lehrkraft freigeben)' : undefined)}
          >
            {badge}
          </span>
        )}

        {/* Delete Button */}
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              color: '#94a3b8',
              cursor: 'pointer',
              width: '26px',
              height: '26px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              marginLeft: '3px',
              marginRight: '2px',
              transition: 'all 0.15s ease'
            }}
            className="hover-scale"
            title="Aufnahme löschen"
          >
            <Trash2 size={12} strokeWidth={2} />
          </button>
        )}
      </div>

      {/* Studio Waveform & Pitch Editor Modal */}
      {isEditorOpen && (
        <AudioEditorModal
          isOpen={isEditorOpen}
          onClose={() => setIsEditorOpen(false)}
          audioUrl={resolvedUrl}
          initialLabel={cleanTitle}
          initialDuration={duration}
          onSave={(res) => {
            if (onSaveEdited) {
              onSaveEdited(res);
            }
            setIsEditorOpen(false);
          }}
        />
      )}
    </div>
  );
};

const RetroCassettePlayer: React.FC<{ 
  url: string; 
  duration: number; 
  index: number; 
  label?: string; 
  onDelete?: () => void;
  visibility?: 'private' | 'shared_with_teacher';
  onToggleVisibility?: () => void;
  onShareToPlaylist?: () => void;
  isStudentView?: boolean;
}> = ({ url, duration, index, label, onDelete, visibility, onToggleVisibility, onShareToPlaylist, isStudentView }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', maxWidth: '320px', gap: '8px' }}>
      <InlineAudioPlayer 
        url={url} 
        label={label || `Play-Along #${index + 1}`} 
        onDelete={onDelete}
        duration={duration}
      />

      {/* Student Action Toolbar: Privacy Toggle & Audio-Biografie Share */}
      {isStudentView && (
        <div style={{
          display: 'flex',
          gap: '6px',
          padding: '6px 8px',
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          {/* Privacy Toggle Button */}
          {onToggleVisibility && (
            <button
              type="button"
              onClick={onToggleVisibility}
              title={visibility === 'shared_with_teacher' 
                ? 'Für Lehrer freigegeben (Klicken zum Privatschalten)' 
                : 'Privat (Klicken, um für Lehrer freizugeben)'}
              style={{
                background: visibility === 'shared_with_teacher' ? '#e6f4ea' : '#f1f5f9',
                color: visibility === 'shared_with_teacher' ? '#16a34a' : '#475569',
                border: visibility === 'shared_with_teacher' ? '1px solid #bbf7d0' : '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '5px 8px',
                fontSize: '0.68rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                flex: 1,
                justifyContent: 'center',
                transition: 'all 0.15s ease'
              }}
            >
              {visibility === 'shared_with_teacher' ? (
                <>
                  <Unlock size={12} />
                  <span>🎓 Für Lehrer sichtbar</span>
                </>
              ) : (
                <>
                  <Lock size={12} />
                  <span>🔒 Privat (Nur für dich)</span>
                </>
              )}
            </button>
          )}

          {/* Share to Audio-Biografie Button */}
          {onShareToPlaylist && (
            <button
              type="button"
              onClick={onShareToPlaylist}
              title="Zu einer Playlist in der Audio-Biografie hinzufügen"
              style={{
                background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '5px 8px',
                fontSize: '0.68rem',
                fontWeight: 850,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                boxShadow: '0 2px 5px rgba(99, 102, 241, 0.25)',
                transition: 'all 0.15s ease'
              }}
              className="hover-scale-mini"
            >
              <Share2 size={12} />
              <span>💽 Playlist</span>
            </button>
          )}
        </div>
      )}

      {/* Teacher View: Indicator that this is a shared student recording */}
      {!isStudentView && visibility === 'shared_with_teacher' && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '5px',
          fontSize: '0.68rem',
          fontWeight: 800,
          color: '#16a34a',
          background: '#e6f4ea',
          padding: '4px 8px',
          borderRadius: '8px',
          border: '1px solid #bbf7d0'
        }}>
          <Check size={12} />
          <span>Vom Schüler für dich freigegeben</span>
        </div>
      )}
    </div>
  );
};
