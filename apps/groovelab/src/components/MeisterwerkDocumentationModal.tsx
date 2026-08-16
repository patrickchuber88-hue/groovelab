import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, Award, Flame, AlertCircle, BookOpen, Music, History, Plus, ChevronLeft, ChevronRight, ChevronDown, Book, Star, Sliders, RotateCcw, Mic, Square, Play, VolumeX, Volume2, Trash2, Headphones, Minimize2, Maximize2, Calendar, FileText, Zap, Clock, Info, Activity, ArrowLeft, Edit3, Disc, Search, Lock, Unlock, Share2, Sparkles, Radio } from 'lucide-react';
import Confetti from 'react-confetti';
import { supabase } from '../lib/supabase';
// @ts-ignore
import * as lamejs from '@breezystack/lamejs';
import { GrooveLoopstation } from './groovelab/GrooveLoopstation';
import { GroovePracticeCompanion } from './groovelab/GroovePracticeCompanion';
import { AudioBiographyView, CustomPlaylist, CustomPlaylistTrack } from './campus/AudioBiographyView';
import { processPureRawBlob, processStudioMastering } from '../utils/audioMasteringEngine';
import { storeBlob, getBlob } from '../utils/blobStorage';


export const ALL_STICKERS = [
  // Meilensteine / Üben (Einmalig - Mittelwert-Progression L1=5m, L2=10m, L3=15m im Schuljahr)
  { id: 'fleiss-pionier', emoji: '🐝', title: 'Fleiß-Pionier', desc: 'Für insgesamt 50 Minuten fleißiges Üben.', equiv: '💡 Level 1: Ca. 17 Fokus-Timer Sessions à 3 Min.', color: '#34a853', bg: 'rgba(52, 168, 83, 0.1)', auto: true, category: 'ueben', rarity: 'common', rarityLabel: 'Standard', multi: false },
  { id: 'uebe-meister', emoji: '🦉', title: 'Übe-Meister', desc: 'Für insgesamt 250 Minuten ausdauerndes Üben.', equiv: '💡 Level 1: Genau 50 Fokus-Timer Sessions à 5 Min.', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)', auto: true, category: 'ueben', rarity: 'rare', rarityLabel: 'Selten', multi: false },
  { id: 'uebe-legende', emoji: '👑', title: 'Übe-Legende', desc: 'Für unglaubliche 1000 Minuten Übezeit!', equiv: '💡 Level 2: Genau 100 Fokus-Timer Sessions à 10 Min. im Schuljahr', color: '#af52de', bg: 'rgba(175, 82, 222, 0.1)', auto: true, category: 'ueben', rarity: 'epic', rarityLabel: 'Episch', multi: false },
  { id: 'uebe-grossmeister', emoji: '🏆', title: 'Übe-Großmeister', desc: 'Für grandiose 2000 Minuten Übezeit!', equiv: '💡 Level 3: Ca. 133 Fokus-Timer Sessions à 15 Min. im Schuljahr', color: '#eab308', bg: 'rgba(234, 179, 8, 0.15)', auto: true, category: 'ueben', rarity: 'legendary', rarityLabel: 'Legendär', multi: false },

  // XP (Einmalig)
  { id: 'xp-sammler', emoji: '⭐', title: 'XP-Sammler', desc: '250 XP auf dem Profil gesammelt.', equiv: '🎯 25 Fokus-Ziele im Schuljahr erreicht', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)', auto: true, category: 'xp', rarity: 'common', rarityLabel: 'Standard', multi: false },
  { id: 'xp-champion', emoji: '🎖️', title: 'XP-Champion', desc: '1000 XP auf dem Profil gesammelt.', equiv: '🎯 100 Fokus-Ziele im Schuljahr erreicht', color: '#ec4899', bg: 'rgba(236, 72, 153, 0.1)', auto: true, category: 'xp', rarity: 'rare', rarityLabel: 'Selten', multi: false },
  { id: 'xp-meister', emoji: '🌌', title: 'XP-Meister', desc: 'Phänomenale 2500 XP auf dem Profil gesammelt.', equiv: '🎯 Level 2: 250 Fokus-Ziele im Schuljahr erreicht', color: '#6366f1', bg: 'rgba(99, 102, 241, 0.1)', auto: true, category: 'xp', rarity: 'epic', rarityLabel: 'Episch', multi: false },
  { id: 'xp-legende', emoji: '💎', title: 'XP-Legende', desc: 'Unglaubliche 5000 XP auf dem Profil gesammelt.', equiv: '🎯 Level 3: Repertoire-Großmeister im Schuljahr', color: '#3c0d93', bg: 'rgba(60, 13, 147, 0.15)', auto: true, category: 'xp', rarity: 'legendary', rarityLabel: 'Legendär', multi: false },

  // Streaks (Einmalig)
  { id: 'dranbleiber', emoji: '🔥', title: 'Dranbleiber', desc: 'Erreiche eine Übe-Streak von 3 Tagen.', equiv: '🔥 1 volle Schulwoche konstant am Instrument geblieben', color: '#f97316', bg: 'rgba(249, 115, 22, 0.1)', auto: true, category: 'streaks', rarity: 'common', rarityLabel: 'Standard', multi: false },
  { id: 'wochen-held', emoji: '📆', title: 'Wochen-Held', desc: 'Erreiche eine Übe-Streak von 7 Tagen.', equiv: '🔥 7 Tage in Folge ohne einen einzigen Tag Pause', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)', auto: true, category: 'streaks', rarity: 'rare', rarityLabel: 'Selten', multi: false },
  { id: 'streak-koenig', emoji: '⚡', title: 'Streak-König', desc: 'Unglaubliche Übe-Streak von 21 Tagen gehalten!', equiv: '🔥 3 Wochen am Stück diszipliniert am Ball geblieben', color: '#eab308', bg: 'rgba(234, 179, 8, 0.1)', auto: true, category: 'streaks', rarity: 'epic', rarityLabel: 'Episch', multi: false },
  { id: 'streak-kaiser', emoji: '👑', title: 'Streak-Kaiser', desc: 'Legendäre Übe-Streak von 30 Tagen gehalten!', equiv: '🔥 1 ganzer Monat lückenlose Übe-Disziplin', color: '#7c2d12', bg: 'rgba(124, 45, 18, 0.15)', auto: true, category: 'streaks', rarity: 'legendary', rarityLabel: 'Legendär', multi: false },

  // Songs (Einmalig)
  { id: 'erster-erfolg', emoji: '🎵', title: 'Erster Erfolg', desc: 'Dein allererster gemeisterter Song (100%).', equiv: '🎵 Dein erster kompletter Song von Anfang bis Ende', color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.1)', auto: true, category: 'songs', rarity: 'common', rarityLabel: 'Standard', multi: false },
  { id: 'song-sammler', emoji: '📚', title: 'Song-Sammler', desc: 'Schon 3 Songs komplett gemeistert.', equiv: '🎵 Reicht bereits für ein kleines Mini-Konzert', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.1)', auto: true, category: 'songs', rarity: 'rare', rarityLabel: 'Selten', multi: false },
  { id: 'repertoire-riese', emoji: '🦖', title: 'Repertoire-Riese', desc: '5 Songs zu 100% gemeistert und im Repertoire!', equiv: '🎵 Ein vollständiges Set für deinen ersten Live-Auftritt', color: '#34a853', bg: 'rgba(52, 168, 83, 0.1)', auto: true, category: 'songs', rarity: 'epic', rarityLabel: 'Episch', multi: false },
  { id: 'repertoire-gigant', emoji: '🐉', title: 'Repertoire-Gigant', desc: '10 Songs zu 100% gemeistert und im Repertoire!', equiv: '🎵 Ein komplettes Album-Repertoire auf Bühnen-Niveau', color: '#137333', bg: 'rgba(19, 115, 51, 0.15)', auto: true, category: 'songs', rarity: 'legendary', rarityLabel: 'Legendär', multi: false },

  // Spezielle Auszeichnungen (Mehrfach vergebbar)
  { id: 'stage-star', emoji: '🎤', title: 'Bühnen-Star', desc: 'Für jeden Live-Auftritt vor Publikum.', equiv: '🌟 Bühnen-Erfahrung vor echtem Publikum gesammelt', color: '#a855f7', bg: 'rgba(168, 85, 247, 0.1)', auto: false, category: 'spezial', rarity: 'epic', rarityLabel: 'Episch', multi: true },
  { id: 'song-master', emoji: '🏆', title: 'Song-Master', desc: 'Wird für jeden zu 100% gemeisterten Song verliehen.', equiv: '🎸 Song zu 100% gemeistert und bühnenreif performt', color: '#eab308', bg: 'rgba(234, 179, 8, 0.1)', auto: false, category: 'spezial', rarity: 'rare', rarityLabel: 'Selten', multi: true },
  { id: 'creative-mind', emoji: '💡', title: 'Kreativ-Kopf', desc: 'Für eigene Kompositionen, Improvisation oder kreative Ideen.', equiv: '🎨 Eigenständiges musikalisches Engagement bewiesen', color: '#db2777', bg: 'rgba(219, 39, 119, 0.1)', auto: false, category: 'spezial', rarity: 'epic', rarityLabel: 'Episch', multi: true },
  { id: 'extra-mile', emoji: '🚀', title: 'Extra-Meile', desc: 'Für das freiwillige Erarbeiten von Zusatzaufgaben.', equiv: '🚀 Über das geforderte Ziel hinausgewachsen', color: '#2563eb', bg: 'rgba(37, 99, 235, 0.1)', auto: false, category: 'spezial', rarity: 'rare', rarityLabel: 'Selten', multi: true }
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

export const cleanNotesText = (text: string | null | undefined): string => {
  if (!text) return '';
  return text
    .split('\n')
    .filter(line => {
      const trimmed = line.trim();
      return !trimmed.startsWith('STICKER:') && 
             !trimmed.startsWith('AUDIO:') &&
             !trimmed.startsWith('LOOP:') &&
             !trimmed.startsWith('LATENCY:') &&
             !trimmed.startsWith('RHYTHM_SCORE:') &&
             !trimmed.startsWith('STUDENT_NOTE_PUBLIC:') &&
             !trimmed.startsWith('STUDENT_NOTE_PRIVATE:');
    })
    .join('\n')
    .trim();
};

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
  { key: 'tempo', label: 'Tempo', icon: '⏱', category: 'technical' },
  { key: 'rhythmus', label: 'Rhythmus', icon: '🥁', category: 'technical' },
  { key: 'intonation', label: 'Töne / Intonation', icon: '🎵', category: 'technical' },
  { key: 'fingersatz', label: 'Fingersatz', icon: '🖖', category: 'technical' },
  { key: 'ausdruck', label: 'Ausdruck', icon: '🎭', category: 'technical' },
  { key: 'auswendig', label: 'Auswendig', icon: '📖', category: 'technical' },
  { key: 'kontinuitaet', label: 'Übe-Regelmäßigkeit', icon: '🔄', category: 'practice' },
  { key: 'selbststaendigkeit', label: 'Selbstständiges Arbeiten', icon: '🧩', category: 'practice' },
];

export const MeisterwerkDocumentationModal: React.FC<MeisterwerkDocumentationModalProps> = ({ student, onClose, teacherId, initialLehrwerkId, initialViewMode, initialModalTab, onProfileClick, readOnly = false, isEmbed = false, isTeacherTools = false, uiLevel = 'pro' }) => {
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
  const [mobileProtokollTab, setMobileProtokollTab] = useState<'repertoire' | 'homework'>('repertoire');
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
      ? 'Hausaufgabenheft'
      : `${student.first_name}${student.last_name ? ' ' + student.last_name.trim().charAt(0) + '.' : ''}`;
  }, [readOnly, student.first_name, student.last_name]);

  const actualStudentName = useMemo(() => {
    const fName = (student.first_name || '').trim();
    if (!fName) return 'Musiker';
    const lInitial = student.last_name ? ' ' + student.last_name.trim().charAt(0) + '.' : '';
    return `${fName}${lInitial}`;
  }, [student.first_name, student.last_name]);

  const getSchoolYearString = (dateInput?: string | Date) => {
    const d = dateInput ? new Date(dateInput) : new Date();
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
  const [homeworkNotes, setHomeworkNotes] = useState<string>(() => {
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

  const [customTags, setCustomTags] = useState<string[]>([]);
  const [newCustomTagInput, setNewCustomTagInput] = useState<string>('');

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
  const [activeBrush, setActiveBrush] = useState<'NONE' | 'LOCKED' | 'HOMEWORK' | 'MASTERED' | 'THEORY'>('NONE');
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
  const [studentXP, setStudentXP] = useState<number>(0);
  const [studentStreak, setStudentStreak] = useState<number>(0);
  const [studentPracticeMinutes, setStudentPracticeMinutes] = useState<number>(0);
  const [weeklyPracticeDays, setWeeklyPracticeDays] = useState<number>(0);

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

  // Helper for 2-Tier Auto-Detection of Custom Textbausteine to Skill-Radar Tags
  const detectSkillTagFromText = (label: string, text: string, category?: string): string => {
    const combined = ((label || '') + ' ' + (text || '')).toLowerCase();

    if (combined.includes('metronom') || combined.includes('bpm') || combined.includes('tempo') || combined.includes('entschleunig') || combined.includes('schnecke')) {
      return 'tempo';
    }
    if (combined.includes('rhythmus') || combined.includes('takt') || combined.includes('puls') || combined.includes('groove') || combined.includes('timing') || combined.includes('einzählen')) {
      return 'rhythmus';
    }
    if (combined.includes('klang') || combined.includes('ton') || combined.includes('intonation') || combined.includes('sauber') || combined.includes('artikulation') || combined.includes('staccato') || combined.includes('legato')) {
      return 'intonation';
    }
    if (combined.includes('finger') || combined.includes('hand') || combined.includes('griff') || combined.includes('haltung') || combined.includes('lockerheit')) {
      return 'fingersatz';
    }
    if (combined.includes('ausdruck') || combined.includes('dynamik') || combined.includes('gefühl') || combined.includes('lautstärke') || combined.includes('phrasierung') || combined.includes('blind-flug')) {
      return 'ausdruck';
    }
    if (combined.includes('auswendig') || combined.includes('blatt') || combined.includes('gedächtnis') || combined.includes('ohne noten')) {
      return 'auswendig';
    }
    if (combined.includes('täglich') || combined.includes('routine') || combined.includes('ausdauer') || combined.includes('dreierspiel') || combined.includes('regelmäßig') || combined.includes('wiederhol')) {
      return 'kontinuitaet';
    }
    if (combined.includes('selbst') || combined.includes('pionier') || combined.includes('detektiv') || combined.includes('puzzle') || combined.includes('eigen')) {
      return 'selbststaendigkeit';
    }

    if (category === 'rhythm') return 'rhythmus';
    if (category === 'technique') return 'fingersatz';
    return 'rhythmus';
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
  const [activeViewMode, setActiveViewMode] = useState<'document' | 'recordings' | 'loopstation' | 'practice'>(initialViewMode || (isTeacherTools ? 'loopstation' : 'document'));

  // Speech Recognition & Audio play-along state
  const [isListening, setIsListening] = useState(false);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [audioLabel, setAudioLabel] = useState('');
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);
  const [mediaRecorderInstance, setMediaRecorderInstance] = useState<MediaRecorder | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const useNotebookLayout = false;
  const recordingTimerRef = React.useRef<any>(null);
  const accumulatedTranscriptRef = React.useRef<string>('');
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
      if (data?.summary) {
        setHomeworkNotes((prev: string) => prev ? `${prev}\n• ${data.summary}` : `• ${data.summary}`);
        setHasChanges(true);
        triggerDebouncedAutoSave(300);
      }
    } catch (e) {
      console.error("Error summarizing voice notes:", e);
      setHomeworkNotes((prev: string) => prev ? `${prev}\n• ${textStr}` : `• ${textStr}`);
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
    const audioNotesCount = homeworkNotesList.filter(note => note.startsWith("AUDIO:")).length;
    if (audioNotesCount >= 12) {
      alert("Limit erreicht! Du hast bereits 12 Sprachaufnahmen in diesem Protokoll. Bitte lösche eine alte Sprachaufnahme, bevor du eine neue aufnimmst.");
      return;
    }
    let durationInSeconds = 0;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });
      // 🎙️ Dynamic Audio Quality Adaptation based on Audio-Tresor Storage
      let targetSchoolId = student?.school_id || (student as any)?.schoolId || localStorage.getItem('groovelab_school_id') || localStorage.getItem('campus_school_id');
      let hasTresorStorage = false;
      if (targetSchoolId) {
        try {
          const { data: sch } = await supabase
            .from('schools')
            .select('storage_addon_gb, storage_addon_status')
            .eq('id', targetSchoolId)
            .maybeSingle();
          if (sch && Number(sch.storage_addon_gb || 0) > 0 && sch.storage_addon_status !== 'cancelled') {
            hasTresorStorage = true;
          }
        } catch (e) {}
      }

      // 256 kbps Crystal-Clear Studio Audio when Audio-Tresor is booked, else 64 kbps Space-Saving Compression
      const targetBitrate = hasTresorStorage ? 256000 : 64000;
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
          ? new MediaRecorder(stream, { mimeType, audioBitsPerSecond: targetBitrate }) 
          : new MediaRecorder(stream, { audioBitsPerSecond: targetBitrate });
      } catch (recErr) {
        recorder = new MediaRecorder(stream);
      }
      const chunks: BlobPart[] = [];
      
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };
      
      recorder.onstop = async () => {
        try {
          stream.getTracks().forEach(track => track.stop());
        } catch (e) {}

        const rawBlob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
        let blob = rawBlob;
        let url = URL.createObjectURL(rawBlob);

        // 🎛️ PURE RAW DSP: If Audio-Tresor is active, render Lossless 24-Bit / 48 kHz Broadcast WAV
        if (hasTresorStorage) {
          try {
            const pureRawResult = await processPureRawBlob(rawBlob, { targetLufs: -13.0, targetPeakDb: -1.0 });
            blob = pureRawResult.processedBlob;
            url = pureRawResult.processedUrl;
          } catch (dspErr) {
            console.warn('[Meisterwerk] Pure RAW DSP fallback to original blob:', dspErr);
          }
        }

        setAudioBlob(blob);
        setAudioUrl(url);
        
        setIsUploadingAudio(true);

        const saveAudioMetadata = async (audioUrlString: string) => {
          try {
            const userRoleInSession = sessionStorage.getItem('groovelab_user_role') || localStorage.getItem('groovelab_user_role');
            const isStudentSession = userRoleInSession === 'student' || readOnly || (!isTeacherTools && student.id !== 'teacher-self');
            const creatorRole = isStudentSession ? 'student' : 'teacher';
            const initialVisibility = isStudentSession ? 'private' : 'shared_with_teacher';
            const audioMetaStr = `AUDIO:${audioUrlString}|${durationInSeconds}|${new Date().toISOString()}|${audioLabel.trim() || 'Aufnahme'}|${creatorRole}|${initialVisibility}`;
            
            if (blob) {
              await storeBlob(audioUrlString, blob).catch(() => {});
            }

            setHomeworkNotesList(prev => {
              const updated = [...prev, audioMetaStr];
              syncHomeworkNotes(updated).catch(err => console.warn('[saveAudioMetadata] syncHomeworkNotes note:', err));
              return updated;
            });
            
            await fetchProgress().catch(() => {});
            notifyHomeworkChange();
            setAudioLabel('');
          } catch (saveErr) {
            console.warn("Failed to save audio metadata (fallback handled):", saveErr);
          }
        };

        try {
          const fileExt = blob.type.includes('wav') ? 'wav' : blob.type.includes('webm') ? 'webm' : blob.type.includes('ogg') ? 'ogg' : 'mp3';
          const fileName = `${student.id}_feedback_${Date.now()}.${fileExt}`;
          const filePath = `recordings/${fileName}`;
          
          let uploadedUrl = url;
          try {
            const { error: uploadErr } = await supabase.storage
              .from('campus-assets')
              .upload(filePath, blob, { 
                contentType: blob.type || (hasTresorStorage ? 'audio/wav' : 'audio/webm'),
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
                await supabase
                  .from('schools')
                  .update({ storage_used_bytes: currentBytes + blob.size })
                  .eq('id', targetSchoolId);
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
            const masteredResult = await processStudioMastering(rawBlob, { profile: 'acoustic_audiophile' });
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
        if (error) console.warn('[syncHomeworkNotes] Supabase bulk update warning:', error);
      }
    } catch (dbErr) {
      console.warn('[syncHomeworkNotes] Supabase sync notice (cached locally):', dbErr);
    }
  };



  // Fetch student's school's songs catalog
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
          .select('school_id')
          .eq('id', student.id)
          .maybeSingle();

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
  }, [student.id]);

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
          color: item.color || '#34a853'
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

      // Filter to songs belonging to the current teacher's mediathek if teacherId is provided
      const filteredSkills = (skillsData || []).filter((skill: any) => {
        if (!teacherId) return true;
        if (!skill.songs) return true;
        return !skill.songs.teacher_id || skill.songs.teacher_id === teacherId;
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

      // Pre-populate homeworkNotes with the active homework notes
      const currentWeek = getISOWeek();
      const currentWeekHomework = (data || []).find(item => 
        item.topic_name.startsWith('Hausaufgabe KW ') && 
        (getItemWeek(item) === currentWeek || (item.updated_at && getISOWeek(item.updated_at) === currentWeek))
      ) || (data || []).find(item => 
        item.topic_name.startsWith('Hausaufgabe KW ')
      ) || (data || []).find(item => 
        item.is_current_homework && (item.homework_notes || item.teacher_notes)
      ) || (data && data.length > 0 ? data[0] : null);

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

      // Also scan other recent items for teacher_notes if not yet found
      if (!loadedTeacherNotes && data && data.length > 0) {
        const itemWithTeacherNotes = data.find(item => item.teacher_notes && item.teacher_notes.trim() !== '');
        if (itemWithTeacherNotes?.teacher_notes) {
          loadedTeacherNotes = itemWithTeacherNotes.teacher_notes;
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
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `campus_auszeichnung_${filename}.png`;
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
      if (navigator.share) {
        downloadShareCard(sticker, topicOverride);
        await navigator.share({
          title: `Campus-Groovelab Auszeichnung: ${sticker.title}${topicOverride ? ` - ${topicOverride}` : ''}`,
          text: `Schau dir meine Auszeichnung "${sticker.title}" ${topicOverride ? `(${topicOverride}) ` : ''}an der ${schoolName} auf Campus-Groovelab an! 🎵🏆`,
          url: 'https://campus-groovelab.de'
        });
      } else {
        downloadShareCard(sticker, topicOverride);
        alert("Auszeichnung heruntergeladen! Du kannst das Bild jetzt in WhatsApp oder Instagram teilen. 📲");
      }
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
      const updatePayload: any = { is_current_homework: false };
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
        visibility: 'private',
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

    // Automatically include all MASTERED songs from progressItems in song-master sticker details
    const masteredSongsFromItems = progressItems.filter(item => {
      const t = item.topic_name.toLowerCase().trim();
      return !t.includes(' - seite ') && t !== 'test' && t !== 'test - test' && t !== 'test-test' && item.status === 'MASTERED';
    });
    masteredSongsFromItems.forEach(item => {
      const topicName = item.topic_name;
      const dateStr = item.updated_at ? new Date(item.updated_at).toLocaleDateString('de-DE') : new Date().toLocaleDateString('de-DE');

      const alreadyPresent = counts['song-master']?.details.some(d => d.topic.toLowerCase().trim() === topicName.toLowerCase().trim());
      if (!alreadyPresent && counts['song-master']) {
        counts['song-master'].count += 1;
        counts['song-master'].details.push({ topic: topicName, date: dateStr });
      }
    });

    Object.keys(simulatedStickers).forEach(id => {
      if (counts[id] && (simulatedStickers[id]?.count || 0) > 0) {
        counts[id] = simulatedStickers[id];
      }
    });

    return counts;
  }, [progressItems, simulatedStickers]);

  useEffect(() => {
    if (!student.id || loading || progressItems.length === 0) return;

    const runAutoStickerCheck = async () => {
      const collectedIds = new Set(Object.keys(collectedStickers).filter(id => collectedStickers[id].count > 0));
      const completedSongsCount = simulatedSongsCount !== null 
        ? simulatedSongsCount 
        : activeSongSkills.filter(s => s.progress === 100 || s.status === 'MASTERED').length;

      const autoAwards = [
        { id: 'fleiss-pionier', value: isDemoMode ? 5 : 50, current: studentPracticeMinutes, context: `${studentPracticeMinutes} Min. geübt` },
        { id: 'uebe-meister', value: isDemoMode ? 15 : 250, current: studentPracticeMinutes, context: `${studentPracticeMinutes} Min. geübt` },
        { id: 'uebe-legende', value: isDemoMode ? 30 : 1000, current: studentPracticeMinutes, context: `${studentPracticeMinutes} Min. geübt` },
        { id: 'uebe-grossmeister', value: isDemoMode ? 40 : 2000, current: studentPracticeMinutes, context: `${studentPracticeMinutes} Min. geübt` },

        { id: 'xp-sammler', value: isDemoMode ? 50 : 250, current: studentXP, context: `${studentXP} XP erreicht` },
        { id: 'xp-champion', value: isDemoMode ? 150 : 1000, current: studentXP, context: `${studentXP} XP erreicht` },
        { id: 'xp-meister', value: isDemoMode ? 300 : 2500, current: studentXP, context: `${studentXP} XP erreicht` },
        { id: 'xp-legende', value: isDemoMode ? 500 : 5000, current: studentXP, context: `${studentXP} XP erreicht` },

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

    // Save to active song skills if active song selected
    if (activeInputTab === 'active_song' && selectedActiveSongId) {
      try {
        const skillPercent = status === 'MASTERED' ? 100 : songProgressPercent;
        
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

    const specialNotes = homeworkNotesList.filter(n => typeof n === 'string' && (n.startsWith('AUDIO:') || n.startsWith('STICKER:') || n.startsWith('FEEDBACK:') || n.startsWith('STUDENT_NOTE_')));
    const finalNotesList = [...specialNotes];
    if (!isLehrwerkPage && !isSong && homeworkNotes.trim().length > 0) {
      finalNotesList.push(homeworkNotes.trim());
    }
    const combinedHomeworkNotes = JSON.stringify(finalNotesList);

    const hasHomeworkText = finalNotesList.length > 0;
    const isExplicitHomework = targetHomework || isCurrentHomework || status === 'IN_PROGRESS';
    const finalIsCurrentHomework = isExplicitHomework || (isLehrwerkPage || isSong ? homeworkNotes.trim().length > 0 : hasHomeworkText);

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

      // Direct reliable Supabase persistence
      const activeTId = await getCurrentTeacherId();
      const currentWeek = getISOWeek();

      const rowHomeworkNotes = (isLehrwerkPage || isSong)
        ? homeworkNotes.trim()
        : (finalTopicName.startsWith('Hausaufgabe KW ')
            ? combinedHomeworkNotes
            : JSON.stringify(finalNotesList.filter((n: string) => !n.startsWith('AUDIO:'))));

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

      // Immediate local backup
      try {
        localStorage.setItem(`campus_homework_notes_${student.id}`, combinedHomeworkNotes);
        localStorage.setItem(`campus_teacher_notes_${student.id}`, teacherNotes.trim());
      } catch (lsErr) {
        console.warn('[Meisterwerk] localStorage backup notice:', lsErr);
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

  const handleCreateAndAssignLehrwerk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLehrwerkTitle.trim()) return;

    setNewLehrwerkLoading(true);
    try {
      const schoolId = student?.school_id || student?.schoolId || studentSchoolId;
      const totalPages = parseInt(newLehrwerkPages, 10) || 50;

      let createdId = `custom-${Date.now()}`;
      let createdBook: any = null;

      try {
        const { data: newLehrwerk, error } = await supabase
          .from('lehrwerke')
          .insert({
            title: newLehrwerkTitle.trim(),
            total_pages: totalPages,
            emoji: '📚',
            school_id: schoolId || null,
            color: '#34a853'
          })
          .select('*')
          .single();

        if (!error && newLehrwerk) {
          createdId = newLehrwerk.id;
          createdBook = newLehrwerk;
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

      // Assign to student in localStorage & state
      const stored = localStorage.getItem('student_lehrwerke_progress');
      const parsed = stored ? JSON.parse(stored) : [];
      const isStudentCreator = readOnly || !teacherId;
      if (!parsed.some((item: any) => item.studentId === student.id && item.lehrwerkId === createdId)) {
        const newAssignment = {
          studentId: student.id,
          lehrwerkId: createdId,
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

    const activeWeeklyTargetTags = SKILL_TAGS.filter(tag => {
      if (pendingTargetFocusTags.includes(tag.key)) return true;
      const lowerText = allActiveNotesText.toLowerCase();
      return lowerText.includes(tag.label.toLowerCase()) || 
             lowerText.includes(tag.key) ||
             detectSkillTagFromText('', allActiveNotesText, '') === tag.key;
    }).map(t => t.key);

    const counts = SKILL_TAGS.map(tag => {
      let baseInterventions = feedbackEntries.filter((fb: any) => fb.tags?.includes(tag.key)).length;
      
      // 3-Stufen-Modell für Übe-Regelmäßigkeit basierend auf Wochen-Übetagen & Streaks (sofern vom Lehrer unmarkiert)
      if (tag.key === 'kontinuitaet') {
        if (baseInterventions === 0) {
          const effectiveDays = Math.max(weeklyPracticeDays, studentStreak);
          if (effectiveDays >= 4 || studentPracticeMinutes >= 60) {
            baseInterventions = 0; // Stufe 1: 100% Souverän Superkraft 🌟
          } else if (effectiveDays >= 2 || studentPracticeMinutes >= 20) {
            baseInterventions = 0.3; // Stufe 2: Solide / In Entwicklung 🌤️
          } else {
            baseInterventions = 1.0; // Stufe 3: Entwicklungs-Hebel 💎
          }
        }
      }

      const offset = skillOverrides[tag.key] ?? 0;
      const effectiveInterventions = Math.max(0, baseInterventions + offset);
      return {
        ...tag,
        baseInterventions,
        interventions: effectiveInterventions,
        count: effectiveInterventions
      };
    });

    const maxInterventions = Math.max(...counts.map(c => c.interventions), 1);
    const tagCounts = counts.map(t => ({
      ...t,
      pct: Math.max(0.18, (maxInterventions - t.interventions) / maxInterventions)
    }));

    const topStrength = tagCounts.find(t => t.interventions === 0) || tagCounts[0];
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

    let superkraftDesc = 'Exzellente musikalische Entwicklung in deinen Unterrichtsstunden!';
    if (topStrength) {
      switch (topStrength.key) {
        case 'tempo': superkraftDesc = 'Dein inneres Metronom läuft hervorragend! Du hältst das Pulsgefühl stabil und sicher.'; break;
        case 'rhythmus': superkraftDesc = 'Groove & Timing pur! Du triffst den Schlag genau auf den Punkt und gibst dem Stück echten Fluss.'; break;
        case 'intonation': superkraftDesc = 'Schöne Tonkultur! Dein Klang ist sauber, klar und bewusst geformt.'; break;
        case 'fingersatz': superkraftDesc = 'Mühelose Fingerfertigkeit! Dein durchdachter Fingersatz lässt anspruchsvolle Stellen leicht klingen.'; break;
        case 'ausdruck': superkraftDesc = 'Voller Gefühl & Dynamik! Du nimmst die Zuhörer mit und gestaltest Phrasen lebendig.'; break;
        case 'auswendig': superkraftDesc = 'Starkes Gedächtnis! Du verinnerlichst Musikstücke mit Leichtigkeit und spielst frei.'; break;
        case 'kontinuitaet': superkraftDesc = 'Ausdauer-Talent! Deine Ausdauer und dein regelmäßiges Üben tragen Früchte.'; break;
        case 'selbststaendigkeit': superkraftDesc = 'Echter Musik-Pionier! Du erarbeitest dir Stücke selbstständig und mit Freude.'; break;
      }
    }

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

    const dataPoints = tagCounts.map((t, i) => getPoint(i, Math.max(t.pct, 0.05)));
    const dataPath = dataPoints.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ') + ' Z';
    const gridLevels = [0.25, 0.5, 0.75, 1.0];
    const gridPaths = gridLevels.map(lvl => {
      const pts = SKILL_TAGS.map((_, i) => getPoint(i, lvl));
      return pts.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ') + ' Z';
    });

    const isMobileOrTabletView = (windowWidth <= 768 && !isInsideSimTabletLandscape) || isInsideSimMobile;
    return (
      <div style={{ flex: 1, width: '100%', display: 'flex', flexDirection: isMobileOrTabletView ? 'column' : 'row', overflowY: isMobileOrTabletView ? 'auto' : 'hidden', background: useNotebookLayout ? '#fcfaf7' : '#ffffff' }} className="modal-content-container custom-scrollbar">
        {/* LINKE BUCHSEITE: SKILL-RADAR */}
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
          background: 'radial-gradient(circle at 50% 50%, rgba(52, 168, 83, 0.07) 0%, rgba(59, 130, 246, 0.03) 50%, transparent 80%)'
        }}>
          {/* Glassmorphic Legend Pill */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            padding: '6px 14px',
            fontSize: '0.78rem',
            fontWeight: 800,
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
            zIndex: 5
          }}>
            <span style={{ color: '#15803d', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
              <strong>Außen</strong> = Superkraft 🌟
            </span>
            <span style={{ color: '#94a3b8' }}>•</span>
            <span style={{ color: '#1d4ed8', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6', display: 'inline-block' }} />
              <strong>Mitte</strong> = Hebel 💎
            </span>
          </div>

          {/* SVG Radar Center Container */}
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
              viewBox="-10 -10 540 520"
              style={{
                maxWidth: '520px',
                maxHeight: '500px',
                display: 'block',
                overflow: 'visible'
              }}
            >
              <defs>
                <radialGradient id="skillRadarGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#34a853" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.12" />
                </radialGradient>
                <filter id="radarShadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="4" stdDeviation="8" floodColor="#22c55e" floodOpacity="0.25" />
                </filter>
              </defs>

              {/* Grid Web Background */}
              {gridPaths.map((d, i) => (
                <path
                  key={i}
                  d={d}
                  fill="none"
                  stroke={i === 3 ? "#cbd5e1" : "#e2e8f0"}
                  strokeWidth={i === 3 ? "1.8" : "1.2"}
                  strokeDasharray={i < 3 ? "3 3" : "none"}
                />
              ))}

              {/* Axis Spokes */}
              {SKILL_TAGS.map((_, i) => {
                const pt = getPoint(i, 1);
                return (
                  <line
                    key={i}
                    x1={cx}
                    y1={cy}
                    x2={pt.x}
                    y2={pt.y}
                    stroke="#e2e8f0"
                    strokeWidth="1.2"
                  />
                );
              })}

              {/* Radar Polygon Fill & Border */}
              <path
                d={dataPath}
                fill="url(#skillRadarGlow)"
                stroke="#22c55e"
                strokeWidth="3.2"
                strokeLinejoin="round"
                filter="url(#radarShadow)"
              />

              {/* Data Nodes (Points) */}
              {tagCounts.map((tag, i) => {
                const p = getPoint(i, Math.max(tag.pct, 0.05));
                const isSuperkraft = tag.interventions === 0;
                return (
                  <g key={i}>
                    {isSuperkraft && (
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r="11"
                        fill="rgba(34, 197, 94, 0.18)"
                      />
                    )}
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={isSuperkraft ? 6.5 : 5.5}
                      fill={isSuperkraft ? '#22c55e' : '#3b82f6'}
                      stroke="#ffffff"
                      strokeWidth="2.5"
                      style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))' }}
                    />
                  </g>
                );
              })}

              {/* Skill Labels around the radar */}
              {tagCounts.map((tag, i) => {
                const p = getPoint(i, 1.20);
                const isSuperkraft = tag.interventions === 0;
                const isTargetFocus = activeWeeklyTargetTags.includes(tag.key);
                const cosVal = Math.cos(p.angle);
                
                let textAnchor: "middle" | "start" | "end" = "middle";
                if (cosVal > 0.25) textAnchor = "start";
                else if (cosVal < -0.25) textAnchor = "end";

                return (
                  <text
                    key={i}
                    x={p.x}
                    y={p.y}
                    textAnchor={textAnchor}
                    dominantBaseline="middle"
                    fontSize="11"
                    fontWeight="800"
                    fill={isTargetFocus ? '#d97706' : (isSuperkraft ? '#15803d' : '#1d4ed8')}
                    style={{ letterSpacing: '0.02em', filter: 'drop-shadow(0 1px 2px rgba(255,255,255,0.9))' }}
                  >
                    {tag.icon} {tag.label} {isTargetFocus ? '🎯' : (isSuperkraft ? '🌟' : '💎')}
                  </text>
                );
              })}
            </svg>
          </div>

          {/* LEHRER INTERAKTIONS-COCKPIT (NUR FÜR LEHRER / ADMIN) */}
          {(!readOnly || isTeacherTools) && (
            <div style={{
              width: '100%',
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '1px solid rgba(226, 232, 240, 0.9)',
              borderRadius: '18px',
              padding: '10px 14px',
              marginTop: '8px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
              zIndex: 5
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 900, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  ⚡ Lehrer-Cockpit: Hebel-Steuerung
                </span>
                <span style={{ fontSize: '0.66rem', color: '#64748b', fontWeight: 600 }}>1-Klick Freigabe</span>
              </div>

              {tagCounts.filter(t => t.interventions > 0).length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {tagCounts.filter(t => t.interventions > 0).map(t => (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => handleImproveSkill(t.key)}
                      style={{
                        background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                        border: 'none',
                        color: '#ffffff',
                        borderRadius: '12px',
                        padding: '4px 10px',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        boxShadow: '0 2px 6px rgba(34, 197, 94, 0.25)',
                        transition: 'all 0.2s ease'
                      }}
                      className="hover-scale"
                    >
                      <span>✨ {t.label} ({t.interventions}×): +1 Stufe nach außen</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: '0.72rem', color: '#15803d', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>🏆 Alle Bereiche stehen auf 100% Souverän! Keine aktiven Hebel.</span>
                </div>
              )}
            </div>
          )}

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

        {/* RECHTE BUCHSEITE: PÄDAGOGISCHES FEEDBACK */}
        <div
          ref={radarAnalysisCardsRef}
          style={{
            flex: isMobileOrTabletView ? 'none' : '1 1 0%',
            width: '100%',
            overflowY: isMobileOrTabletView ? 'visible' : 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            padding: isMobileOrTabletView ? '16px' : '24px',
            position: 'relative'
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* Active Weekly Practice Goal Card (Golden Focus Banner) */}
            {activeWeeklyTargetTags.length > 0 && (
              <div style={{
                background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
                border: '1.5px solid #f59e0b',
                borderRadius: '20px',
                padding: '16px',
                boxShadow: '0 4px 14px rgba(245, 158, 11, 0.15)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#b45309', fontWeight: 900, fontSize: '0.84rem' }}>
                  <span>🎯</span>
                  <span>AKTIVES ÜBE-LERNZIEL DIESER WOCHE</span>
                </div>
                <p style={{ margin: 0, fontSize: '0.76rem', color: '#92400e', fontWeight: 600, lineHeight: '1.4' }}>
                  Dein Lehrer hat dir für diese Woche folgende Schwerpunkte im Hausaufgabenheft gesetzt. Achte beim Üben besonders darauf:
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
                  {activeWeeklyTargetTags.map(tagKey => {
                    const tagObj = SKILL_TAGS.find(t => t.key === tagKey);
                    if (!tagObj) return null;
                    return (
                      <span key={tagKey} style={{
                        background: '#ffffff',
                        border: '1.5px solid #f59e0b',
                        color: '#b45309',
                        padding: '5px 12px',
                        borderRadius: '20px',
                        fontSize: '0.76rem',
                        fontWeight: 800,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 2px 6px rgba(245, 158, 11, 0.1)'
                      }}>
                        {tagObj.icon} {tagObj.label} 🎯
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Säule 1: Musikalische Superkräfte */}
            {(() => {
              const superkraftList = tagCounts.filter(t => t.interventions === 0);
              const count = superkraftList.length;
              return (
                <div style={{
                  background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                  border: '1.5px solid #86efac',
                  borderRadius: '20px',
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  boxShadow: '0 4px 14px rgba(34, 197, 94, 0.08)'
                }}>
                  <div style={{ fontSize: '1.3rem', lineHeight: 1 }}>🌟</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
                    <span style={{ fontSize: '0.64rem', fontWeight: 900, color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {count > 1 ? `Deine Musikalischen Superkräfte (${count}× Souverän)` : 'Deine Musikalische Superkraft'}
                    </span>
                    
                    {count > 0 ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', margin: '2px 0 4px' }}>
                        {superkraftList.map(s => (
                          <span key={s.key} style={{
                            background: '#ffffff',
                            border: '1px solid #86efac',
                            color: '#15803d',
                            borderRadius: '12px',
                            padding: '3px 9px',
                            fontSize: '0.74rem',
                            fontWeight: 800,
                            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            {s.icon} {s.label} 🌟
                          </span>
                        ))}
                      </div>
                    ) : (
                      <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 900, color: '#14532d' }}>
                        {topStrength.icon} {topStrength.label}
                      </h4>
                    )}

                    <p style={{ margin: '2px 0 0', fontSize: '0.74rem', color: '#166534', lineHeight: 1.38, fontWeight: 600 }}>
                      {count > 1 
                        ? `Eindrucksvolles musikalisches Fundament! In diesen ${count} Säulen zeigst du maximale Sicherheit und meisterst deine Stücke mit großer Souveränität.`
                        : superkraftDesc}
                    </p>
                  </div>
                </div>
              );
            })()}

            {/* Säule 2: Dein Größter Fortschritts-Hebel ODER Meisterstufe */}
            {(() => {
              const growthHebelList = tagCounts.filter(t => t.interventions > 0);
              const weakestLink = growthHebelList.length > 0
                ? growthHebelList.reduce((prev, curr) => curr.interventions > prev.interventions ? curr : prev, growthHebelList[0])
                : null;

              if (!weakestLink) {
                // Alle Bereiche auf 100% Souverän -> Meisterstufe Erreicht
                return (
                  <div style={{
                    background: 'linear-gradient(135deg, #fefce8 0%, #fef9c3 100%)',
                    border: '1.5px solid #fde047',
                    borderRadius: '20px',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    boxShadow: '0 4px 14px rgba(234, 179, 8, 0.12)'
                  }}>
                    <div style={{ fontSize: '1.4rem', lineHeight: 1 }}>🏆</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ fontSize: '0.64rem', fontWeight: 900, color: '#ca8a04', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Pädagogische Meisterstufe Erreicht
                      </span>
                      <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 900, color: '#854d0e' }}>
                        100% Souveränität auf allen Säulen!
                      </h4>
                      <p style={{ margin: '3px 0 0', fontSize: '0.74rem', color: '#713f12', lineHeight: 1.38, fontWeight: 600 }}>
                        Du beherrschst alle aktuell dokumentierten Bausteine perfekt! Es gibt aktuell keinen Schwachpunkt. Dein Lehrer wird dir bald neue Meisterwerke und Herausforderungen eröffnen.
                      </p>
                    </div>
                  </div>
                );
              }

              // Mindestens ein Bereich liegt im Inneren -> Schwächstes Glied als größter Hebel
              return (
                <div style={{
                  background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                  border: '1.5px solid #93c5fd',
                  borderRadius: '20px',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  boxShadow: '0 4px 14px rgba(59, 130, 246, 0.08)'
                }}>
                  <div style={{ fontSize: '1.3rem', lineHeight: 1 }}>💎</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontSize: '0.64rem', fontWeight: 900, color: '#1d4ed8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Dein Größter Fortschritts-Hebel
                    </span>
                    <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 900, color: '#1e40af' }}>
                      {weakestLink.icon} {weakestLink.label} ({weakestLink.interventions}× gezielt geübt)
                    </h4>
                    <p style={{ margin: '3px 0 0', fontSize: '0.74rem', color: '#1e3a8a', lineHeight: 1.38, fontWeight: 600 }}>
                      Man ist so stark wie das Kettenglied, das man als Nächstes stärkt! Wenn du in deinen nächsten Übe-Sessions gezielt an <strong>{weakestLink.label}</strong> arbeitest, machst du den spürbarsten Quantensprung.
                    </p>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Fußzeile: Ermutigender Entwicklungs-Impuls */}
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <span style={{ fontSize: '1.1rem' }}>💬</span>
            <p style={{ margin: 0, fontSize: '0.72rem', color: '#475569', lineHeight: 1.35, fontWeight: 600 }}>
              <em>Pädagogische Weisheit: Wer an seinen Herausforderungen arbeitet, feiert die größten Durchbrüche. Jede Überwindung verwandelt ein Hindernis in deine neue Stärke!</em>
            </p>
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
          background: 'rgba(255,255,255,0.22)',
          border: '1px solid rgba(255,255,255,0.3)',
          borderRadius: '20px',
          padding: '6px 14px',
          height: '32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          cursor: 'pointer',
          color: '#ffffff',
          fontWeight: 800,
          fontSize: '0.80rem',
          transition: 'all 0.18s ease',
          flexShrink: 0,
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
        }}
        className="hover-scale"
        title="Modale Ansicht schließen / Zurück zum Dashboard"
      >
        <ArrowLeft size={15} />
        <span>Zurück</span>
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
          <div className="header-top-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', minWidth: 0 }}>
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
                  {isTeacherTools ? 'Aufgabenheft / Tools' : 'Schüler-Protokoll'}
                </span>
              </div>
            </div>

            {/* Desktop Tabs */}
            <div style={{ display: isMobileOrSim ? 'none' : 'flex', gap: '8px', marginLeft: '12px' }} className="header-tabs-desktop-container">
              {isTeacherTools ? (
                <>
                  {/* Teacher tools order: Loopstation -> Übe-Begleiter -> Aufnahmen */}
                  <button
                    type="button"
                    onClick={() => { setActiveModalTab('document'); setActiveViewMode('loopstation'); setActiveSubView('hub'); }}
                    style={{
                      background: activeViewMode === 'loopstation' ? '#dc2626' : 'rgba(255,255,255,0.15)',
                      border: 'none',
                      color: '#ffffff',
                      padding: '6px 14px',
                      borderRadius: '20px',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.2s ease'
                    }}
                    className="hover-scale"
                  >
                    <Sliders size={14} />
                    <span>Loopstation</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setActiveModalTab('document'); setActiveViewMode('practice'); setActiveSubView('hub'); }}
                    style={{
                      background: activeViewMode === 'practice' ? '#eab308' : 'rgba(255,255,255,0.15)',
                      border: 'none',
                      color: '#ffffff',
                      padding: '6px 14px',
                      borderRadius: '20px',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.2s ease'
                    }}
                    className="hover-scale"
                  >
                    <Music size={14} />
                    <span>Übe-Begleiter</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setActiveModalTab('document'); setActiveViewMode('recordings'); setActiveSubView('hub'); }}
                    style={{
                      background: activeViewMode === 'recordings' ? '#4f46e5' : 'rgba(255,255,255,0.15)',
                      border: 'none',
                      color: '#ffffff',
                      padding: '6px 14px',
                      borderRadius: '20px',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.2s ease'
                    }}
                    className="hover-scale"
                  >
                    <Mic size={14} />
                    <span>Aufnahmen</span>
                  </button>
                </>
              ) : (
                <>
                  {/* Student order: Age-appropriate based on uiLevel */}
                  <button
                    type="button"
                    onClick={() => { setActiveModalTab('document'); setActiveViewMode('document'); setActiveSubView('hub'); }}
                    style={{
                      background: (activeModalTab === 'document' && activeViewMode === 'document' && activeSubView !== 'history') ? '#34a853' : 'rgba(255,255,255,0.15)',
                      border: 'none',
                      color: '#ffffff',
                      padding: uiLevel === 'junior' ? '8px 16px' : '6px 14px',
                      borderRadius: '20px',
                      fontSize: uiLevel === 'junior' ? '0.85rem' : '0.75rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.2s ease'
                    }}
                    className="hover-scale"
                  >
                    <BookOpen size={uiLevel === 'junior' ? 16 : 14} />
                    <span>{uiLevel === 'junior' ? 'Aufgaben' : 'Protokoll'}</span>
                  </button>

                  {/* Loopstation only in Level 3 (Pro) */}
                  {uiLevel === 'pro' && (
                    <button
                      type="button"
                      onClick={() => { setActiveModalTab('document'); setActiveViewMode('loopstation'); setActiveSubView('hub'); }}
                      style={{
                        background: (activeModalTab === 'document' && activeViewMode === 'loopstation') ? '#dc2626' : 'rgba(255,255,255,0.15)',
                        border: 'none',
                        color: '#ffffff',
                        padding: '6px 14px',
                        borderRadius: '20px',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.2s ease'
                      }}
                      className="hover-scale"
                    >
                      <Sliders size={14} />
                      <span>Loopstation</span>
                    </button>
                  )}

                  {/* Übe-Begleiter for Teen and Pro */}
                  {uiLevel !== 'junior' && (
                    <button
                      type="button"
                      onClick={() => { setActiveModalTab('document'); setActiveViewMode('practice'); setActiveSubView('hub'); }}
                      style={{
                        background: (activeModalTab === 'document' && activeViewMode === 'practice') ? '#eab308' : 'rgba(255,255,255,0.15)',
                        border: 'none',
                        color: '#ffffff',
                        padding: '6px 14px',
                        borderRadius: '20px',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.2s ease'
                      }}
                      className="hover-scale"
                    >
                      <Music size={14} />
                      <span>Übe-Begleiter</span>
                    </button>
                  )}

                  {/* Aufnahmen in all levels */}
                  <button
                    type="button"
                    onClick={() => { setActiveModalTab('document'); setActiveViewMode('recordings'); setActiveSubView('hub'); }}
                    style={{
                      background: (activeModalTab === 'document' && activeViewMode === 'recordings') ? '#4f46e5' : 'rgba(255,255,255,0.15)',
                      border: 'none',
                      color: '#ffffff',
                      padding: uiLevel === 'junior' ? '8px 16px' : '6px 14px',
                      borderRadius: '20px',
                      fontSize: uiLevel === 'junior' ? '0.85rem' : '0.75rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.2s ease'
                    }}
                    className="hover-scale"
                  >
                    <Mic size={uiLevel === 'junior' ? 16 : 14} />
                    <span>Aufnahmen</span>
                  </button>
                </>
              )}
            </div>

            {/* Actions (Always visible on all screen sizes, including Fullscreen + Close) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }} className="header-right-actions">
              {/* Live Auto-Save Status Badge */}
              {/* Live Auto-Save Interactive Button & Cloud Sync Pill (Apple & Enterprise+ Standard) */}
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => {
                    if (hasChanges && !saving) {
                      handleSave(true);
                    } else if (!saving) {
                      setStudentNotesSavedToast(true);
                      setTimeout(() => setStudentNotesSavedToast(false), 2000);
                    }
                  }}
                  disabled={saving}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: hasChanges 
                      ? 'linear-gradient(135deg, rgba(255,255,255,0.32) 0%, rgba(255,255,255,0.2) 100%)'
                      : 'rgba(255, 255, 255, 0.16)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    border: hasChanges 
                      ? '1px solid rgba(255, 255, 255, 0.65)' 
                      : '1px solid rgba(255, 255, 255, 0.25)',
                    padding: '5px 12px',
                    borderRadius: '20px',
                    color: '#ffffff',
                    fontSize: '0.73rem',
                    fontWeight: 800,
                    letterSpacing: '0.01em',
                    boxShadow: hasChanges 
                      ? '0 0 10px rgba(255, 255, 255, 0.3), 0 2px 6px rgba(0,0,0,0.12)' 
                      : '0 2px 5px rgba(0,0,0,0.08)',
                    cursor: saving ? 'wait' : 'pointer',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    outline: 'none'
                  }}
                  className="hover-scale"
                  title={hasChanges ? "Jetzt manuell in der Cloud sichern" : "Alle Änderungen sind live in der Cloud gesichert"}
                >
                  {saving ? (
                    <>
                      <span style={{ fontSize: '0.75rem', animation: 'spin 1.2s linear infinite', display: 'inline-block' }}>⏳</span>
                      <span style={{ color: '#ffffff' }}>Speichert...</span>
                    </>
                  ) : hasChanges ? (
                    <>
                      <span style={{ 
                        width: '7px', 
                        height: '7px', 
                        borderRadius: '50%', 
                        background: '#facc15',
                        display: 'inline-block',
                        boxShadow: '0 0 6px #facc15'
                      }} />
                      <span style={{ color: '#ffffff', fontWeight: 900 }}>Jetzt speichern</span>
                    </>
                  ) : (
                    <>
                      <span style={{ color: '#86efac', fontWeight: 900 }}>✓</span>
                      <span style={{ color: 'rgba(255, 255, 255, 0.95)' }}>Gespeichert</span>
                    </>
                  )}
                </button>
              )}

              <div className="header-desktop-archiv" style={{ display: isMobileOrSim ? 'none' : 'flex', alignItems: 'center', gap: '4px' }}>
                {renderSkillRadarButton()}
                {renderArchivButton()}
              </div>
              {renderFullscreenButton()}
              {renderCloseButton()}
            </div>

          </div>

          {/* Bottom Row (mobile/tablet only) - Apple Native Dropdown Selection Menu + Left/Right Quick-Click Buttons */}
          {(() => {
            const tabOptions = [
              { value: 'document', label: isTeacherTools ? 'Aufgabenheft' : 'Schüler-Protokoll' },
              { value: 'loopstation', label: 'Audio-Loopstation' },
              { value: 'practice', label: 'Übe-Begleiter' },
              { value: 'recordings', label: 'Audio-Aufnahmen' },
              { value: 'radar', label: 'Skill-Radar' },
              { value: 'history', label: 'Archiv & Historie' }
            ];

            const currentTabValue = 
              activeModalTab === 'skillradar' ? 'radar' :
              activeModalTab === 'stickeralbum' ? 'stickers' :
              activeModalTab === 'audiobiography' ? 'audiobiography' :
              activeModalTab === 'logbook' ? 'meisterwerke' :
              (activeModalTab === 'document' && activeSubView === 'history') ? 'history' :
              activeViewMode;

            const handleTabSelect = (val: string) => {
              if (val === 'radar') {
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
            overflowY: isMobileOrSim ? 'auto' : 'hidden',
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
              />
            </div>
          ) : activeViewMode === 'practice' ? (
            <div style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: isMobileOrSim ? '16px 16px calc(280px + env(safe-area-inset-bottom, 40px)) 16px' : '20px 24px 80px 24px'
            }}>
              <GroovePracticeCompanion
                useNotebookLayout={useNotebookLayout}
                isCampusModule={true}
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
          ) : activeViewMode === 'recordings' ? (
            <>
              {/* LEFT PAGE: Lehrer Aufnahmen */}
              <div style={{
                flex: isTeacherTools ? '1 1 100%' : '1 1 0%',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                background: useNotebookLayout ? '#faf8f2' : 'white',
                borderRadius: isTeacherTools ? '0 0 20px 20px' : (useNotebookLayout ? '0 0 0 20px' : '0'),
                boxShadow: useNotebookLayout ? '-10px 10px 20px rgba(0,0,0,0.15)' : 'none',
                borderRight: isTeacherTools ? 'none' : (useNotebookLayout ? '1px dashed #e5e0d4' : '1px solid #e8e8ed'),
                padding: isMobileOrSim ? '20px 16px calc(280px + env(safe-area-inset-bottom, 40px)) 16px' : '28px 28px 80px 28px'
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
                
                <h3 style={{
                  fontSize: '1rem',
                  fontWeight: 850,
                  color: '#1d1d1f',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <Mic size={16} /> Aufnahmen vom Lehrer
                </h3>

                {isTeacherTools && (
                  <div style={{
                    margin: '0 0 24px 0',
                    padding: '16px',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}>
                    {(() => {
                      return (
                        <>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span>Neue Aufnahme erstellen (max. 60s)</span>
                              </span>
                              {!isRecordingAudio ? (
                                <button
                                  type="button"
                                  onClick={startRecordingAudio}
                                  disabled={isUploadingAudio}
                                  style={{
                                    background: '#34a853',
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
                                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />
                                  <span>Aufnahme starten</span>
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
                                  <span style={{ width: '8px', height: '8px', background: 'currentColor', display: 'inline-block' }} />
                                  <span>Stopp ({audioDuration}s / 60s)</span>
                                </button>
                              )}
                            </div>
                            
                            {!isRecordingAudio && (
                              <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                                <input
                                  type="text"
                                  placeholder="Kassetten-Beschriftung (z.B. Play-Along Tempo 120)"
                                  value={audioLabel}
                                  onChange={(e) => setAudioLabel(e.target.value)}
                                  style={{
                                    flex: 1,
                                    fontSize: '0.74rem',
                                    padding: '6px 12px',
                                    borderRadius: '10px',
                                    border: '1px solid #cbd5e1',
                                    background: '#fff',
                                    outline: 'none',
                                    fontFamily: 'monospace'
                                  }}
                                />
                              </div>
                            )}
                          </div>

                          {isUploadingAudio && (
                            <div style={{ fontSize: '0.74rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span>⏳</span> Lade Audio-Feedback hoch...
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                )}

                {(() => {
                  const teacherAudios = homeworkNotesList
                    .map((note, originalIdx) => ({ note, originalIdx }))
                    .filter(item => item.note.startsWith("AUDIO:"))
                    .map(item => {
                      const parts = item.note.substring(6).split('|');
                      return {
                        url: parts[0],
                        duration: parseInt(parts[1] || '0', 10),
                        date: parts[2],
                        label: parts[3] || 'Play-Along',
                        role: parts[4] || 'teacher',
                        originalIdx: item.originalIdx
                      };
                    })
                    .filter(aud => aud.role === 'teacher');

                  if (teacherAudios.length === 0) {
                    return (
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', padding: '60px 20px', gap: '12px', textAlign: 'center' }}>
                        <Mic size={28} style={{ opacity: 0.4, color: '#64748b' }} />
                        <div>
                          <p style={{ fontWeight: 700, fontSize: '0.86rem', color: '#64748b', margin: '0 0 2px' }}>Keine Aufnahmen vom Lehrer</p>
                          <p style={{ fontSize: '0.74rem', margin: 0, opacity: 0.8 }}>Dein Lehrer hat für diese Woche noch keine Audio-Beispiele hinterlassen.</p>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap: '16px' }}>
                      {teacherAudios.map((aud, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'center' }}>
                          <RetroCassettePlayer
                            url={aud.url}
                            duration={aud.duration}
                            index={idx}
                            label={aud.label}
                            onDelete={readOnly ? undefined : () => handleDeleteNote(aud.originalIdx)}
                          />
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

                {/* RIGHT PAGE: Schüler Aufnahmen (Private Sandbox & Freigabe) */}
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
                  padding: '28px'
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

                  <h3 style={{
                    fontSize: '1rem',
                    fontWeight: 850,
                    color: '#1d1d1f',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    marginBottom: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <Music size={16} /> {isTeacherTools ? 'Freigegebene Schüler-Aufnahmen' : 'Eigene Aufnahmen (Schüler)'}
                  </h3>

                  {/* Encouraging Privacy info banner for students */}
                  {!isTeacherTools && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 12px',
                      background: 'rgba(241, 245, 249, 0.8)',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      fontSize: '0.72rem',
                      color: '#475569',
                      fontWeight: 650,
                      marginBottom: '16px'
                    }}>
                      <Lock size={14} color="#64748b" style={{ flexShrink: 0 }} />
                      <span>
                        Deine Aufnahmen sind <strong>standardmäßig privat</strong> und für deinen Lehrer unsichtbar. Du entscheidest selbst, wann du eine Aufnahme freigibst oder in deiner Audio-Biografie speicherst.
                      </span>
                    </div>
                  )}

                  {/* For student: render the recording widget on their page inside the gallery */}
                  {!isTeacherTools && (
                    <div style={{
                      margin: '0 0 24px 0',
                      padding: '16px',
                      background: '#fafafa',
                      borderRadius: '20px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px'
                    }}>
                      {(() => {
                        const audios = homeworkNotesList
                          .map((note, originalIdx) => ({ note, originalIdx }))
                          .filter(item => item.note.startsWith("AUDIO:"))
                          .map(item => {
                            const parts = item.note.substring(6).split('|');
                            return {
                              url: parts[0],
                              duration: parseInt(parts[1] || '0', 10),
                              date: parts[2],
                              label: parts[3] || 'Play-Along',
                              role: parts[4] || 'teacher',
                              visibility: parts[5] || (parts[4] === 'student' ? 'private' : 'shared_with_teacher'),
                              originalIdx: item.originalIdx
                            };
                          });
                        
                        const now = new Date();
                        const currentMonth = now.getMonth();
                        const currentYear = now.getFullYear();
                        const currentMonthAudios = audios.filter(aud => {
                          if (!aud.date) return false;
                          const d = new Date(aud.date);
                          return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
                        });
                        const totalUsedSeconds = currentMonthAudios.reduce((sum, aud) => sum + aud.duration, 0);
                        const monthlyLimitSeconds = 240;
                        const isLimitReached = totalUsedSeconds >= monthlyLimitSeconds;

                        return (
                          <>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span>Neue Aufnahme erstellen (max. 60s)</span>
                                </span>
                                {!isRecordingAudio ? (
                                  <button
                                    type="button"
                                    onClick={startRecordingAudio}
                                    disabled={isUploadingAudio || isLimitReached}
                                    style={{
                                      background: isLimitReached ? '#94a3b8' : '#34a853',
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
                                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />
                                    <span>Aufnahme starten</span>
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
                                    <span style={{ width: '8px', height: '8px', background: 'currentColor', display: 'inline-block' }} />
                                    <span>Stopp ({audioDuration}s / 60s)</span>
                                  </button>
                                )}
                              </div>
                              
                              {!isRecordingAudio && !isLimitReached && (
                                <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                                  <input
                                    type="text"
                                    placeholder="Kassetten-Beschriftung (z.B. Mein Übe-Versuch)"
                                    value={audioLabel}
                                    onChange={(e) => setAudioLabel(e.target.value)}
                                    style={{
                                      flex: 1,
                                      fontSize: '0.74rem',
                                      padding: '6px 12px',
                                      borderRadius: '10px',
                                      border: '1px solid #cbd5e1',
                                      background: '#fff',
                                      outline: 'none',
                                      fontFamily: 'monospace'
                                    }}
                                  />
                                </div>
                              )}
                            </div>

                            <div style={{ 
                              fontSize: '0.72rem', 
                              color: isLimitReached ? '#ef4444' : '#475569', 
                              fontWeight: 700, 
                              marginTop: '2px',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}>
                              <span>
                                {isLimitReached 
                                  ? '⚠️ Monatliches Aufnahme-Limit (240 Sek.) erreicht.'
                                  : `Aufnahmezeit diesen Monat: ${totalUsedSeconds}s / ${monthlyLimitSeconds}s verbraucht.`}
                              </span>
                            </div>

                            {isUploadingAudio && (
                              <div style={{ fontSize: '0.74rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span>⏳</span> Lade Audio-Feedback hoch...
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  )}

                  {(() => {
                    const allAudios = homeworkNotesList
                      .map((note, originalIdx) => ({ note, originalIdx }))
                      .filter(item => item.note.startsWith("AUDIO:"))
                      .map(item => {
                        const parts = item.note.substring(6).split('|');
                        return {
                          url: parts[0],
                          duration: parseInt(parts[1] || '0', 10),
                          date: parts[2],
                          label: parts[3] || 'Aufnahme',
                          role: parts[4] || 'teacher',
                          visibility: (parts[5] || (parts[4] === 'student' ? 'private' : 'shared_with_teacher')) as 'private' | 'shared_with_teacher',
                          originalIdx: item.originalIdx
                        };
                      });

                    const studentAudios = allAudios.filter(aud => aud.role === 'student');

                    // If teacher is viewing, only show recordings explicitly shared with teacher
                    if (isTeacherTools) {
                      const sharedAudios = studentAudios.filter(aud => aud.visibility === 'shared_with_teacher');

                      if (sharedAudios.length === 0) {
                        return (
                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', padding: '60px 20px', gap: '14px', textAlign: 'center' }}>
                            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                              <Lock size={22} />
                            </div>
                            <div>
                              <p style={{ fontWeight: 800, fontSize: '0.9rem', color: '#334155', margin: '0 0 4px' }}>Keine freigegebenen Aufnahmen</p>
                              <p style={{ fontSize: '0.76rem', color: '#64748b', margin: 0, maxWidth: '300px', lineHeight: 1.45 }}>
                                Der Schüler nutzt diesen Bereich zum ungestörten, privaten Ausprobieren. Sobald er eine Aufnahme für dich freigibt, erscheint sie hier.
                              </p>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap: '16px' }}>
                          {sharedAudios.map((aud, idx) => (
                            <div key={idx} style={{ display: 'flex', justifyContent: 'center' }}>
                              <RetroCassettePlayer
                                url={aud.url}
                                duration={aud.duration}
                                index={idx}
                                label={aud.label}
                                visibility="shared_with_teacher"
                                isStudentView={false}
                              />
                            </div>
                          ))}
                        </div>
                      );
                    }

                    // Student View: Show all student audios with privacy toggle and share to playlist button
                    if (studentAudios.length === 0) {
                      return (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', padding: '60px 20px', gap: '12px', textAlign: 'center' }}>
                          <Music size={28} style={{ opacity: 0.4, color: '#64748b' }} />
                          <div>
                            <p style={{ fontWeight: 700, fontSize: '0.86rem', color: '#64748b', margin: '0 0 2px' }}>Keine eigenen Aufnahmen</p>
                            <p style={{ fontSize: '0.74rem', margin: 0, opacity: 0.8 }}>Nimm dein Spiel auf, probiere dich aus und teile Meisterwerke in deiner Audio-Biografie!</p>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap: '16px' }}>
                        {studentAudios.map((aud, idx) => (
                          <div key={idx} style={{ display: 'flex', justifyContent: 'center' }}>
                            <RetroCassettePlayer
                              url={aud.url}
                              duration={aud.duration}
                              index={idx}
                              label={aud.label}
                              visibility={aud.visibility}
                              isStudentView={true}
                              onToggleVisibility={() => handleToggleAudioVisibility(aud.originalIdx)}
                              onShareToPlaylist={() => handleOpenShareModal(aud)}
                              onDelete={readOnly ? () => handleDeleteNote(aud.originalIdx) : undefined}
                            />
                          </div>
                        ))}
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
              </>
          ) : activeModalTab === 'document' ? (
            <>
          
          {/* LEFT COLUMN: 🎯 FOKUS-ARBEITSPLATZ (Lehrwerke & Songs) */}

          {/* MOBILE SEGMENTED CONTROL PILL-BAR FOR 2 SWIPE CARDS */}
          {isMobileView && (
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

                                {/* Category 1: Musikalisch-Technische Fertigkeiten */}
                                <div style={{ marginTop: '6px' }}>
                                  <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px' }}>
                                    Musikalisch-Technische Fertigkeiten
                                  </span>
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                                    {SKILL_TAGS.filter(t => t.category === 'technical').map(tag => {
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
                                  </div>
                                </div>

                                {/* Category 2: Übe-Praxis & Selbstständigkeit */}
                                <div style={{ marginTop: '8px' }}>
                                  <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px' }}>
                                    Übe-Praxis & Selbstständigkeit
                                  </span>
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                                    {SKILL_TAGS.filter(t => t.category === 'practice').map(tag => {
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
                          <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 900, color: '#0f172a' }}>
                            {book.title}
                          </h4>
                          {assignedBook?.isStudentCreated || assignedBook?.createdByRole === 'student' || book.created_by_role === 'student' ? (
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
                      {renderSongVinylCover(songColor, 'sm')}
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
                        <span style={{ fontSize: '0.84rem', fontWeight: 900, color: songProgressPercent === 100 ? '#34a853' : '#0f172a', transition: 'color 0.3s ease' }}>
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

                              if (selectedActiveSongId) {
                                const skill = activeSongSkills.find(s => s.id === selectedActiveSongId);
                                const songTitle = skill?.songs?.title || skill?.title || skill?.song_title || 'Unbenannter Song';
                                const songArtist = skill?.songs?.artist || skill?.artist || '';
                                const songTopic = songArtist ? `${songArtist} – ${songTitle}` : songTitle;
                                awardSticker('song-master', songTopic);
                              }
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
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px', padding: '24px', paddingBottom: '12px' }}>
                {/* Clean Apple-style Header Row with Quick-Add Action */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', position: 'relative' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <BookOpen size={18} style={{ color: '#34a853' }} />
                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#000', letterSpacing: '-0.02em', textTransform: 'uppercase' }}>
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
                        gap: '6px',
                        background: '#f0fdf4',
                        border: '1.5px solid #bbf7d0',
                        color: '#15803d',
                        padding: '5px 12px',
                        borderRadius: '100px',
                        fontSize: '0.76rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                      className="hover-scale"
                    >
                      <Plus size={13} strokeWidth={3} />
                      <span>Lehrwerk hinzufügen</span>
                    </button>

                    {showAssignDropdown && (
                      <div style={{
                        position: 'absolute',
                        right: 0,
                        top: '36px',
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
                          .filter(g => !assignedLehrwerke.some(a => a.lehrwerkId === g.id))
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
                                    width: '20px',
                                    height: '28px',
                                    background: `linear-gradient(135deg, ${bookColor.from}, ${bookColor.to})`,
                                    borderRadius: '3px',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.12)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0
                                  }}>
                                    <BookOpen size={10} color={bookColor.text} />
                                  </div>
                                );
                              })()}
                              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{g.title}</span>
                            </button>
                          ))
                        }
                        {globalLehrwerke.filter(g => !assignedLehrwerke.some(a => a.lehrwerkId === g.id)).length === 0 && (
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
                    padding: '14px',
                    marginBottom: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.04)'
                  }} className="animation-slide-up">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '0.76rem', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <BookOpen size={14} style={{ color: '#34a853' }} />
                        <span>Eigenes Lehrwerk erstellen</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowCreateLehrwerkModal(false)}
                        style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: '2px' }}
                      >
                        <X size={14} />
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
                          minWidth: '180px',
                          padding: '8px 12px',
                          borderRadius: '10px',
                          border: '1px solid #cbd5e1',
                          fontSize: '0.8rem',
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
                          width: '90px',
                          padding: '8px 12px',
                          borderRadius: '10px',
                          border: '1px solid #cbd5e1',
                          fontSize: '0.8rem',
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
                          padding: '8px 16px',
                          borderRadius: '10px',
                          fontSize: '0.78rem',
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

                {/* Horizontal Scroll-Container mit sichtbarer Scrollbar und Quick-Add ganz vorne (links) */}
                <div 
                  className="custom-horizontal-scrollbar"
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    gap: '14px',
                    overflowX: 'auto',
                    paddingBottom: '14px',
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
                      width: sortedAssignedLehrwerke.length === 0 ? '160px' : '140px',
                      scrollSnapAlign: 'start',
                      background: 'rgba(248, 250, 252, 0.7)',
                      borderRadius: '20px',
                      border: '2px dashed #cbd5e1',
                      padding: '14px 10px',
                      minHeight: '210px',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px',
                      textAlign: 'center',
                      transition: 'all 0.2s',
                      boxSizing: 'border-box'
                    }}
                    className="hover-scale"
                  >
                    <div style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '50%',
                      background: '#ffffff',
                      border: '1.5px solid #e2e8f0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#34a853',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                    }}>
                      <Plus size={20} strokeWidth={2.5} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 900, color: '#0f172a' }}>Lehrwerk</div>
                      <div style={{ fontSize: '0.70rem', fontWeight: 700, color: '#64748b', marginTop: '2px' }}>+ Hinzufügen</div>
                    </div>
                  </div>

                  {sortedAssignedLehrwerke.map(assigned => {
                    const book = globalLehrwerke.find(g => g.id === assigned.lehrwerkId) || {
                      title: 'Unbekanntes Buch',
                      emoji: '📚',
                      totalPages: 50
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
                          width: '160px',
                          scrollSnapAlign: 'start',
                          background: '#ffffff',
                          borderRadius: '20px',
                          border: isSelected ? '2px solid #34a853' : '1.5px solid #e8e8ed',
                          boxShadow: isSelected ? '0 8px 25px rgba(52, 168, 83, 0.18)' : '0 4px 14px rgba(0,0,0,0.03)',
                          padding: '12px',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          gap: '10px',
                          position: 'relative',
                          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                          boxSizing: 'border-box'
                        }}
                        className="hover-scale"
                      >
                        {/* Book Showcase Area with realistic 3D portrait book */}
                        <div style={{
                          width: '100%',
                          height: '145px',
                          background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
                          borderRadius: '14px',
                          position: 'relative',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          overflow: 'hidden'
                        }}>
                          {/* Realistic Portrait Book */}
                          <div style={{
                            width: '92px',
                            height: '124px',
                            background: `linear-gradient(135deg, ${bookColor.from} 0%, ${bookColor.to} 100%)`,
                            borderRadius: '4px 8px 8px 4px',
                            boxShadow: '4px 6px 16px rgba(0,0,0,0.18), inset -2px 0 4px rgba(0,0,0,0.08)',
                            position: 'relative',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            padding: '8px'
                          }}>
                            {/* Spine groove on left */}
                            <div style={{
                              position: 'absolute',
                              left: 0,
                              top: 0,
                              bottom: 0,
                              width: '6px',
                              background: 'rgba(0,0,0,0.18)',
                              borderRight: '1px solid rgba(255,255,255,0.25)',
                              borderRadius: '4px 0 0 4px'
                            }} />

                            {/* Realistic page edges on right */}
                            <div style={{
                              position: 'absolute',
                              right: '-3px',
                              top: '3px',
                              bottom: '3px',
                              width: '3px',
                              background: '#ffffff',
                              border: '1px solid #cbd5e1',
                              borderRadius: '0 2px 2px 0'
                            }} />

                            {/* Book Icon Capsule */}
                            <div style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '50%',
                              background: 'rgba(255, 255, 255, 0.25)',
                              backdropFilter: 'blur(4px)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxShadow: '0 2px 6px rgba(0,0,0,0.08)'
                            }}>
                              <BookOpen size={18} color={bookColor.text || '#ffffff'} />
                            </div>

                            {/* Mini Book Title on Cover */}
                            <span style={{
                              fontSize: '0.62rem',
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
                            top: '8px',
                            right: '8px',
                            background: pct > 0 ? '#34a853' : 'rgba(0,0,0,0.4)',
                            backdropFilter: 'blur(6px)',
                            color: '#ffffff',
                            fontSize: '0.62rem',
                            fontWeight: 900,
                            padding: '2px 7px',
                            borderRadius: '100px',
                            boxShadow: '0 2px 5px rgba(0,0,0,0.15)',
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
                                top: '6px',
                                left: '6px',
                                background: 'rgba(255, 255, 255, 0.9)',
                                border: 'none',
                                color: '#ef4444',
                                cursor: 'pointer',
                                width: '22px',
                                height: '22px',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 2px 5px rgba(0,0,0,0.15)',
                                transition: 'all 0.2s',
                                zIndex: 10
                              }}
                              title="Lehrwerk entfernen"
                            >
                              <X size={12} strokeWidth={2.5} />
                            </button>
                          )}
                        </div>

                        {/* Card Info Below */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <h4 style={{
                            margin: 0,
                            fontSize: '0.85rem',
                            fontWeight: 900,
                            color: '#0f172a',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            fontFamily: "'Plus Jakarta Sans', sans-serif"
                          }}>
                            {book.title}
                          </h4>

                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.68rem', color: '#64748b', fontWeight: 700 }}>
                            <span>{total} Seiten</span>
                            <span style={{ color: worked > 0 ? '#34a853' : '#94a3b8', fontWeight: 800 }}>{worked} gem.</span>
                          </div>

                          {/* Subtle Progress Bar */}
                          <div style={{ width: '100%', height: '4px', background: '#f1f5f9', borderRadius: '2px', overflow: 'hidden', marginTop: '3px' }}>
                            <div style={{ width: `${pct}%`, height: '100%', background: '#34a853', transition: 'width 0.3s ease' }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div style={{ borderTop: '1px solid #e8e8ed', margin: '20px 0 10px 0' }} />
                
                {/* Header Row mit Quick-Add Button */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', position: 'relative' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Music size={18} style={{ color: '#000' }} />
                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#000', letterSpacing: '-0.02em', textTransform: 'uppercase' }}>
                      Aktive Song-Projekte
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowCreateSongModal(!showCreateSongModal)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: '#f0fdf4',
                      border: '1.5px solid #bbf7d0',
                      color: '#15803d',
                      padding: '5px 12px',
                      borderRadius: '100px',
                      fontSize: '0.76rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                    className="hover-scale"
                  >
                    <Plus size={13} strokeWidth={3} />
                    <span>Song anlegen</span>
                  </button>
                </div>

                {(() => {
                    const activeSongsRaw = activeSongSkills.filter(skill =>
                      !skill.is_stage_ready && (skill.progress_percent || 0) < 100
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
                    const activeSongs = Array.from(uniqueActiveMap.values());

                    return (
                      <div 
                        className="custom-horizontal-scrollbar"
                        style={{
                          display: 'flex',
                          flexDirection: 'row',
                          gap: '14px',
                          overflowX: 'auto',
                          paddingBottom: '14px',
                          scrollSnapType: 'x mandatory',
                          WebkitOverflowScrolling: 'touch',
                          scrollbarWidth: 'thin',
                          scrollbarColor: '#cbd5e1 #f8fafc'
                        }}
                      >
                        {/* 1. Kompakte Quick-Add Card GANZ VORNE (LINKS) */}
                        <div
                          onClick={() => setShowCreateSongModal(!showCreateSongModal)}
                          style={{
                            flex: '0 0 auto',
                            width: activeSongs.length === 0 ? '160px' : '140px',
                            scrollSnapAlign: 'start',
                            background: 'rgba(248, 250, 252, 0.7)',
                            borderRadius: '20px',
                            border: '2px dashed #cbd5e1',
                            padding: '14px 10px',
                            minHeight: '210px',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '10px',
                            textAlign: 'center',
                            transition: 'all 0.2s',
                            boxSizing: 'border-box'
                          }}
                          className="hover-scale"
                        >
                          <div style={{
                            width: '42px',
                            height: '42px',
                            borderRadius: '50%',
                            background: '#ffffff',
                            border: '1.5px solid #e2e8f0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#34a853',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                          }}>
                            <Plus size={20} strokeWidth={2.5} />
                          </div>
                          <div>
                            <div style={{ fontSize: '0.82rem', fontWeight: 900, color: '#0f172a' }}>Song</div>
                            <div style={{ fontSize: '0.70rem', fontWeight: 700, color: '#64748b', marginTop: '2px' }}>+ Neu anlegen</div>
                          </div>
                        </div>

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
                                flex: '0 0 auto',
                                width: '160px',
                                scrollSnapAlign: 'start',
                                background: '#ffffff',
                                borderRadius: '20px',
                                border: isSelected ? '2px solid #34a853' : '1.5px solid #e8e8ed',
                                boxShadow: isSelected ? '0 8px 25px rgba(52, 168, 83, 0.18)' : '0 4px 14px rgba(0,0,0,0.03)',
                                padding: '12px',
                                cursor: 'pointer',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                gap: '10px',
                                position: 'relative',
                                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                                boxSizing: 'border-box'
                              }}
                              className="hover-scale"
                            >
                              {/* Song Showcase Area: Pastel Sleeve + Peeking Black Vinyl */}
                              <div style={{
                                width: '100%',
                                height: '148px',
                                background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
                                borderRadius: '16px',
                                position: 'relative',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                overflow: 'hidden'
                              }}>
                                {renderSongVinylCover(songColor, 'md')}

                                {/* Top-Right Pill: % gemeistert */}
                                <div style={{
                                  position: 'absolute',
                                  top: '6px',
                                  right: '6px',
                                  background: progress >= 100 ? '#34a853' : 'rgba(15, 23, 42, 0.72)',
                                  backdropFilter: 'blur(8px)',
                                  color: '#ffffff',
                                  fontSize: '0.62rem',
                                  fontWeight: 900,
                                  padding: '2.5px 7.5px',
                                  borderRadius: '100px',
                                  border: '1px solid rgba(255,255,255,0.18)',
                                  boxShadow: '0 2px 6px rgba(0,0,0,0.18)',
                                  zIndex: 10
                                }}>
                                  {progress}%
                                </div>

                                {/* Delete Button top left if removable */}
                                {!readOnly && (skill.songs?.teacher_id || skill.created_by_teacher) && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRemoveSong(skill.id, e);
                                    }}
                                    style={{
                                      position: 'absolute',
                                      top: '6px',
                                      left: '6px',
                                      background: 'rgba(255, 255, 255, 0.9)',
                                      border: 'none',
                                      color: '#ef4444',
                                      cursor: 'pointer',
                                      width: '22px',
                                      height: '22px',
                                      borderRadius: '50%',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      boxShadow: '0 2px 5px rgba(0,0,0,0.15)',
                                      transition: 'all 0.2s',
                                      zIndex: 10
                                    }}
                                    title="Song entfernen"
                                  >
                                    <X size={12} strokeWidth={2.5} />
                                  </button>
                                )}
                              </div>

                              {/* Card Info Below */}
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                <h4 style={{
                                  margin: 0,
                                  fontSize: '0.85rem',
                                  fontWeight: 900,
                                  color: '#0f172a',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  fontFamily: "'Plus Jakarta Sans', sans-serif"
                                }}>
                                  {songTitle}
                                </h4>

                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.68rem', color: '#64748b', fontWeight: 700 }}>
                                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '90px' }}>{songArtist}</span>
                                  <span style={{ color: skill.songs?.teacher_id || skill.created_by_teacher ? '#16a34a' : '#d97706', fontWeight: 800 }}>
                                    {skill.songs?.teacher_id || skill.created_by_teacher ? '🎓 Lehrer' : '⭐ Wunsch'}
                                  </span>
                                </div>

                                {/* Subtle Progress Bar */}
                                <div style={{ width: '100%', height: '4px', background: '#f1f5f9', borderRadius: '2px', overflow: 'hidden', marginTop: '3px' }}>
                                  <div style={{
                                    width: `${progress}%`,
                                    height: '100%',
                                    background: progress >= 100 ? '#34a853' : 'linear-gradient(90deg, #f59e0b, #eab308)',
                                    transition: 'width 0.3s ease'
                                  }} />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}

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
                </div>{/* close inner scrollable div */}

                {/* Meisterwerke, Sticker-Album & Audio-Biografie Buttons - pinned at bottom */}
                <div style={{ padding: '12px 20px 24px 20px', display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setActiveModalTab('logbook')}
                    style={{
                      flex: 1, padding: '13px 8px', borderRadius: '14px', border: 'none',
                      background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', color: 'white', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer',
                      boxShadow: '0 4px 10px rgba(99, 102, 241, 0.2)',
                      transition: 'all 0.15s ease',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                    }}
                    className="hover-scale"
                  >
                    <Award size={15} />
                    <span style={{ whiteSpace: 'nowrap' }}>Deine Meisterwerke</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setActiveModalTab('stickeralbum'); setActiveSubView('hub'); }}
                    style={{
                      flex: 1, padding: '13px 8px', borderRadius: '14px', border: 'none',
                      background: '#d97706', color: 'white', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer',
                      boxShadow: '0 4px 10px rgba(217, 119, 6, 0.2)',
                      transition: 'all 0.15s ease',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                    }}
                    className="hover-scale"
                  >
                    <Star size={15} fill="#fff" />
                    <span style={{ whiteSpace: 'nowrap' }}>Sticker-Album</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setActiveModalTab('audiobiography'); setActiveSubView('hub'); }}
                    style={{
                      flex: 1, padding: '13px 8px', borderRadius: '14px', border: 'none',
                      background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)', color: 'white', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer',
                      boxShadow: '0 4px 10px rgba(16, 185, 129, 0.25)',
                      transition: 'all 0.15s ease',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                    }}
                    className="hover-scale"
                  >
                    <Disc size={15} />
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
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexShrink: 0 }}>
                    {[
                      { mode: 'LOCKED', color: '#fca5a5', label: 'Rot (unbearbeitet)', getActive: () => status === 'IN_PROGRESS' && !isCurrentHomework, action: () => { setStatus('IN_PROGRESS'); setIsCurrentHomework(false); setHasChanges(true); if (activeLehrwerkId && activePageNumber) triggerDirectSave(activeLehrwerkId, activePageNumber, 'IN_PROGRESS', false); } },
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
                </div>

                {/* textbook page documentation form */}
                <form onSubmit={(e) => handleSave(e, false)} style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '80px' }}>
                  {/* Teacher View: Homework & Notes Editor */}
                  {!readOnly ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontSize: '0.86rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        📝 Hausaufgabe & Notiz für diese Seite:
                      </label>
                      <textarea
                        placeholder="Trage hier die Hausaufgabe oder Notizen für diese Seite ein..."
                        value={homeworkNotes}
                        onChange={(e) => {
                          setHomeworkNotes(e.target.value);
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
                          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.02), inset 0 2px 4px rgba(0,0,0,0.02)';
                        }}
                      />
                      
                      {/* Schnell-Textbausteine & Speichern für Lehrer (iPad-optimierte Touch-Buttons) */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginTop: '6px' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
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
                                setHomeworkNotes((prev: string) => prev ? `${prev}\n\n${text}` : text);
                                setIsCurrentHomework(true);
                                setHasChanges(true);
                              }}
                              style={{
                                background: '#ffffff',
                                color: '#334155',
                                border: '1.5px solid #cbd5e1',
                                padding: '8px 14px',
                                minHeight: '38px',
                                borderRadius: '12px',
                                fontSize: '0.78rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                                boxShadow: '0 2px 5px rgba(0,0,0,0.03)',
                                transition: 'all 0.15s ease',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px'
                              }}
                            >
                              {tpl.label}
                            </button>
                          ))}
                        </div>
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
                        const cleanTeacherNotes = getCleanTeacherHomeworkText(homeworkNotes);
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
                              { id: 'frage', label: '❓ Frage im Unterricht', prefix: '❓ Frage für den Unterricht:' },
                              { id: 'bpm', label: '🎯 Ziel-BPM erreicht', prefix: '🎯 Geschafft: Metronom-Tempo auf' },
                              { id: 'takt', label: '🛑 Takt unklar', prefix: '🛑 Takt' },
                              { id: 'langsam', label: '🐢 Langsam geübt', prefix: '🐢 Diese Woche besonders langsam' }
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
                                      let snippet = '';
                                      if (chip.id === 'frage') {
                                        snippet = '❓ Frage für den Unterricht: ';
                                      } else if (chip.id === 'bpm') {
                                        const bpm = prompt("Welche BPM hast du erreicht?", "120");
                                        snippet = `🎯 Geschafft: Metronom-Tempo auf ${bpm || '120'} BPM gesteigert!`;
                                      } else if (chip.id === 'takt') {
                                        const takt = prompt("Welcher Takt ist noch unklar?", "Takt 4");
                                        snippet = `🛑 ${takt || 'Takt 4'} ist mir noch nicht ganz klar.`;
                                      } else if (chip.id === 'langsam') {
                                        snippet = '🐢 Diese Woche besonders langsam & sauber mit Metronom geübt.';
                                      }
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



                    {/* Live Preview Box (Teacher Only: Summarizes all active homework pages for this book) */}
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
                    <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1e293b' }}>
                      🔒 Interne Notiz (nur für Lehrer)
                    </label>
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

                    <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '80px' }}>
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
                            { label: '🐌 Schnecke', text: 'Spiele die schwierige Passage ganz langsam wie eine Schnecke.' },
                            { label: '🔂 Ritter-Drei', text: 'Wiederhole den kniffligen Übergang dreimal hintereinander fehlerfrei.' },
                            { label: '🎵 Laut-Leise', text: 'Lass das Stück lebendig klingen! Mache deutliche Unterschiede.' },
                            { label: '⏱️ 10-Min.', text: 'Stelle dir einen Timer auf 10 Minuten. Übe jeden Tag.' }
                          ].map((tpl, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => {
                                setHomeworkNotes((prev: string) => prev ? `${prev}\n\n${tpl.text}` : tpl.text);
                                triggerDebouncedAutoSave();
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

                      {!readOnly && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <label style={{ fontSize: '0.86rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            🔒 Interne Notiz (nur für Lehrer):
                          </label>
                          <textarea
                            placeholder="Interne Bemerkungen..."
                            value={teacherNotes}
                            onChange={(e) => {
                              setTeacherNotes(e.target.value);
                              triggerDebouncedAutoSave();
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

                      <div style={{ display: 'flex', gap: '12px', marginTop: '8px', paddingBottom: (isMobileView || isInsideSim || isFullscreen || isMobileOrSim) ? '180px' : '48px' }}>
                        <button
                          type="button"
                          onClick={() => {
                            triggerImmediateAutoSave();
                            setActiveSubView('hub');
                            setSelectedActiveSongId('');
                          }}
                          style={{
                            flex: 1,
                            padding: '14px',
                            borderRadius: '14px',
                            border: '1px solid #cbd5e1',
                            background: 'white',
                            color: '#1e293b',
                            fontWeight: 800,
                            fontSize: '0.82rem',
                            cursor: 'pointer',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                            transition: 'all 0.15s ease',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px'
                          }}
                          className="hover-scale"
                        >
                          <span>← Zurück zur Übersicht</span>
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
                      <span>Eintrag & Hausaufgabe</span>
                    </span>
                    <p style={{ margin: '3px 0 0 0', fontSize: '0.76rem', color: '#71717a', fontWeight: 550, lineHeight: '1.3' }}>
                      Dokumentiere den heutigen Unterricht für den Schüler.
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
                                  return pageState?.status === 'homework' || pageState?.isCurrentHomework;
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

                            // Group page numbers by book title
                            const groupedLehrwerke: Record<string, { pages: number[] }> = {};
                            const otherHWs: any[] = [];
                            
                            // 1. Primary Source: Collect all active homework pages directly from assignedLehrwerke state
                            (assignedLehrwerke || []).forEach(assignment => {
                              const book = globalLehrwerke.find(g => g.id === assignment.lehrwerkId);
                              if (!book || !assignment.pageStates) return;
                              
                              Object.entries(assignment.pageStates).forEach(([pNumStr, pState]: [string, any]) => {
                                if (pState?.status === 'homework' || pState?.isCurrentHomework) {
                                  const pageNum = parseInt(pNumStr, 10);
                                  if (!isNaN(pageNum)) {
                                    if (!groupedLehrwerke[book.title]) {
                                      groupedLehrwerke[book.title] = { pages: [] };
                                    }
                                    if (!groupedLehrwerke[book.title].pages.includes(pageNum)) {
                                      groupedLehrwerke[book.title].pages.push(pageNum);
                                    }
                                  }
                                }
                              });
                            });

                            // 2. Secondary Source: Collect from progress_matrix items (songs, theory, etc.)
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

                            const hasActive = lehrwerkeList.length > 0 || otherHWs.length > 0;
                            const hasNotes = homeworkNotesList.some(n => typeof n === 'string' && !n.startsWith('STICKER:') && !n.startsWith('LATENCY:')) || homeworkNotes.trim().length > 0;
                            
                            if (!hasActive && !hasNotes) {
                              return (
                                <span style={{ fontSize: '0.72rem', color: '#71717a', fontWeight: 550, fontStyle: 'italic', lineHeight: '1.4' }}>
                                  ✨ Keine aktiven Hausaufgaben erfasst. Markiere Lehrwerke oder Songs.
                                </span>
                              );
                            }
                            
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
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setActiveRhythmSong({
                                            songTitle: `${item.title} (${formatPageNumbers(item.pages)})`,
                                            targetBpm: 100
                                          });
                                          setActiveViewMode('practice');
                                        }}
                                        style={{
                                          background: 'linear-gradient(135deg, #e6f4ea 0%, #d1fae5 100%)',
                                          color: '#15803d',
                                          border: '1px solid #34a853',
                                          borderRadius: '8px',
                                          padding: '2px 8px',
                                          fontSize: '0.68rem',
                                          fontWeight: 800,
                                          cursor: 'pointer',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '4px',
                                          marginLeft: 'auto'
                                        }}
                                      >
                                        <Mic size={10} />
                                        <span>Mit Rhythmus-Coach üben 🎙️</span>
                                      </button>
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
                                  const rawTextNotes = homeworkNotesList.map((note, idx) => ({ note, idx })).filter(item => !item.note.startsWith("AUDIO:") && !item.note.startsWith("STICKER:") && !item.note.startsWith("LATENCY:") && !item.note.startsWith("RHYTHM_SCORE:"));
                                  const audioNotes = homeworkNotesList.map((note, idx) => ({ note, idx })).filter(item => item.note.startsWith("AUDIO:"));
                                  const rhythmNotes = homeworkNotesList.map((note, idx) => ({ note, idx })).filter(item => item.note.startsWith("RHYTHM_SCORE:"));
                                  
                                  // Filter out notes from array that are already identical to the live editable homeworkNotes
                                  const textNotes = rawTextNotes.filter(item => item.note.trim() !== homeworkNotes.trim());
                                  const hasLiveHomeworkNote = homeworkNotes.trim().length > 0;
                                  
                                  const hasAnyVisibleNotes = audioNotes.length > 0 || rhythmNotes.length > 0 || textNotes.length > 0 || hasLiveHomeworkNote;
                                  if (!hasAnyVisibleNotes) return null;

                                  return (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid rgba(251, 191, 36, 0.2)', paddingTop: '8px', marginTop: '4px' }}>
                                      <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                        Bemerkungen & Hinweise
                                      </span>
                                      
                                      {/* Audio Notes (Cassettes) side-by-side */}
                                      {audioNotes.length > 0 && (
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '4px', marginBottom: textNotes.length > 0 || rhythmNotes.length > 0 || hasLiveHomeworkNote ? '6px' : '2px' }}>
                                          {audioNotes.map((item, index) => {
                                            const parts = item.note.substring(6).split('|');
                                            return (
                                              <div key={item.idx} style={{ position: 'relative', display: 'inline-block' }}>
                                                <InlineAudioPlayer 
                                                  url={parts[0]} 
                                                  label={parts[3] || `Play-Along #${index + 1}`}
                                                  onDelete={() => handleDeleteNote(item.idx)}
                                                />
                                              </div>
                                            );
                                          })}
                                        </div>
                                      )}

                                      {/* ⚡ Campus Rhythmus-Coach Badges */}
                                      {rhythmNotes.length > 0 && (
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '6px' }}>
                                          {rhythmNotes.map((item) => {
                                            const parts = item.note.substring(13).split('|');
                                            const score = parts[0] || '---';
                                            const bpm = parts[1] || '---';
                                            const beats = parts[2] || '';
                                            const time = parts[3] || '';
                                            const stars = parts[4] || '⭐';
                                            const songTitle = parts[5] || '';
                                            return (
                                              <div key={item.idx} style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                background: 'linear-gradient(135deg, #e6f4ea 0%, #d1fae5 100%)',
                                                border: '1px solid #34a853',
                                                padding: '6px 12px',
                                                borderRadius: '12px',
                                                fontSize: '0.76rem',
                                                fontWeight: 800,
                                                color: '#15803d',
                                                boxShadow: '0 2px 6px rgba(52, 168, 83, 0.15)'
                                              }}>
                                                <Activity size={14} style={{ color: '#34a853' }} />
                                                <span>{stars} Rhythmus-Präzision: {score}</span>
                                                <span style={{ fontSize: '0.68rem', opacity: 0.85, fontWeight: 700 }}>
                                                  {songTitle ? `• ${songTitle}` : ''} ({bpm} BPM {beats ? `• ${beats} Hits` : ''} {time ? `• ${time}` : ''})
                                                </span>
                                                {!readOnly && (
                                                  <button
                                                    type="button"
                                                    onClick={() => handleDeleteNote(item.idx)}
                                                    style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0 2px' }}
                                                  >
                                                    <X size={12} />
                                                  </button>
                                                )}
                                              </div>
                                            );
                                          })}
                                        </div>
                                      )}

                                      {/* Live Zusätzliche Hausaufgaben-Bemerkungen */}
                                      {hasLiveHomeworkNote && (
                                        <div style={{
                                          display: 'flex',
                                          alignItems: 'flex-start',
                                          justifyContent: 'space-between',
                                          background: '#ffffff',
                                          border: '1px solid rgba(251, 191, 36, 0.25)',
                                          padding: '8px 12px',
                                          borderRadius: '12px',
                                          fontSize: '0.78rem',
                                          fontWeight: 650,
                                          color: '#1e293b',
                                          lineHeight: '1.45',
                                          boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)',
                                          marginTop: '2px'
                                        }}>
                                          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', flex: 1 }}>
                                            <span style={{ fontSize: '0.85rem', flexShrink: 0 }}>📝</span>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
                                              <span style={{ fontWeight: 800, color: '#b45309', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                                                Zusätzliche Bemerkungen:
                                              </span>
                                              <span style={{ whiteSpace: 'pre-wrap', color: '#0f172a' }}>
                                                {homeworkNotes.trim()}
                                              </span>
                                            </div>
                                          </div>
                                          {!readOnly && (
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setHomeworkNotes('');
                                                triggerDebouncedAutoSave(50);
                                              }}
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
                                                marginLeft: '8px',
                                                flexShrink: 0
                                              }}
                                              title="Bemerkung entfernen"
                                            >
                                              ✕
                                            </button>
                                          )}
                                        </div>
                                      )}

                                      {/* Other Text Notes stacked vertically */}
                                      {textNotes.length > 0 && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                          {textNotes.map((item) => {
                                            const isLoop = item.note.startsWith("LOOP:");
                                            const studentNoteInfo = formatStudentNoteDisplay(item.note);

                                            if (studentNoteInfo.isStudentNote) {
                                              return (
                                                <div key={item.idx} style={{
                                                  display: 'flex',
                                                  alignItems: 'center',
                                                  justifyContent: 'space-between',
                                                  background: studentNoteInfo.isPrivate ? 'rgba(239, 68, 68, 0.05)' : 'rgba(52, 168, 83, 0.08)',
                                                  border: studentNoteInfo.isPrivate ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid rgba(52, 168, 83, 0.25)',
                                                  padding: '6px 12px',
                                                  borderRadius: '12px',
                                                  fontSize: '0.76rem',
                                                  color: '#1e293b',
                                                  lineHeight: '1.4',
                                                  marginTop: '2px'
                                                }}>
                                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                                                    <span style={{ fontSize: '0.85rem', flexShrink: 0 }}>💬</span>
                                                    <span style={{ fontWeight: 800, color: studentNoteInfo.isPrivate ? '#dc2626' : '#166534', flexShrink: 0 }}>
                                                      {studentNoteInfo.isPrivate ? 'Private Schüler-Notiz:' : 'Schüler-Frage:'}
                                                    </span>
                                                    <span style={{ color: '#334155', fontWeight: 650, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                      {studentNoteInfo.text}
                                                    </span>
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
                                                      marginLeft: '8px',
                                                      flexShrink: 0
                                                    }}
                                                  >
                                                    ✕
                                                  </button>
                                                </div>
                                              );
                                            }

                                            return (
                                              <div key={item.idx} style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                background: isLoop ? '#fefce8' : '#ffffff',
                                                border: isLoop ? '1px solid rgba(234, 179, 8, 0.2)' : '1px solid rgba(251, 191, 36, 0.15)',
                                                padding: isLoop ? '4px 10px' : '8px 12px',
                                                borderRadius: isLoop ? '10px' : '12px',
                                                fontSize: isLoop ? '0.7rem' : '0.76rem',
                                                fontWeight: 650,
                                                color: '#1e293b',
                                                lineHeight: '1.4',
                                                boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)',
                                                marginTop: isLoop ? '4px' : '0'
                                              }}>
                                                <div style={{ flex: 1, paddingRight: '8px' }}>
                                                  {isLoop ? (() => {
                                                    const parts = item.note.substring(5).split('|');
                                                    const label = parts[3] || 'Mein Loop-Mix';
                                                    const duration = parts[1] || '8';
                                                    return `🎵 Loop-Mix: "${label}" (${duration}s)`;
                                                  })() : item.note}
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
                                            );
                                          })}
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
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><FileText size={15} style={{ color: '#34a853', verticalAlign: 'middle', marginTop: '-2px' }} /> Zusätzliche Hausaufgaben-Bemerkungen</span>
                            </label>
                            {!readOnly && (
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
                            )}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {!readOnly && isNotesExpanded && (
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
                          placeholder={readOnly ? "Keine zusätzlichen Bemerkungen hinterlegt." : "Trage hier zusätzliche Bemerkungen zur Hausaufgabe ein..."}
                          value={homeworkNotes}
                          readOnly={readOnly}
                          onChange={readOnly ? undefined : (e) => {
                            const val = e.target.value;
                            setHomeworkNotes(val);
                            try {
                              localStorage.setItem(`campus_homework_notes_${student.id}`, val);
                            } catch {}
                            triggerDebouncedAutoSave(350);
                          }}
                          onFocus={readOnly ? undefined : () => setIsNotesFocused(true)}
                          onBlur={readOnly ? undefined : () => {
                            triggerImmediateAutoSave();
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
                          style={readOnly ? {
                            width: '100%',
                            minHeight: '120px',
                            padding: '12px 14px',
                            border: 'none',
                            fontSize: '0.9rem',
                            fontWeight: 600,
                            outline: 'none',
                            resize: 'none',
                            background: 'transparent',
                            fontFamily: 'inherit',
                            color: '#1e293b',
                            pointerEvents: 'none'
                          } : {
                            width: '100%',
                            height: '110px',
                            padding: '12px 14px',
                            borderRadius: '16px',
                            border: '1px solid #cbd5e1',
                            fontSize: '0.82rem',
                            fontWeight: 600,
                            outline: 'none',
                            resize: 'none',
                            background: 'white',
                            transition: 'border-color 0.2s ease'
                          }}
                        />
                        <style dangerouslySetInnerHTML={{__html: `
                          .presets-scrollbar-container::-webkit-scrollbar {
                            height: 6px;
                          }
                          .presets-scrollbar-container::-webkit-scrollbar-track {
                            background: #f1f5f9;
                            border-radius: 9999px;
                          }
                          .presets-scrollbar-container::-webkit-scrollbar-thumb {
                            background: #cbd5e1;
                            border-radius: 9999px;
                          }
                          .presets-scrollbar-container::-webkit-scrollbar-thumb:hover {
                            background: #94a3b8;
                          }
                          .preset-chip-card {
                            transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
                          }
                          .preset-chip-card:hover {
                            transform: translateY(-1px);
                            border-color: #3b82f6 !important;
                            background: #ffffff !important;
                            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
                          }
                          .preset-chip-card:active {
                            transform: translateY(0);
                            background: #f1f5f9 !important;
                          }
                        `}} />

                        {!readOnly && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                            {(() => {
                              const isPresetActive = (itemText: string, isBpm = false) => {
                                const currentNotes = homeworkNotes || '';
                                if (isBpm) {
                                  return currentNotes.includes("Achte diese Woche besonders darauf, das Metronom bei");
                                }
                                return currentNotes.includes(itemText);
                              };

                              const togglePreset = (itemText: string, isBpm = false, tagKey?: string) => {
                                let currentNotes = homeworkNotes || '';
                                const active = isPresetActive(itemText, isBpm);

                                if (active) {
                                  if (isBpm) {
                                    currentNotes = currentNotes.replace(/\n*Achte diese Woche besonders darauf, das Metronom bei .* zu halten\./g, '');
                                  } else {
                                    const escapedText = itemText.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
                                    currentNotes = currentNotes.replace(new RegExp('\\n*' + escapedText, 'g'), '');
                                  }
                                  currentNotes = currentNotes.replace(/\n{3,}/g, '\n\n').trim();
                                  setHomeworkNotes(currentNotes);

                                  if (tagKey) {
                                    setPendingTargetFocusTags(prev => prev.filter(t => t !== tagKey));
                                  }
                                } else {
                                  let textToAdd = itemText;
                                  if (isBpm) {
                                    const bpm = prompt("Geben Sie die BPM-Zahl ein:", "120");
                                    const bpmText = bpm ? `${bpm} BPM` : "120 BPM";
                                    textToAdd = `Achte diese Woche besonders darauf, das Metronom bei ${bpmText} zu halten.`;
                                  }
                                  currentNotes = currentNotes ? `${currentNotes.trim()}\n\n${textToAdd}` : textToAdd;
                                  setHomeworkNotes(currentNotes);
                                  setIsCurrentHomework(true);

                                  if (tagKey) {
                                    setPendingTargetFocusTags(prev => prev.includes(tagKey) ? prev : [...prev, tagKey]);
                                  }
                                }
                                setHasChanges(true);
                                triggerDebouncedAutoSave(300);
                              };

                              const allPresets = [
                                {
                                  label: '⏱️ Tempo halten',
                                  desc: 'Metronom BPM',
                                  text: '',
                                  tagKey: 'tempo',
                                  isBpm: true,
                                  onClick: () => togglePreset('', true, 'tempo')
                                },
                                {
                                  label: '✨ Sauber spielen',
                                  desc: 'Töne & Intonation',
                                  text: 'Achte auf eine präzise Ausführung und einen sauberen, klaren Klang.',
                                  tagKey: 'intonation',
                                  isBpm: false,
                                  onClick: () => togglePreset('Achte auf eine präzise Ausführung und einen sauberen, klaren Klang.', false, 'intonation')
                                },
                                {
                                  label: '🥁 Rhythmus-Metronom',
                                  desc: 'Timing & Takt',
                                  text: 'Achte auf ein stabiles Rhythmus-Metronom und spiele genau auf den Schlag.',
                                  tagKey: 'rhythmus',
                                  isBpm: false,
                                  onClick: () => togglePreset('Achte auf ein stabiles Rhythmus-Metronom und spiele genau auf den Schlag.', false, 'rhythmus')
                                },
                                {
                                  label: '🖖 Fingersatz üben',
                                  desc: 'Fingersatz einhalten',
                                  text: 'Achte darauf, den vorgegebenen Fingersatz genau einzuhalten und zu üben.',
                                  tagKey: 'fingersatz',
                                  isBpm: false,
                                  onClick: () => togglePreset('Achte darauf, den vorgegebenen Fingersatz genau einzuhalten und zu üben.', false, 'fingersatz')
                                },
                                {
                                  label: '🎭 Ausdruck & Dynamik',
                                  desc: 'Musikalität',
                                  text: 'Spiele mit voller Hingabe, achte auf die Lautstärken-Dynamik und Phrasierung.',
                                  tagKey: 'ausdruck',
                                  isBpm: false,
                                  onClick: () => togglePreset('Spiele mit voller Hingabe, achte auf die Lautstärken-Dynamik und Phrasierung.', false, 'ausdruck')
                                },
                                {
                                  label: '📖 Auswendig lernen',
                                  desc: 'Spiel ohne Blatt',
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
                                },
                                ...textbausteine
                                  .filter((tb: any) => tb.active)
                                  .map((tpl: any) => ({
                                    label: `📝 ${tpl.label}`,
                                    desc: 'Textbaustein',
                                    text: tpl.text,
                                    tagKey: undefined,
                                    isBpm: false,
                                    onClick: () => togglePreset(tpl.text, false)
                                  }))
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
                                      background: active ? 'linear-gradient(135deg, #34a853 0%, #2e7d32 100%)' : '#ffffff',
                                      color: active ? '#ffffff' : '#1e293b',
                                      border: active ? '1px solid #34a853' : '1px solid #e2e8f0',
                                      padding: '6px 12px',
                                      borderRadius: '100px',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '6px',
                                      outline: 'none',
                                      boxShadow: active ? '0 3px 10px rgba(52, 168, 83, 0.25)' : '0 1px 3px rgba(0, 0, 0, 0.05)',
                                      transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                                      whiteSpace: 'nowrap'
                                    }}
                                    className="preset-chip-card hover-scale"
                                  >
                                    <span style={{ fontWeight: 800, fontSize: '0.72rem', letterSpacing: '-0.01em' }}>
                                      {item.label}
                                    </span>
                                    {active && (
                                      <span style={{ 
                                        background: 'rgba(255, 255, 255, 0.25)', 
                                        borderRadius: '50%', 
                                        width: '14px', 
                                        height: '14px', 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'center', 
                                        fontSize: '0.6rem', 
                                        fontWeight: 900 
                                      }}>
                                        ✓
                                      </span>
                                    )}
                                  </button>
                                );
                              };

                              return (
                                <>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.68rem', fontWeight: 850, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                                      ⚡ Schnellbaukasten Presets:
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => setShowAllPresets(prev => !prev)}
                                      style={{
                                        background: 'none',
                                        border: 'none',
                                        fontSize: '0.68rem',
                                        color: '#34a853',
                                        fontWeight: 800,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '3px',
                                        padding: 0
                                      }}
                                    >
                                      {showAllPresets ? 'Weniger ▴' : `Mehr (${extraPresets.length}) ▾`}
                                    </button>
                                  </div>

                                  {/* Top 5 Horizontal Pill Bar */}
                                  <div style={{ position: 'relative', width: '100%', marginBottom: '4px' }}>
                                    <div 
                                      style={{ 
                                        display: 'flex', 
                                        gap: '6px', 
                                        overflowX: 'auto', 
                                        padding: '4px 2px 8px 2px', 
                                        scrollbarWidth: 'none',
                                        WebkitOverflowScrolling: 'touch',
                                        flexWrap: 'nowrap',
                                        width: '100%',
                                        boxSizing: 'border-box'
                                      }}
                                      className="presets-scrollbar-container hide-scrollbar"
                                    >
                                      {topPresets.map((item, idx) => renderPill(item, idx))}

                                      {/* Expand Pill Button */}
                                      {extraPresets.length > 0 && !showAllPresets && (
                                        <button
                                          type="button"
                                          onClick={() => setShowAllPresets(true)}
                                          style={{
                                            flexShrink: 0,
                                            background: '#f1f5f9',
                                            color: '#34a853',
                                            border: '1.5px dashed #34a853',
                                            padding: '6px 14px',
                                            borderRadius: '100px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            fontWeight: 850,
                                            fontSize: '0.72rem',
                                            whiteSpace: 'nowrap'
                                          }}
                                          className="preset-chip-card hover-scale"
                                        >
                                          <span>Mehr ({extraPresets.length}) ▾</span>
                                        </button>
                                      )}
                                    </div>
                                  </div>

                                  {/* Expanded Glass Accordion Container */}
                                  {showAllPresets && (
                                    <div style={{
                                      width: '100%',
                                      padding: '12px',
                                      background: 'rgba(248, 250, 252, 0.95)',
                                      borderRadius: '16px',
                                      border: '1px solid #e2e8f0',
                                      marginTop: '4px',
                                      boxSizing: 'border-box',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: '8px',
                                      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.06)'
                                    }} className="animation-fade-in">
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
                                        <span style={{ fontSize: '0.7rem', fontWeight: 850, color: '#1e293b' }}>
                                          🎯 Alle Schnelltext-Bausteine ({allPresets.length}):
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => setShowAllPresets(false)}
                                          style={{
                                            background: 'none',
                                            border: 'none',
                                            color: '#64748b',
                                            fontSize: '0.65rem',
                                            fontWeight: 800,
                                            cursor: 'pointer'
                                          }}
                                        >
                                          Schließen ✕
                                        </button>
                                      </div>

                                      <div style={{
                                        display: 'flex',
                                        flexWrap: 'wrap',
                                        gap: '6px',
                                        maxHeight: '220px',
                                        overflowY: 'auto',
                                        padding: '4px 0'
                                      }}>
                                        {extraPresets.map((item, idx) => renderPill(item, idx + 5))}
                                      </div>
                                    </div>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        )}
                      </div>

                        {/* Audio Play-Along Cassette Widget */}
                        {!readOnly && (
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
                              const audios = homeworkNotesList
                                .map((note, originalIdx) => ({ note, originalIdx }))
                                .filter(item => item.note.startsWith("AUDIO:"))
                                .map(item => {
                                  const parts = item.note.substring(6).split('|');
                                  return {
                                    url: parts[0],
                                    duration: parseInt(parts[1] || '0', 10),
                                    date: parts[2],
                                    label: parts[3] || 'Play-Along',
                                    role: parts[4] || 'teacher', // default legacy to teacher
                                    originalIdx: item.originalIdx
                                  };
                                });
                              
                              const now = new Date();
                              const currentMonth = now.getMonth();
                              const currentYear = now.getFullYear();
                              const currentMonthAudios = audios.filter(aud => {
                                if (!aud.date) return false;
                                const d = new Date(aud.date);
                                return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
                              });
                              const totalUsedSeconds = currentMonthAudios.reduce((sum, aud) => sum + aud.duration, 0);
                              const monthlyLimitSeconds = 240;
                              const isLimitReached = totalUsedSeconds >= monthlyLimitSeconds;

                              return (
                                <>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span>Play-Along Aufnahme (max. 60s)</span>
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
                                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />
                                          <span>Aufnahme starten</span>
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
                                          <span style={{ width: '8px', height: '8px', background: 'currentColor', display: 'inline-block' }} />
                                          <span>Stopp ({audioDuration}s / 60s)</span>
                                        </button>
                                      )}
                                    </div>
                                    
                                    {!isRecordingAudio && !isLimitReached && (
                                      <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                                        <input
                                          type="text"
                                          placeholder="Kassetten-Beschriftung (z.B. Tonleiter G-Dur)"
                                          value={audioLabel}
                                          onChange={(e) => setAudioLabel(e.target.value)}
                                          style={{
                                            flex: 1,
                                            fontSize: '0.74rem',
                                            padding: '6px 12px',
                                            borderRadius: '10px',
                                            border: '1px solid #cbd5e1',
                                            background: '#fff',
                                            outline: 'none',
                                            fontFamily: 'monospace'
                                          }}
                                        />
                                      </div>
                                    )}
                                  </div>

                                  <div style={{ 
                                    fontSize: '0.72rem', 
                                    color: isLimitReached ? '#ef4444' : '#475569', 
                                    fontWeight: 700, 
                                    marginTop: '2px',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                  }}>
                                    <span>
                                      {isLimitReached 
                                        ? '⚠️ Monatliches Aufnahme-Limit (240 Sek.) erreicht. Lösche alte Aufnahmen, um Platz zu schaffen.'
                                        : `Aufnahmezeit diesen Monat: ${totalUsedSeconds}s / ${monthlyLimitSeconds}s verbraucht.`}
                                    </span>
                                  </div>

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
                                          label={aud.label}
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
                      {!readOnly && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px' }}>
                          <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1e293b' }}>
                            🔒 Interne Notiz (nur für Lehrer)
                          </label>
                          <textarea
                            placeholder="Welche Aspekte liefen heute gut? Wo gab es Herausforderungen? Nur für Lehrer sichtbar..."
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
                              width: '100%', height: '70px', padding: '12px 14px', borderRadius: '16px',
                              border: '1px solid #cbd5e1', fontSize: '0.8rem', fontWeight: 600, outline: 'none', resize: 'none', background: 'white'
                            }}
                          />
                        </div>
                      )}

                    </div>
                  </div>

                  {/* Apple / Enterprise+ Floating Dynamic Island Action & Reassurance Bar */}
                  {!readOnly && (
                    <div style={{
                      position: 'sticky',
                      bottom: '8px',
                      zIndex: 40,
                      paddingTop: '6px',
                      paddingBottom: '6px',
                      marginTop: 'auto'
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                        padding: '12px 18px',
                        background: 'rgba(255, 255, 255, 0.92)',
                        backdropFilter: 'blur(24px) saturate(180%)',
                        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
                        borderRadius: '20px',
                        border: '1px solid rgba(226, 232, 240, 0.95)',
                        boxShadow: '0 8px 32px -4px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.04)',
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: saving ? '#3b82f6' : (hasChanges ? '#f59e0b' : '#22c55e'),
                            boxShadow: saving ? '0 0 8px #3b82f6' : (hasChanges ? '0 0 8px #f59e0b' : '0 0 8px #22c55e'),
                            animation: saving ? 'pulse 1s infinite' : 'none'
                          }} />
                          <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#334155' }}>
                            {saving ? 'Änderungen werden synchronisiert...' : (hasChanges ? 'Ungespeicherte Eingaben (Auto-Save aktiv)' : 'Alle Einträge in der Cloud gesichert')}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {hasChanges && (
                            <button
                              type="button"
                              onClick={() => handleSave(true)}
                              disabled={saving}
                              style={{
                                background: '#ffffff',
                                border: '1.5px solid #cbd5e1',
                                color: '#1e293b',
                                padding: '8px 14px',
                                borderRadius: '12px',
                                fontSize: '0.76rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                                transition: 'all 0.15s ease'
                              }}
                              className="hover-scale"
                            >
                              <span>💾</span>
                              <span>Jetzt sichern</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={async () => {
                              if (hasChanges && !saving) {
                                await handleSave(true);
                              }
                              handleClose();
                            }}
                            disabled={saving}
                            style={{
                              background: '#34a853',
                              border: 'none',
                              color: '#ffffff',
                              padding: '8px 20px',
                              borderRadius: '12px',
                              fontSize: '0.80rem',
                              fontWeight: 800,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              boxShadow: '0 2px 8px rgba(52, 168, 83, 0.25)',
                              transition: 'all 0.15s ease'
                            }}
                            className="hover-scale"
                          >
                            <span>✓</span>
                            <span>Fertig & Schließen</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Clean Bottom Spacing */}
                  <div style={{ paddingBottom: (isMobileView || isInsideSim || isFullscreen) ? '24px' : '16px' }} />
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
              0%, 100% { box-shadow: 0 0 20px rgba(52, 168, 83, 0.3); }
              50% { box-shadow: 0 0 35px rgba(52, 168, 83, 0.7); }
            }
            @keyframes peelIn {
              0% { transform: scale(0.6) rotate(-10deg); opacity: 0; }
              70% { transform: scale(1.08) rotate(3deg); }
              100% { transform: scale(1) rotate(0deg); opacity: 1; }
            }
            .panini-sticker-card {
              transition: transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.25s ease, border-color 0.25s ease;
              transform-style: preserve-3d;
            }
            .panini-sticker-card:hover {
              transform: translateY(-8px) scale(1.02);
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
            .panini-grid {
              display: grid;
              grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
              gap: 24px;
              width: 100%;
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
                padding: '8px 16px',
                borderRadius: '20px',
                fontSize: '0.76rem',
                fontWeight: 800,
                cursor: 'pointer',
                width: 'fit-content',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.03)',
                transition: 'all 0.15s ease'
              }}
              className="hover-scale"
            >
              <span>← Zurück zum Hub</span>
            </button>
          </div>

          {/* SIMULATOR TOGGLE BAR (Dev Mode - Teachers Only) */}
          {!readOnly && (
            <div style={{
              background: 'white',
              borderRadius: '20px',
              padding: '12px 20px',
              border: '1.5px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
              zIndex: 20,
              flexShrink: 0
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sliders size={15} color="#64748b" />
                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#334155' }}>
                  Entwickler-Modus (Simulation)
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.74rem', fontWeight: 700, color: '#64748b' }}>
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
                    fontSize: '0.74rem',
                    fontWeight: 900,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '5px 12px',
                    borderRadius: '12px',
                    boxShadow: '0 2px 6px rgba(234, 179, 8, 0.3)',
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
                    fontSize: '0.74rem',
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

          {/* ALBUM HEADER & PROGRESS TRACKER HERO BANNER */}
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
                  background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #0f172a 100%)',
                  borderRadius: '28px',
                  padding: '28px 32px',
                  color: 'white',
                  boxShadow: '0 20px 50px -10px rgba(49, 46, 129, 0.5)',
                  position: 'relative',
                  overflow: 'hidden',
                  border: '2px solid #facc15',
                  flexShrink: 0,
                  width: '100%',
                  boxSizing: 'border-box'
                }}>
                  {/* Gold Glow */}
                  <div style={{
                    position: 'absolute',
                    top: 0, right: 0, bottom: 0, left: 0,
                    background: 'radial-gradient(circle at 80% 20%, rgba(250, 204, 21, 0.25) 0%, transparent 60%)',
                    pointerEvents: 'none'
                  }} />

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px', position: 'relative', zIndex: 2 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                        <span style={{ fontSize: '2rem' }}>🏛️</span>
                        <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 900, letterSpacing: '-0.5px', color: '#facc15' }}>
                          Schuljahr-Ehrentafel {selectedSchoolYear}
                        </h2>
                        {renderSchoolYearSelector()}
                      </div>
                      <p style={{ margin: 0, fontSize: '0.86rem', color: '#c7d2fe', fontWeight: 600, maxWidth: '580px' }}>
                        Abgeheftete Meilensteine aus dem Schuljahr {selectedSchoolYear}. Alle gelernten Songs & Lehrwerke bleiben lebenslang im Repertoire!
                      </p>
                    </div>

                    <div style={{
                      background: 'rgba(255, 255, 255, 0.08)',
                      backdropFilter: 'blur(12px)',
                      border: '1.5px solid rgba(250, 204, 21, 0.4)',
                      borderRadius: '20px',
                      padding: '14px 22px',
                      textAlign: 'right',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                      flexShrink: 0
                    }}>
                      <span style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 900, color: '#facc15' }}>
                        SIEGEL {selectedSchoolYear}
                      </span>
                      <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#ffffff', marginTop: '2px' }}>
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
                background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                borderRadius: '28px',
                padding: '26px 32px',
                color: 'white',
                boxShadow: '0 20px 40px -15px rgba(15, 23, 42, 0.4)',
                position: 'relative',
                overflow: 'hidden',
                border: '1.5px solid rgba(255, 255, 255, 0.08)',
                flexShrink: 0,
                width: '100%',
                boxSizing: 'border-box'
              }}>
                {/* Glow splash background */}
                <div style={{
                  position: 'absolute',
                  top: '-80px',
                  right: '-80px',
                  width: '300px',
                  height: '300px',
                  background: 'radial-gradient(circle, rgba(52, 168, 83, 0.25) 0%, transparent 70%)',
                  pointerEvents: 'none',
                  borderRadius: '50%'
                }} />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px', position: 'relative', zIndex: 2 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                      <span style={{ fontSize: '1.6rem' }}>🏆</span>
                      <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, letterSpacing: '-0.5px', color: '#ffffff' }}>
                        Sticker Sammelalbum
                      </h2>
                      <span style={{
                        background: 'rgba(52, 168, 83, 0.2)',
                        border: '1px solid #34a853',
                        color: '#4ade80',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        padding: '4px 12px',
                        borderRadius: '20px',
                        letterSpacing: '0.04em'
                      }}>
                        {rankTitle}
                      </span>
                      {renderSchoolYearSelector()}
                    </div>
                    <p style={{ margin: 0, fontSize: '0.84rem', color: '#94a3b8', fontWeight: 600, maxWidth: '520px' }}>
                      Sammle XP, erstelle Streaks & meistere Songs, um alle haptischen Sammel-Sticker für dein virtuelles Musik-Album freizuschalten.
                    </p>
                  </div>

                  {/* Score pill */}
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.06)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '20px',
                    padding: '14px 24px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-end',
                    gap: '4px',
                    flexShrink: 0
                  }}>
                    <span style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 800, color: '#94a3b8' }}>
                      Sammelfortschritt
                    </span>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                      <strong style={{ fontSize: '1.8rem', fontWeight: 900, color: '#ffffff', lineHeight: 1 }}>
                        {collectedCount}
                      </strong>
                      <span style={{ fontSize: '1rem', color: '#64748b', fontWeight: 800 }}>
                        / {totalCount} Sticker ({percentage}%)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div style={{ marginTop: '20px', position: 'relative', zIndex: 2 }}>
                  <div style={{ width: '100%', height: '10px', background: 'rgba(255,255,255,0.08)', borderRadius: '10px', overflow: 'hidden' }}>
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
            borderRadius: '20px',
            border: '1.5px solid #e2e8f0',
            overflow: 'hidden',
            boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
            flexShrink: 0
          }}>
            <div 
              onClick={() => setIsXpLegendOpen(!isXpLegendOpen)}
              style={{
                padding: '14px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                background: isXpLegendOpen ? '#f8fafc' : 'white',
                transition: 'background 0.15s'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '1.2rem' }}>🎮</span>
                <strong style={{ fontSize: '0.86rem', fontWeight: 800, color: '#1e293b' }}>
                  XP-Legende & Punkte-Guide
                </strong>
                <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>
                  (Wie du Punkte & Sticker sammelst)
                </span>
              </div>
              <ChevronRight 
                size={18} 
                color="#64748b" 
                style={{ 
                  transform: isXpLegendOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s ease'
                }} 
              />
            </div>

            {isXpLegendOpen && (
              <div style={{
                padding: '16px 20px 20px 20px',
                borderTop: '1px solid #e2e8f0',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '14px',
                animation: 'fadeIn 0.2s ease-out'
              }}>
                <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '14px', border: '1px solid #e2e8f0', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '1.4rem' }}>⏱️</span>
                  <div>
                    <strong style={{ fontSize: '0.8rem', display: 'block', color: '#1e293b' }}>Übe-Fokus</strong>
                    <span style={{ fontSize: '0.74rem', color: '#64748b', lineHeight: '1.3' }}>Pro absolvierte Minute Übezeit erhältst du <strong>1 XP</strong>.</span>
                  </div>
                </div>
                <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '14px', border: '1px solid #e2e8f0', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '1.4rem' }}>🎯</span>
                  <div>
                    <strong style={{ fontSize: '0.8rem', display: 'block', color: '#1e293b' }}>Tägliches Fokus-Ziel</strong>
                    <span style={{ fontSize: '0.74rem', color: '#64748b', lineHeight: '1.3' }}>Tägliches Fokus-Ziel erreicht = <strong>+10 XP</strong> Bonus <em>(z.B. 3m Timer + 1m Extra = 4 XP Übezeit + 10 XP Bonus = 14 XP total)</em>.</span>
                  </div>
                </div>
                <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '14px', border: '1px solid #e2e8f0', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '1.4rem' }}>🏆</span>
                  <div>
                    <strong style={{ fontSize: '0.8rem', display: 'block', color: '#1e293b' }}>Song meistern</strong>
                    <span style={{ fontSize: '0.74rem', color: '#64748b', lineHeight: '1.3' }}>Lied auf 100% oder Stage-Ready = <strong>+50 XP</strong> Bonus.</span>
                  </div>
                </div>
                <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '14px', border: '1px solid #e2e8f0', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '1.4rem' }}>🔥</span>
                  <div>
                    <strong style={{ fontSize: '0.8rem', display: 'block', color: '#1e293b' }}>Streak-Bonus</strong>
                    <span style={{ fontSize: '0.74rem', color: '#64748b', lineHeight: '1.3' }}>Disziplin-Bonus: 7 Tage = <strong>+25 XP</strong>, 14 Tage = <strong>+50 XP</strong>, 30 Tage = <strong>+100 XP</strong>.</span>
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
            padding: '4px 2px 8px 2px',
            flexShrink: 0,
            minHeight: '48px'
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
                    background: isActive ? '#0f172a' : 'white',
                    color: isActive ? 'white' : '#475569',
                    border: isActive ? '1.5px solid #0f172a' : '1.5px solid #e2e8f0',
                    borderRadius: '20px',
                    padding: '9px 18px',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: isActive ? '0 4px 12px rgba(15, 23, 42, 0.15)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                  className="hover-scale"
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* 3D PANINI STICKER ALBUM GRID */}
          <div className="panini-grid">
            {ALL_STICKERS
              .filter(st => stickerCategoryFilter === 'all' || st.category === stickerCategoryFilter)
              .map((st, idx) => {
                const activeStickerSource = selectedSchoolYear === currentSchoolYear 
                  ? collectedStickers 
                  : (simulatedSchoolYearData[selectedSchoolYear] || {});
                const info = activeStickerSource[st.id] || { count: 0, details: [] };
                const isCollected = info.count > 0;
                const isLegendary = st.rarity === 'legendary';
                const isEpic = st.rarity === 'epic';

                // Organic tilt angle offset per position
                const organicAngle = (idx % 3 - 1) * 2;

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
                      background: isCollected ? 'white' : '#f8fafc',
                      border: isCollected 
                        ? (isLegendary ? '2.5px solid #eab308' : isEpic ? '2.5px solid #af52de' : `2px solid ${st.color}`) 
                        : '2px dashed #cbd5e1',
                      borderRadius: '28px',
                      padding: '24px 20px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      textAlign: 'center',
                      gap: '14px',
                      position: 'relative',
                      boxShadow: isCollected 
                        ? (isLegendary ? '0 12px 30px rgba(234, 179, 8, 0.2)' : '0 10px 25px rgba(0,0,0,0.06)') 
                        : 'inset 0 2px 8px rgba(0,0,0,0.02)',
                      cursor: 'pointer',
                      transform: `rotate(${organicAngle}deg)`
                    }}
                  >
                    {/* Holographic foil overlay for legendary/epic stickers */}
                    {isCollected && (isLegendary || isEpic) && (
                      <div 
                        className="holo-foil-overlay" 
                        style={{
                          position: 'absolute',
                          inset: 0,
                          borderRadius: '26px',
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
                          top: '14px',
                          left: '14px',
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
                          boxShadow: '0 3px 8px rgba(0,0,0,0.2)',
                          zIndex: 10,
                          fontWeight: 'bold',
                          fontSize: '1rem'
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
                      top: '14px',
                      right: '14px',
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
                          fontSize: '0.72rem',
                          padding: '3px 8px',
                          borderRadius: '12px',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
                        }}>
                          x{info.count}
                        </span>
                      )}

                      <span style={{
                        background: isCollected 
                          ? (isLegendary ? 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)' : isEpic ? '#af52de' : '#e2e8f0') 
                          : '#f1f5f9',
                        color: isCollected && (isLegendary || isEpic) ? 'white' : '#64748b',
                        fontSize: '0.64rem',
                        fontWeight: 900,
                        padding: '3px 8px',
                        borderRadius: '10px',
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase'
                      }}>
                        {st.rarityLabel || 'Standard'}
                      </span>
                    </div>

                    {/* LARGE HIGH-IMPACT DIE-CUT STICKER GRAPHIC (135px Diameter) */}
                    <div style={{
                      width: '135px',
                      height: '135px',
                      marginTop: '8px',
                      borderRadius: '50%',
                      background: isCollected ? st.bg : '#f1f5f9',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                      border: isCollected ? '4px solid #ffffff' : '2px dashed #cbd5e1',
                      boxShadow: isCollected 
                        ? '0 10px 22px rgba(0, 0, 0, 0.14), 0 0 0 1px rgba(0,0,0,0.06)' 
                        : 'inset 0 2px 6px rgba(0,0,0,0.05)',
                      transition: 'all 0.3s ease',
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
                        {/* Instant Emoji Fallback (renders with 0ms latency) */}
                        <span style={{ 
                          fontSize: isCollected ? '3.5rem' : '3.2rem', 
                          zIndex: 1, 
                          filter: isCollected ? 'none' : 'grayscale(100%) opacity(0.35)',
                          userSelect: 'none'
                        }}>
                          {st.emoji}
                        </span>

                        {/* High-Res PNG Image with smooth async decoding */}
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
                            filter: isCollected ? 'drop-shadow(0 4px 8px rgba(0,0,0,0.12))' : 'grayscale(100%) opacity(0.35) blur(1px)',
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
                          fontSize: '1.4rem'
                        }}>
                          🔒
                        </div>
                      )}
                    </div>

                    {/* STICKER TITLE & DESCRIPTION */}
                    <div style={{ position: 'relative', zIndex: 2, width: '100%' }}>
                      <h4 style={{ 
                        margin: '0 0 4px 0', 
                        fontSize: '0.96rem', 
                        fontWeight: 900, 
                        color: isCollected ? '#0f172a' : '#64748b' 
                      }}>
                        {st.title}
                      </h4>
                      <p style={{ 
                        margin: 0, 
                        fontSize: '0.75rem', 
                        color: isCollected ? '#64748b' : '#94a3b8', 
                        fontWeight: 600, 
                        lineHeight: '1.35' 
                      }}>
                        {st.desc}
                      </p>
                    </div>

                    {/* COLLECTION HISTORY LOG PREVIEW */}
                    {isCollected && (
                      <div style={{
                        width: '100%',
                        borderTop: '1px solid #f1f5f9',
                        paddingTop: '10px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                        alignItems: 'flex-start',
                        maxHeight: '75px',
                        overflowY: 'auto',
                        position: 'relative',
                        zIndex: 2
                      }}>
                        <span style={{ fontSize: '0.64rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>
                          {st.multi ? `Historie (${info.count}x):` : 'Freigeschaltet:'}
                        </span>
                        {st.multi ? (
                          info.details.slice(0, 2).map((dt, dIdx) => (
                            <div key={dIdx} style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: '0.68rem', color: '#475569', fontWeight: 650 }}>
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }}>{dt.topic}</span>
                              <span style={{ color: '#94a3b8' }}>{dt.date}</span>
                            </div>
                          ))
                        ) : (
                          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: '0.68rem', color: '#34a853', fontWeight: 700 }}>
                            <span>✓ Freigeschaltet</span>
                            <span style={{ color: '#64748b' }}>{info.details[0]?.date || 'Aktiv'}</span>
                          </div>
                        )}
                      </div>
                    )}
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
                      fontSize: '0.68rem', 
                      fontWeight: 900, 
                      textTransform: 'uppercase', 
                      letterSpacing: '0.12em', 
                      color: isLegendary ? '#facc15' : isEpic ? '#c084fc' : st.color || '#34a853',
                      background: 'rgba(255,255,255,0.06)',
                      padding: '4px 12px',
                      borderRadius: '12px',
                      border: '1px solid rgba(255,255,255,0.1)'
                    }}>
                      ⭐ {st.rarityLabel || 'Standard'} • Schuljahr {getSchoolYearString(displayDate)}
                    </span>
                    <h3 style={{ fontSize: '1.6rem', fontWeight: 900, margin: '10px 0 0 0', letterSpacing: '-0.5px', color: '#ffffff' }}>
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
                        <span style={{ fontSize: '2.5rem', filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.6))' }}>🔒</span>
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

                  {/* Song Master Interpret & Title Badge */}
                  {(st.id === 'song-master' || activeTopic) && (
                    <div style={{
                      width: '100%',
                      textAlign: 'center',
                      background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.22) 0%, rgba(234, 179, 8, 0.35) 100%)',
                      border: '1.5px solid #facc15',
                      borderRadius: '16px',
                      padding: '10px 14px',
                      margin: '10px 0 4px 0',
                      boxShadow: '0 4px 15px rgba(245, 158, 11, 0.2)',
                      zIndex: 2
                    }}>
                      <span style={{ fontSize: '0.68rem', fontWeight: 900, color: '#facc15', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block' }}>
                        Gemeisterter Song (Interpret & Titel):
                      </span>
                      <span style={{ fontSize: '1.15rem', fontWeight: 900, color: '#ffffff', display: 'block', marginTop: '2px', wordBreak: 'break-word' }}>
                        🎵 {activeTopic || 'Song gemeistert'}
                      </span>
                    </div>
                  )}

                  {/* Multi-song Dropdown Selector if student mastered multiple songs */}
                  {details.length > 1 && (
                    <div style={{
                      width: '100%',
                      margin: '4px 0 0 0',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      zIndex: 3
                    }}>
                      <label style={{ fontSize: '0.68rem', fontWeight: 900, color: '#facc15', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        Ausgewählter Song ({details.length} gemeistert):
                      </label>
                      <select
                        value={activeIdx}
                        onChange={(e) => setSelectedStickerDetailIdx(Number(e.target.value))}
                        style={{
                          width: '100%',
                          background: '#0f172a',
                          border: '2px solid #eab308',
                          borderRadius: '14px',
                          color: '#ffffff',
                          padding: '10px 14px',
                          fontSize: '0.88rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          boxShadow: '0 4px 14px rgba(250, 204, 21, 0.25)',
                          outline: 'none'
                        }}
                      >
                        {details.map((d: any, idx: number) => (
                          <option key={idx} value={idx}>
                            🎵 {d.topic}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Description Box */}
                  <div style={{ 
                    width: '100%', 
                    textAlign: 'center', 
                    background: 'rgba(255,255,255,0.04)', 
                    padding: '16px 20px', 
                    borderRadius: '20px', 
                    border: '1px solid rgba(255,255,255,0.08)',
                    zIndex: 2
                  }}>
                    <p style={{ fontSize: '0.86rem', color: '#e2e8f0', margin: '0 0 6px 0', lineHeight: '1.4', fontWeight: 600 }}>
                      {st.desc}
                    </p>
                    {st.equiv && (
                      <div style={{
                        background: 'rgba(56, 189, 248, 0.1)',
                        border: '1px solid rgba(56, 189, 248, 0.25)',
                        borderRadius: '12px',
                        padding: '6px 12px',
                        fontSize: '0.74rem',
                        fontWeight: 800,
                        color: '#38bdf8',
                        margin: '8px 0 6px 0'
                      }}>
                        {st.equiv}
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '8px' }}>
                      <span style={{ 
                        fontSize: '0.72rem', 
                        color: isCollected ? '#4ade80' : '#94a3b8', 
                        fontWeight: 800 
                      }}>
                        {isCollected ? `✓ Freigeschaltet (${info.count}x gesammelt)` : '🔒 Noch nicht freigeschaltet'}
                      </span>
                      <span style={{ color: 'rgba(255,255,255,0.2)' }}>•</span>
                      <span style={{ fontSize: '0.72rem', color: '#34a853', fontWeight: 900 }}>
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
                          background: 'linear-gradient(135deg, #34a853 0%, #2e7d32 100%)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '16px',
                          padding: '14px',
                          fontSize: '0.86rem',
                          fontWeight: 900,
                          cursor: 'pointer',
                          boxShadow: '0 6px 20px rgba(52, 168, 83, 0.3)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          transition: 'all 0.15s'
                        }}
                        className="hover-scale"
                      >
                        <span>📲</span> Auszeichnung teilen
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
                  <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#0f172a', margin: '0 0 8px 0' }}>
                    {awardedStickerToAnimate.title}
                  </h2>
                  <p style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 600, margin: 0 }}>
                    {awardedStickerToAnimate.desc}
                  </p>
                </div>
                <button
                  onClick={() => setAwardedStickerToAnimate(null)}
                  style={{
                    background: 'linear-gradient(135deg, #34a853 0%, #34a853 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '14px',
                    padding: '12px 32px',
                    fontWeight: 900,
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(52, 168, 83, 0.2)',
                    transition: 'all 0.15s'
                  }}
                  className="hover-scale"
                >
                  Großartig!
                </button>
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

            const masteredSongs = activeSongSkills.filter(s => s.is_stage_ready || s.progress_percent === 100);

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

const InlineAudioPlayer: React.FC<{ url: string; label: string; onDelete?: () => void; duration?: number }> = ({ url, label, onDelete, duration: initialDuration }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState<number>(initialDuration || 0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [resolvedUrl, setResolvedUrl] = useState<string>(url);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

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
    };
  }, [url]);

  const togglePlay = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
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
    const handleLoadedMetadata = () => {
      if (audio.duration && isFinite(audio.duration)) {
        setDuration(Math.round(audio.duration));
      }
    };
    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    if (audio.duration && isFinite(audio.duration)) {
      setDuration(Math.round(audio.duration));
    }

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [resolvedUrl]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = playbackRate;
  }, [playbackRate]);

  return (
    <div style={{
      background: 'linear-gradient(135deg, #2c2a29 0%, #1a1817 100%)',
      borderRadius: '16px',
      padding: '16px',
      width: '100%',
      maxWidth: '360px',
      border: '4px solid #0f0e0d',
      boxShadow: '0 8px 20px rgba(0,0,0,0.3)',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      fontFamily: 'monospace',
      color: '#fff',
      alignSelf: 'center',
      position: 'relative',
      userSelect: 'none'
    }}>
      <audio ref={audioRef} src={resolvedUrl} />
      
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
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '170px' }}>
            {label.toUpperCase()}
          </span>
          <span>{Math.round(currentTime)}s / {duration || '0'}s</span>
        </div>

        {/* Interactive Seek Range Slider */}
        <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '6px', margin: '2px 0' }}>
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.1}
            value={currentTime}
            onChange={(e) => {
              const newTime = parseFloat(e.target.value);
              setCurrentTime(newTime);
              if (audioRef.current) {
                audioRef.current.currentTime = newTime;
              }
            }}
            style={{
              width: '100%',
              accentColor: '#ef4444',
              cursor: 'pointer',
              height: '14px'
            }}
          />
        </div>

        <div style={{
          background: '#000',
          borderRadius: '4px',
          height: '28px',
          margin: '4px 0',
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          padding: '0 20px',
          position: 'relative'
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

      {/* Control Buttons */}
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
        <button
          type="button"
          onClick={() => togglePlay()}
          style={{
            background: '#d97706',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            padding: '8px 16px',
            fontSize: '0.72rem',
            fontWeight: 800,
            cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px'
          }}
        >
          {isPlaying ? (
            <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
              <rect x="5" y="5" width="4" height="14" rx="1" />
              <rect x="15" y="5" width="4" height="14" rx="1" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
              <path d="M8 5v14l11-7z"/>
            </svg>
          )}
          <span>{isPlaying ? 'PAUSE' : 'PLAY'}</span>
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
            borderRadius: '8px',
            padding: '8px 16px',
            fontSize: '0.72rem',
            fontWeight: 800,
            cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px'
          }}
        >
          <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
            <rect x="5" y="5" width="14" height="14" rx="1.5"/>
          </svg>
          <span>STOP</span>
        </button>

        <button
          type="button"
          onClick={() => setPlaybackRate(prev => prev === 1 ? 0.8 : (prev === 0.8 ? 0.6 : 1))}
          title="Wiedergabegeschwindigkeit verlangsamen zum Üben"
          style={{
            background: playbackRate !== 1 ? '#2563eb' : '#475569',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            padding: '8px 10px',
            fontSize: '0.70rem',
            fontWeight: 800,
            cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <span>{playbackRate}x</span>
        </button>

        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            style={{
              background: '#ef4444',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 16px',
              fontSize: '0.72rem',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px'
            }}
          >
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6"/>
            </svg>
            <span>LÖSCHEN</span>
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
