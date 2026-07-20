import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, Award, Flame, AlertCircle, BookOpen, Music, History, Plus, ChevronRight, Book, Star, Sliders, RotateCcw, Mic, Square, Play, VolumeX, Volume2, Trash2, Headphones, Minimize2, Maximize2, Calendar, FileText } from 'lucide-react';
import Confetti from 'react-confetti';
import { supabase } from '../lib/supabase';
// @ts-ignore
import * as lamejs from '@breezystack/lamejs';

export const ALL_STICKERS = [
  // Meilensteine / Üben
  { id: 'fleiss-pionier', emoji: '🐝', title: 'Fleiß-Pionier', desc: 'Für insgesamt 50 Minuten fleißiges Üben.', color: '#34a853', bg: 'rgba(52, 168, 83, 0.1)', auto: true },
  { id: 'uebe-meister', emoji: '🦉', title: 'Übe-Meister', desc: 'Für insgesamt 250 Minuten ausdauerndes Üben.', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)', auto: true },
  { id: 'uebe-legende', emoji: '👑', title: 'Übe-Legende', desc: 'Für unglaubliche 1000 Minuten Übezeit!', color: '#af52de', bg: 'rgba(175, 82, 222, 0.1)', auto: true },
  { id: 'uebe-grossmeister', emoji: '🏆', title: 'Übe-Großmeister', desc: 'Für grandiose 2000 Minuten Übezeit!', color: '#34a853', bg: 'rgba(52, 168, 83, 0.1)', auto: true },

  // XP
  { id: 'xp-sammler', emoji: '⭐', title: 'XP-Sammler', desc: '250 XP auf dem Profil gesammelt.', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)', auto: true },
  { id: 'xp-champion', emoji: '🎖️', title: 'XP-Champion', desc: '1000 XP auf dem Profil gesammelt.', color: '#ec4899', bg: 'rgba(236, 72, 153, 0.1)', auto: true },
  { id: 'xp-meister', emoji: '🌌', title: 'XP-Meister', desc: 'Phänomenale 2500 XP auf dem Profil gesammelt.', color: '#6366f1', bg: 'rgba(99, 102, 241, 0.1)', auto: true },
  { id: 'xp-legende', emoji: '💎', title: 'XP-Legende', desc: 'Unglaubliche 5000 XP auf dem Profil gesammelt.', color: '#3c0d93', bg: 'rgba(60, 13, 147, 0.1)', auto: true },

  // Streaks
  { id: 'dranbleiber', emoji: '🔥', title: 'Dranbleiber', desc: 'Erreiche eine Übe-Streak von 3 Tagen.', color: '#f97316', bg: 'rgba(249, 115, 22, 0.1)', auto: true },
  { id: 'wochen-held', emoji: '📆', title: 'Wochen-Held', desc: 'Erreiche eine Übe-Streak von 7 Tagen.', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)', auto: true },
  { id: 'streak-koenig', emoji: '⚡', title: 'Streak-König', desc: 'Unglaubliche Übe-Streak von 21 Tagen gehalten!', color: '#eab308', bg: 'rgba(234, 179, 8, 0.1)', auto: true },
  { id: 'streak-kaiser', emoji: '👑', title: 'Streak-Kaiser', desc: 'Legendäre Übe-Streak von 30 Tagen gehalten!', color: '#7c2d12', bg: 'rgba(124, 45, 18, 0.1)', auto: true },

  // Songs
  { id: 'erster-erfolg', emoji: '🎵', title: 'Erster Erfolg', desc: 'Dein allererster gemeisterter Song (100%).', color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.1)', auto: true },
  { id: 'song-sammler', emoji: '📚', title: 'Song-Sammler', desc: 'Schon 3 Songs komplett gemeistert.', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.1)', auto: true },
  { id: 'repertoire-riese', emoji: '🦖', title: 'Repertoire-Riese', desc: '5 Songs zu 100% gemeistert und im Repertoire!', color: '#34a853', bg: 'rgba(52, 168, 83, 0.1)', auto: true },
  { id: 'repertoire-gigant', emoji: '🐉', title: 'Repertoire-Gigant', desc: '10 Songs zu 100% gemeistert und im Repertoire!', color: '#34a853', bg: 'rgba(19, 115, 51, 0.1)', auto: true },

  // Manuell
  { id: 'stage-star', emoji: '🎤', title: 'Bühnen-Star', desc: 'Für jeden Live-Auftritt vor Publikum.', color: '#a855f7', bg: 'rgba(168, 85, 247, 0.1)', auto: false },
  { id: 'song-master', emoji: '🏆', title: 'Song-Master', desc: 'Wird für jeden zu 100% gemeisterten Song verliehen.', color: '#eab308', bg: 'rgba(234, 179, 8, 0.1)', auto: false },
  { id: 'creative-mind', emoji: '💡', title: 'Kreativ-Kopf', desc: 'Für eigene Kompositionen, Improvisation oder kreative Ideen.', color: '#db2777', bg: 'rgba(219, 39, 119, 0.1)', auto: false },
  { id: 'extra-mile', emoji: '🚀', title: 'Extra-Meile', desc: 'Für das freiwillige Erarbeiten von Zusatzaufgaben.', color: '#2563eb', bg: 'rgba(37, 99, 235, 0.1)', auto: false }
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
  readOnly?: boolean;
  isEmbed?: boolean;
  isTeacherTools?: boolean;
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

const SKILL_TAGS = [
  { key: 'tempo', label: 'Tempo', icon: '⏱' },
  { key: 'rhythmus', label: 'Rhythmus', icon: '🥁' },
  { key: 'intonation', label: 'Töne / Intonation', icon: '🎵' },
  { key: 'fingersatz', label: 'Fingersatz', icon: '🖖' },
  { key: 'ausdruck', label: 'Ausdruck', icon: '🎭' },
  { key: 'auswendig', label: 'Auswendig', icon: '📖' },
  { key: 'kontinuitaet', label: 'Kontinuität', icon: '🔄' },
  { key: 'selbststaendigkeit', label: 'Selbst geübt', icon: '💪' },
];

export const MeisterwerkDocumentationModal: React.FC<MeisterwerkDocumentationModalProps> = ({ student, onClose, teacherId, initialLehrwerkId, onProfileClick, readOnly = false, isEmbed = false, isTeacherTools = false }) => {
  const [isCampusActive, setIsCampusActive] = useState<boolean>(student.is_campus_active ?? true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Skill-Radar & Feedback-Tagging
  const [showSkillRadar, setShowSkillRadar] = useState(false);
  const [pendingFeedbackTags, setPendingFeedbackTags] = useState<string[]>([]);
  const [pendingFeedbackStatus, setPendingFeedbackStatus] = useState<'beherrscht' | 'in_entwicklung' | 'wiederholen' | null>(null);
  const [isSavingFeedback, setIsSavingFeedback] = useState(false);
  const activePlat = typeof window !== 'undefined' ? localStorage.getItem('groovelab_active_platform') : 'campus';
  const modalContainerRef = useRef<HTMLDivElement>(null);

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

  // Developer simulation states
  const [simulatedSongsCount, setSimulatedSongsCount] = useState<number | null>(null);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
  const [selectedSimSticker, setSelectedSimSticker] = useState<string>('fleiss-pionier');
  const [simStickerContext, setSimStickerContext] = useState<string>('Simulation');
  const [selectedPreviewSticker, setSelectedPreviewSticker] = useState<any | null>(null);
  const [isDevSimulationActive, setIsDevSimulationActive] = useState<boolean>(false);
  const [awardedStickerToAnimate, setAwardedStickerToAnimate] = useState<any | null>(null);
  const [schoolName, setSchoolName] = useState<string>('Campus-Groovelab');
  const [shareCardLayout, setShareCardLayout] = useState<'dark' | 'light'>('dark');
  // Session log to capture all modifications made in current modal open state
  const [sessionLogs, setSessionLogs] = useState<string[]>([]);
  const [lessonDay, setLessonDay] = useState<number>(1); // Default to Monday = 1
  const [activeModalTab, setActiveModalTab] = useState<'document' | 'logbook' | 'stickeralbum'>('document');
  const [activeViewMode, setActiveViewMode] = useState<'document' | 'recordings' | 'loopstation' | 'practice'>(isTeacherTools ? 'recordings' : 'document');

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
            const creatorRole = readOnly ? 'student' : 'teacher';
            const audioMetaStr = `AUDIO:${audioUrlString}|${durationInSeconds}|${new Date().toISOString()}|${audioLabel.trim() || 'Aufnahme'}|${creatorRole}`;
            setHomeworkNotesList(prev => [...prev, audioMetaStr]);
            
            const updatedList = [...homeworkNotesList, audioMetaStr];
            await syncHomeworkNotes(updatedList);
            await fetchProgress();
            notifyHomeworkChange();
            setAudioLabel('');
          } catch (saveErr) {
            console.error("Failed to save audio metadata:", saveErr);
            alert("Fehler beim Speichern der Audio-Bemerkung im Protokoll.");
          }
        };

        try {
          const fileExt = blob.type.includes('webm') ? 'webm' : blob.type.includes('ogg') ? 'ogg' : blob.type.includes('wav') ? 'wav' : 'mp3';
          const fileName = `${student.id}_feedback_${Date.now()}.${fileExt}`;
          const filePath = `avatars/audio_feedback_${fileName}`;
          
          const { error: uploadErr } = await supabase.storage
            .from('campus-assets')
            .upload(filePath, blob, { 
              contentType: blob.type || 'audio/webm',
              cacheControl: 'private, max-age=3600' 
            });
            
          if (uploadErr) throw uploadErr;
          
          const { data: publicUrlData } = supabase.storage
            .from('campus-assets')
            .getPublicUrl(filePath);
            
          const uploadedUrl = publicUrlData.publicUrl;
          await saveAudioMetadata(uploadedUrl);
        } catch (err: any) {
          console.error("Storage upload failed:", err);
          alert(`Fehler beim Hochladen der Audio-Datei: ${err.message || err}. Bitte überprüfe deine Internetverbindung.`);
        } finally {
          setIsUploadingAudio(false);
        }
      };

      setAudioDuration(0);
      setIsRecordingAudio(true);
      recorder.start();
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
      
      // Trigger visual confetti animation modal
      const st = ALL_STICKERS.find(s => s.id === stickerId);
      if (st) {
        setAwardedStickerToAnimate(st);
      }
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
    if (student.id === 'teacher-self') {
      console.log("Teacher-self practice: skipping database homework notes synchronization.");
      return;
    }
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
            .single();
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
                .single();
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

  const downloadShareCard = (sticker: any) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 1200;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const medalCenterY = 440;
    const tX = 180;
    const tY = 80;
    const tW = 840;
    const tH = 1040;

    if (shareCardLayout === 'dark') {
      // 1. Draw premium dark obsidian studio background
      ctx.fillStyle = '#09090b';
      ctx.fillRect(0, 0, 1200, 1200);

      // Draw Spotify Wrapped slanted color splash in canvas
      ctx.save();
      ctx.translate(600, 600);
      ctx.rotate(-12 * Math.PI / 180);
      const gradient = ctx.createLinearGradient(-600, -600, 600, -200);
      gradient.addColorStop(0, sticker.color ? `${sticker.color}45` : 'rgba(52, 168, 83, 0.45)');
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(-800, -800, 1600, 600);
      ctx.restore();

      // Draw large slanted backdrop text overlay
      ctx.save();
      ctx.translate(600, 600);
      ctx.rotate(-12 * Math.PI / 180);
      ctx.font = '900 130px "Helvetica Neue", Arial, sans-serif';
      ctx.fillStyle = sticker.color ? `${sticker.color}15` : 'rgba(52, 168, 83, 0.15)';
      ctx.textAlign = 'center';
      ctx.fillText(sticker.title.toUpperCase(), 0, 20);
      ctx.restore();

      // 1. Draw solid dark grey background card container
      ctx.fillStyle = '#121216';
      ctx.fillRect(tX, tY, tW, tH);

      // 5. Draw glowing colored border matching sticker color
      ctx.save();
      ctx.shadowColor = sticker.color || '#34a853';
      ctx.shadowBlur = 40;
      ctx.strokeStyle = sticker.color || '#34a853';
      ctx.lineWidth = 6;
      ctx.strokeRect(tX, tY, tW, tH);
      ctx.restore();

      // 6. Header Action Title Pill (slanted)
      ctx.save();
      ctx.translate(600, tY + 90);
      ctx.rotate(-2 * Math.PI / 180);
      ctx.fillStyle = sticker.color || '#34a853';
      const pillText = 'GEMEISTERT!';
      ctx.font = '900 28px "Helvetica Neue", Arial, sans-serif';
      const pillTextWidth = ctx.measureText(pillText).width;
      const pillW = pillTextWidth + 40;
      const pillH = 46;
      ctx.beginPath();
      if (typeof (ctx as any).roundRect === 'function') {
        (ctx as any).roundRect(-pillW/2, -pillH/2, pillW, pillH, 23);
      } else {
        ctx.rect(-pillW/2, -pillH/2, pillW, pillH);
      }
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(pillText, 0, 0);
      ctx.restore();

      // 7. Student Details (Dynamic layout to avoid overlapping)
      let textY = tY + 670;
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 54px "Helvetica Neue", Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(displayedStudentName, 600, textY);

      if (studentInstrument) {
        textY += 45;
        ctx.fillStyle = '#94a3b8';
        ctx.font = '900 24px "Helvetica Neue", Inter, sans-serif';
        ctx.fillText(studentInstrument.toUpperCase(), 600, textY);
      }

      textY += 60;
      ctx.fillStyle = sticker.color || '#34a853';
      ctx.font = 'italic 900 48px "Helvetica Neue", Arial, sans-serif';
      ctx.fillText(sticker.title.toUpperCase(), 600, textY);

      textY += 55;
      ctx.fillStyle = '#cbd5e1';
      ctx.font = 'bold 28px "Helvetica Neue", Inter, sans-serif';
      ctx.fillText(sticker.desc, 600, textY);

      // 8. Translucent Badge Pill for School Name
      const badgeText = schoolName.toUpperCase();
      ctx.font = 'bold 20px "Helvetica Neue", Inter, sans-serif';
      const textWidth = ctx.measureText(badgeText).width;
      const badgeW = textWidth + 60;
      const badgeH = 54;
      const badgeX = 600 - badgeW / 2;
      const badgeY = tY + 900;

      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      if (typeof (ctx as any).roundRect === 'function') {
        (ctx as any).roundRect(badgeX, badgeY, badgeW, badgeH, 27);
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

      // 9. Website URL footer (Dark Mode)
      ctx.fillStyle = sticker.color || '#34a853';
      ctx.font = '900 24px "Helvetica Neue", Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('campus-groovelab.de', 600, tY + 985);
    } else if (shareCardLayout === 'light') {
      // 1. Draw premium light background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 1200, 1200);

      // Draw Spotify Wrapped slanted color splash (light mode)
      ctx.save();
      ctx.translate(600, 600);
      ctx.rotate(-12 * Math.PI / 180);
      const gradient = ctx.createLinearGradient(-600, -600, 600, -200);
      gradient.addColorStop(0, sticker.color ? `${sticker.color}25` : 'rgba(52, 168, 83, 0.25)');
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(-800, -800, 1600, 600);
      ctx.restore();

      // Draw large slanted backdrop text overlay (light mode)
      ctx.save();
      ctx.translate(600, 600);
      ctx.rotate(-12 * Math.PI / 180);
      ctx.font = '900 130px "Helvetica Neue", Arial, sans-serif';
      ctx.fillStyle = sticker.color ? `${sticker.color}10` : 'rgba(52, 168, 83, 0.10)';
      ctx.textAlign = 'center';
      ctx.fillText(sticker.title.toUpperCase(), 0, 20);
      ctx.restore();

      // 1. Draw solid light grey background card container
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(tX, tY, tW, tH);

      // 5. Draw glowing colored border matching sticker color (light mode)
      ctx.save();
      ctx.shadowColor = sticker.color || '#34a853';
      ctx.shadowBlur = 30;
      ctx.strokeStyle = sticker.color || '#34a853';
      ctx.lineWidth = 6;
      ctx.strokeRect(tX, tY, tW, tH);
      ctx.restore();

      // 6. Header Action Title Pill (slanted - light mode)
      ctx.save();
      ctx.translate(600, tY + 90);
      ctx.rotate(-2 * Math.PI / 180);
      ctx.fillStyle = sticker.color || '#34a853';
      const pillText = 'GEMEISTERT!';
      ctx.font = '900 28px "Helvetica Neue", Arial, sans-serif';
      const pillTextWidth = ctx.measureText(pillText).width;
      const pillW = pillTextWidth + 40;
      const pillH = 46;
      ctx.beginPath();
      if (typeof (ctx as any).roundRect === 'function') {
        (ctx as any).roundRect(-pillW/2, -pillH/2, pillW, pillH, 23);
      } else {
        ctx.rect(-pillW/2, -pillH/2, pillW, pillH);
      }
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(pillText, 0, 0);
      ctx.restore();

      // 7. Student Details (Dynamic layout to avoid overlapping)
      let textY = tY + 670;
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 54px "Helvetica Neue", Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(displayedStudentName, 600, textY);

      if (studentInstrument) {
        textY += 45;
        ctx.fillStyle = '#64748b';
        ctx.font = '900 24px "Helvetica Neue", Inter, sans-serif';
        ctx.fillText(studentInstrument.toUpperCase(), 600, textY);
      }

      textY += 60;
      ctx.fillStyle = sticker.color || '#34a853';
      ctx.font = 'italic 900 48px "Helvetica Neue", Arial, sans-serif';
      ctx.fillText(sticker.title.toUpperCase(), 600, textY);

      textY += 55;
      ctx.fillStyle = '#475569';
      ctx.font = 'bold 28px "Helvetica Neue", Inter, sans-serif';
      ctx.fillText(sticker.desc, 600, textY);

      // 8. Translucent Badge Pill for School Name
      const badgeText = schoolName.toUpperCase();
      ctx.font = 'bold 20px "Helvetica Neue", Inter, sans-serif';
      const textWidth = ctx.measureText(badgeText).width;
      const badgeW = textWidth + 60;
      const badgeH = 54;
      const badgeX = 600 - badgeW / 2;
      const badgeY = tY + 900;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.04)';
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      if (typeof (ctx as any).roundRect === 'function') {
        (ctx as any).roundRect(badgeX, badgeY, badgeW, badgeH, 27);
      } else {
        ctx.rect(badgeX, badgeY, badgeW, badgeH);
      }
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#1e293b';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(badgeText, 600, badgeY + badgeH / 2);
      ctx.textBaseline = 'alphabetic'; // reset

      // 9. Website URL footer (Light Mode)
      ctx.fillStyle = sticker.color || '#34a853';
      ctx.font = '900 24px "Helvetica Neue", Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('campus-groovelab.de', 600, tY + 985);
    }

    // Helper stenciled/slapped sticker asset loader
    const drawStickerAsset = (imgOrEmoji: HTMLImageElement | string, isImg: boolean) => {
      ctx.save();
      ctx.translate(600, medalCenterY);

      // Sticker drop shadow
      ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
      ctx.shadowBlur = 12;
      ctx.shadowOffsetX = -5;
      ctx.shadowOffsetY = 8;

      const stickerRad = 180;

      if (isImg && typeof imgOrEmoji !== 'string') {
        // Draw backing white border for ripped/slapped vinyl sticker effect
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, stickerRad + 8, 0, Math.PI * 2);
        ctx.fill();

        ctx.save();
        ctx.beginPath();
        ctx.arc(0, 0, stickerRad, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(imgOrEmoji, -stickerRad, -stickerRad, stickerRad * 2, stickerRad * 2);
        ctx.restore();

        // Sticker outline border
        ctx.shadowColor = 'transparent';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(0, 0, stickerRad, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        // Fallback emoji
        ctx.shadowColor = 'transparent';
        ctx.font = '220px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(sticker.emoji || '🏆', 0, 0);
      }
      ctx.restore();
      triggerDownload(canvas, sticker.id);
    };

    // Load sticker asset
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = `/stickers/${sticker.id}.png?v=1`;
    img.onload = () => {
      drawStickerAsset(img, true);
    };
    img.onerror = () => {
      drawStickerAsset(sticker.emoji || '🏆', false);
    };
  };

  const triggerDownload = (canvas: HTMLCanvasElement, filename: string) => {
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `campus_sticker_${filename}.png`;
    link.href = dataUrl;
    link.click();
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

    const finalNotesList = [...homeworkNotesList];
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
        onClick={() => setShowSkillRadar(true)}
        title="Skill-Radar"
        style={{
          background: 'rgba(255,255,255,0.15)',
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
        <Sliders size={isMobile ? 12 : 13} />
        <span>Skill-Radar</span>
      </button>
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
        onClick={handleClose}
        style={{
          background: 'rgba(255,255,255,0.15)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '50%',
          width: '30px',
          height: '30px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: '#ffffff',
          transition: 'all 0.18s ease',
          flexShrink: 0
        }}
        className="hover-scale"
      >
        <X size={13} />
      </button>
    );
  };

  const content = (
    <div style={{
      background: useNotebookLayout 
        ? (bookColor 
            ? `radial-gradient(circle, ${bookColor.from} 0%, ${bookColor.to} 100%)` 
            : 'radial-gradient(circle, #5c4d40 0%, #30261f 100%)') 
        : '#f3f3f6', // Zurich neutral gray background canvas or tactile book cover
      borderRadius: isFullscreen ? '0' : '20px',
      width: '100%',
      maxWidth: isFullscreen ? '100vw' : '1360px',
      height: isEmbed ? '100%' : (isFullscreen ? '100vh' : '92vh'),
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
                {/* Header - Apple-style compact redesign */}
        <div style={{
          padding: '16px 20px',
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }} className="header-left-info">
              <div 
                onClick={() => onProfileClick && onProfileClick(student)}
                title={onProfileClick ? 'Schülerprofil anzeigen' : undefined}
                style={{
                  width: '38px',
                  height: '38px',
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
            {isCampusActive && (
              <div style={{ display: 'flex', gap: '8px', marginLeft: '12px' }} className="header-tabs-desktop-container">
                {!isTeacherTools && (
                  <button
                    type="button"
                    onClick={() => setActiveViewMode('document')}
                    style={{
                      background: activeViewMode === 'document' ? '#34a853' : 'rgba(255,255,255,0.15)',
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
                    <BookOpen size={14} />
                    <span>Protokoll</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setActiveViewMode('recordings')}
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
                {activePlat === 'campus' && (
                  <button
                    type="button"
                    onClick={() => setActiveViewMode('loopstation')}
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
                )}
                <button
                  type="button"
                  onClick={() => setActiveViewMode('practice')}
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
              </div>
            )}

            {/* Actions (Always visible on all screen sizes, including Fullscreen + Close) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }} className="header-right-actions">
              <div className="header-desktop-archiv" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                {renderSkillRadarButton()}
                {renderArchivButton()}
              </div>
              {renderFullscreenButton()}
              {renderCloseButton()}
            </div>

          </div>

          {/* Bottom Row (mobile/tablet only) - Wrapped cleanly in 2 rows, no horizontal scrolling cutoffs */}
          {isCampusActive && (
            <div className="header-mobile-menu-row" style={{
              display: 'none',
              flexWrap: 'wrap',
              gap: '8px',
              width: '100%',
              marginTop: '12px',
              justifyContent: 'center',
              alignItems: 'center'
            }}>
              {!isTeacherTools && (
                <button
                  type="button"
                  onClick={() => setActiveViewMode('document')}
                  style={{
                    background: activeViewMode === 'document' ? '#34a853' : 'rgba(255,255,255,0.15)',
                    border: 'none',
                    color: '#ffffff',
                    padding: '6px 12px',
                    borderRadius: '20px',
                    fontSize: '0.74rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <BookOpen size={12} />
                  <span>Protokoll</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setActiveViewMode('recordings')}
                style={{
                  background: activeViewMode === 'recordings' ? '#4f46e5' : 'rgba(255,255,255,0.15)',
                  border: 'none',
                  color: '#ffffff',
                  padding: '6px 12px',
                  borderRadius: '20px',
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Mic size={12} />
                <span>Aufnahmen</span>
              </button>
              {activePlat === 'campus' && (
                <button
                  type="button"
                  onClick={() => setActiveViewMode('loopstation')}
                  style={{
                    background: activeViewMode === 'loopstation' ? '#dc2626' : 'rgba(255,255,255,0.15)',
                    border: 'none',
                    color: '#ffffff',
                    padding: '6px 12px',
                    borderRadius: '20px',
                    fontSize: '0.74rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Sliders size={12} />
                  <span>Loopstation</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setActiveViewMode('practice')}
                style={{
                  background: activeViewMode === 'practice' ? '#eab308' : 'rgba(255,255,255,0.15)',
                  border: 'none',
                  color: '#ffffff',
                  padding: '6px 12px',
                  borderRadius: '20px',
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Music size={12} />
                <span>Übe-Begleiter</span>
              </button>
              {renderSkillRadarButton(true)}
              {renderArchivButton(true)}
            </div>
          )}
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
        }} className="modal-content-container">
          {activeViewMode === 'loopstation' ? (
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
          ) : activeViewMode === 'practice' ? (
            <GroovePracticeCompanion
              useNotebookLayout={useNotebookLayout}
            />
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
                position: 'relative',
                padding: '28px'
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
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
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

              {!isTeacherTools && (
                /* RIGHT PAGE: Schüler Aufnahmen */
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
                    marginBottom: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <Music size={16} /> Eigene Aufnahmen (Schüler)
                  </h3>

                  {/* For student: render the recording widget on their page inside the gallery */}
                  {readOnly && (
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
                    const studentAudios = homeworkNotesList
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
                      .filter(aud => aud.role === 'student');

                    if (studentAudios.length === 0) {
                      return (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', padding: '60px 20px', gap: '12px', textAlign: 'center' }}>
                          <Music size={28} style={{ opacity: 0.4, color: '#64748b' }} />
                          <div>
                            <p style={{ fontWeight: 700, fontSize: '0.86rem', color: '#64748b', margin: '0 0 2px' }}>Keine eigenen Aufnahmen</p>
                            <p style={{ fontSize: '0.74rem', margin: 0, opacity: 0.8 }}>Nimm dein Spiel auf und zeige deine Fortschritte deinem Lehrer!</p>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                        {studentAudios.map((aud, idx) => (
                          <div key={idx} style={{ display: 'flex', justifyContent: 'center' }}>
                            <RetroCassettePlayer
                              url={aud.url}
                              duration={aud.duration}
                              index={idx}
                              label={aud.label}
                              onDelete={readOnly ? () => handleDeleteNote(aud.originalIdx) : undefined}
                            />
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              )}
            </>
          ) : activeModalTab === 'document' ? (
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
            .modal-content-container {
              display: flex !important;
              flex-direction: row !important;
            }
            
            @media (max-width: 900px) {
              .modal-header-container {
                flex-direction: column !important;
                align-items: stretch !important;
                padding: 12px 16px !important;
                gap: 12px !important;
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
              
              /* Stack columns vertically on mobile and tablet viewport sizes */
              .modal-content-container {
                flex-direction: column !important;
                overflow-y: auto !important;
              }
              .modal-content-container > div {
                flex: none !important;
                width: 100% !important;
                max-width: 100% !important;
                box-sizing: border-box !important;
                height: auto !important;
                min-height: auto !important;
                overflow: visible !important;
                border-right: none !important;
                border-left: none !important;
                padding: 16px !important;
              }
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

                              {/* Tags */}
                              <div>
                                <span style={{ fontSize: '0.66rem', fontWeight: 850, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                  Schwierigkeiten
                                </span>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '6px' }}>
                                  {SKILL_TAGS.map(tag => {
                                    const active = pendingFeedbackTags.includes(tag.key);
                                    const limitReached = !active && pendingFeedbackTags.length >= 2;
                                    return (
                                      <button
                                        key={tag.key}
                                        type="button"
                                        onClick={() => setPendingFeedbackTags(prev => {
                                          if (prev.includes(tag.key)) {
                                            return prev.filter(t => t !== tag.key);
                                          }
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
                                          if (prev.includes(tag)) {
                                            return prev.filter(t => t !== tag);
                                          }
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
                                <div style={{ fontSize: '0.66rem', color: '#64748b', marginTop: '6px', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <span>💡</span>
                                  <span style={{ fontWeight: 600 }}>Wähle maximal 2 Hauptschwierigkeiten aus, um den Schüler gezielt zu fördern.</span>
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
                  
                  {!readOnly && (
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
                  )}
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
                              <span style={{ fontSize: '0.7rem', fontWeight: 900, color: pct > 0 ? '#34a853' : '#7d7d82' }}>
                                ({pct}%)
                              </span>
                            </div>
                            <div style={{ width: '100%', height: '6px', background: '#f3f3f6', borderRadius: '3px', overflow: 'hidden', marginTop: '6px' }}>
                              <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg, #34a853, #34a853)', transition: 'width 0.3s ease' }} />
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
                      background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', color: 'white', fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer',
                      boxShadow: '0 4px 10px rgba(99, 102, 241, 0.2)',
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
                        e.currentTarget.style.borderColor = '#34a853';
                        e.currentTarget.style.boxShadow = '0 0 0 3px rgba(19, 115, 51, 0.15)';
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
                          background: '#34a853',
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
                        setHasChanges(true);
                      }}
                      style={{
                        width: '100%', height: '70px', padding: '12px 14px', borderRadius: '16px',
                        border: '1px solid #cbd5e1', fontSize: '0.8rem', fontWeight: 600, outline: 'none', resize: 'none', background: 'white'
                      }}
                    />
                  </div>
)}

                  <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveSubView('hub');
                        setActiveLehrwerkId(null);
                        setActivePageNumber(null);
                      }}
                      style={{
                        flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid #34a853',
                        background: 'white', color: '#34a853', fontWeight: 800, fontSize: '0.78rem', cursor: 'pointer'
                      }}
                    >
                      Zurück
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      style={{
                        flex: 2, padding: '12px', borderRadius: '12px', border: 'none',
                        background: '#34a853', color: 'white', fontWeight: 800, fontSize: '0.78rem', cursor: 'pointer'
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
                            background: '#34a853',
                            color: 'white',
                            fontWeight: 800,
                            fontSize: '0.82rem',
                            cursor: 'pointer',
                            boxShadow: '0 4px 10px rgba(19, 115, 51, 0.2)',
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
                                                  label={parts[3] || `Play-Along #${index + 1}`}
                                                  onDelete={() => handleDeleteNote(item.idx)}
                                                />
                                              </div>
                                            );
                                          })}
                                        </div>
                                      )}

                                      {/* Text Notes stacked vertically */}
                                      {textNotes.length > 0 && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                          {textNotes.map((item) => {
                                            const isLoop = item.note.startsWith("LOOP:");
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
                                onClick={handleAddNote}
                                disabled={saving || !homeworkNotes.trim()}
                                style={{
                                  background: homeworkNotes.trim() ? '#34a853' : '#cbd5e1',
                                  color: homeworkNotes.trim() ? 'white' : '#94a3b8',
                                  border: 'none',
                                  padding: '5px 10px',
                                  borderRadius: '8px',
                                  fontSize: '0.68rem',
                                  fontWeight: 800,
                                  cursor: homeworkNotes.trim() ? 'pointer' : 'not-allowed',
                                  boxShadow: homeworkNotes.trim() ? '0 2px 6px rgba(19, 115, 51, 0.15)' : 'none',
                                  transition: 'all 0.15s'
                                }}
                                className="hover-scale save-note-btn"
                              >
                                {saving ? 'Speichert...' : 'Bemerkung speichern'}
                              </button>
                            )}
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
                            setHomeworkNotes(e.target.value);
                            setHasChanges(true);
                          }}
                          onFocus={readOnly ? undefined : () => setIsNotesFocused(true)}
                          onBlur={readOnly ? undefined : () => {
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
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '0.68rem', fontWeight: 850, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                                ⚡ Schnellbaukasten Presets:
                              </span>
                              <span style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: 700 }}>
                                Wische für mehr ➔
                              </span>
                            </div>

                            <div style={{ position: 'relative', width: '100%', marginBottom: '4px' }}>
                              <div 
                                style={{ 
                                  display: 'flex', 
                                  gap: '8px', 
                                  overflowX: 'auto', 
                                  padding: '4px 2px 8px 2px', 
                                  scrollbarWidth: 'thin',
                                  WebkitOverflowScrolling: 'touch',
                                }}
                                className="presets-scrollbar-container"
                              >
                                {(() => {
                                  const allPresets = [
                                    {
                                      label: '⏱️ Tempo halten',
                                      desc: 'Metronom BPM',
                                      onClick: () => {
                                        const bpm = prompt("Geben Sie die BPM-Zahl ein:", "120");
                                        const bpmText = bpm ? `${bpm} BPM` : "X BPM";
                                        const text = `Achte diese Woche besonders darauf, das Metronom bei ${bpmText} zu halten.`;
                                        setHomeworkNotes(prev => prev ? `${prev}\n\n${text}` : text);
                                        setIsCurrentHomework(true);
                                        setHasChanges(true);
                                      }
                                    },
                                    {
                                      label: '✨ Sauber spielen',
                                      desc: 'Klarer Klang',
                                      onClick: () => {
                                        const text = "Achte auf eine präzise Ausführung und einen sauberen, klaren Klang.";
                                        setHomeworkNotes(prev => prev ? `${prev}\n\n${text}` : text);
                                        setIsCurrentHomework(true);
                                        setHasChanges(true);
                                      }
                                    },
                                    {
                                      label: '🥁 Rhythmus-Metronom',
                                      desc: 'Timing & Takt',
                                      onClick: () => {
                                        const text = "Achte auf ein stabiles Rhythmus-Metronom und spiele genau auf den Schlag.";
                                        setHomeworkNotes(prev => prev ? `${prev}\n\n${text}` : text);
                                        setIsCurrentHomework(true);
                                        setHasChanges(true);
                                      }
                                    },
                                    {
                                      label: '🖖 Fingersatz üben',
                                      desc: 'Fingersatz einhalten',
                                      onClick: () => {
                                        const text = "Achte darauf, den vorgegebenen Fingersatz genau einzuhalten und zu üben.";
                                        setHomeworkNotes(prev => prev ? `${prev}\n\n${text}` : text);
                                        setIsCurrentHomework(true);
                                        setHasChanges(true);
                                      }
                                    },
                                    ...textbausteine
                                      .filter((tb: any) => tb.active)
                                      .map((tpl: any) => ({
                                        label: `📝 ${tpl.label}`,
                                        desc: 'Textbaustein',
                                        onClick: () => {
                                          setHomeworkNotes(prev => prev ? `${prev}\n\n${tpl.text}` : tpl.text);
                                          setHasChanges(true);
                                        }
                                      }))
                                  ];

                                  return allPresets.map((item, idx) => (
                                    <button
                                      key={idx}
                                      type="button"
                                      onClick={item.onClick}
                                      style={{
                                        flexShrink: 0,
                                        background: '#f8fafc',
                                        color: '#1e293b',
                                        border: '1px solid #cbd5e1',
                                        padding: '6px 12px',
                                        borderRadius: '12px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'flex-start',
                                        gap: '1px',
                                        textAlign: 'left',
                                        outline: 'none'
                                      }}
                                      className="preset-chip-card preset-btn"
                                    >
                                      <span style={{ fontWeight: 800, fontSize: '0.70rem', color: '#0f172a', whiteSpace: 'nowrap' }}>
                                        {item.label}
                                      </span>
                                      <span style={{ fontSize: '0.56rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                                        {item.desc}
                                      </span>
                                    </button>
                                  ));
                                })()}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                        {/* Audio Play-Along Cassette Widget */}
                        {isCampusActive && !readOnly && (
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
                            setTeacherNotes(e.target.value);
                            setHasChanges(true);
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

                  <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
                    <button
                      type="submit"
                      disabled={saving}
                      style={{
                        flex: 1, padding: '14px', borderRadius: '14px', border: 'none',
                        background: 'linear-gradient(135deg, #34a853 0%, #34a853 100%)', color: 'white', fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer',
                        boxShadow: '0 4px 10px rgba(19, 115, 51, 0.2)',
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

          {/* SIMULATOR TOGGLE BAR (Compact) */}
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '12px 20px',
            border: '1.5px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
            zIndex: 20
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sliders size={15} color="#64748b" />
              <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#334155' }}>
                Entwickler-Modus (Simulation)
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              {/* Checkbox Toggle */}
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.74rem', fontWeight: 700, color: '#64748b' }}>
                <input
                  type="checkbox"
                  checked={isDevSimulationActive}
                  onChange={(e) => setIsDevSimulationActive(e.target.checked)}
                  style={{ cursor: 'pointer', width: '14px', height: '14px', accentColor: '#34a853' }}
                />
                <span>Klick-Vergabe simulieren</span>
              </label>

              {/* Demo Mode Toggle */}
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.74rem', fontWeight: 700, color: '#64748b' }}>
                <input
                  type="checkbox"
                  checked={isDemoMode}
                  onChange={(e) => setIsDemoMode(e.target.checked)}
                  style={{ cursor: 'pointer', width: '14px', height: '14px', accentColor: '#34a853' }}
                />
                <span>Demo-Limits</span>
              </label>

              {/* Reset Album Button */}
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

          {/* XP-Legende Panel */}
          <div style={{
            background: useNotebookLayout ? '#fefcf6' : 'white',
            border: useNotebookLayout ? '1.5px solid #e5e0d4' : '1px solid #e2e8f0',
            borderRadius: '20px',
            padding: '20px',
            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.02)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            marginBottom: '8px',
            fontFamily: useNotebookLayout ? '"Kalam", "Comic Sans MS", cursive' : 'inherit',
            zIndex: 10
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.2rem' }}>🎮</span>
              <strong style={{ fontSize: '0.88rem', fontWeight: 800, color: '#1e293b' }}>
                Campus-Groovelab XP-Legende (Wie du Punkte sammelst)
              </strong>
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '12px'
            }}>
              <div style={{ background: useNotebookLayout ? '#ffffff' : '#f8fafc', padding: '12px', borderRadius: '14px', border: '1px solid #e2e8f0', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '1.25rem', marginTop: '-2px' }}>⏱️</span>
                <div>
                  <strong style={{ fontSize: '0.76rem', display: 'block', color: '#334155' }}>Übe-Fokus</strong>
                  <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Pro Minute Übezeit erhältst du <strong>1 XP</strong>.</span>
                </div>
              </div>
              <div style={{ background: useNotebookLayout ? '#ffffff' : '#f8fafc', padding: '12px', borderRadius: '14px', border: '1px solid #e2e8f0', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '1.25rem', marginTop: '-2px' }}>🎯</span>
                <div>
                  <strong style={{ fontSize: '0.76rem', display: 'block', color: '#334155' }}>Tägliches Fokus-Ziel</strong>
                  <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Tägliches Fokus-Ziel erreicht = <strong>+10 XP</strong> Bonus.</span>
                </div>
              </div>
              <div style={{ background: useNotebookLayout ? '#ffffff' : '#f8fafc', padding: '12px', borderRadius: '14px', border: '1px solid #e2e8f0', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '1.25rem', marginTop: '-2px' }}>🏆</span>
                <div>
                  <strong style={{ fontSize: '0.76rem', display: 'block', color: '#334155' }}>Song meistern</strong>
                  <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Lied auf 100% oder Stage-Ready = <strong>+50 XP</strong> Bonus.</span>
                </div>
              </div>
            </div>
          </div>

          <style>{`
            .sticker-album-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 20px;
              width: 100%;
            }
            @media (max-width: 1100px) {
              .sticker-album-grid {
                grid-template-columns: repeat(3, 1fr);
              }
            }
            @media (max-width: 800px) {
              .sticker-album-grid {
                grid-template-columns: repeat(2, 1fr);
              }
            }
            @media (max-width: 500px) {
              .sticker-album-grid {
                grid-template-columns: 1fr;
              }
            }
          `}</style>

          <div className="sticker-album-grid">
            {ALL_STICKERS.map(st => {
              const info = collectedStickers[st.id] || { count: 0, details: [] };
              const isCollected = info.count > 0;
              return (
                <div
                  key={st.id}
                  onClick={() => {
                    if (isDevSimulationActive) {
                      awardSticker(st.id, "Simulation");
                    } else {
                      setSelectedPreviewSticker(st);
                    }
                  }}
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
                    overflow: 'hidden',
                    cursor: 'pointer'
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

                  {isCollected && (!st.auto || ['dranbleiber', 'wochen-held', 'streak-koenig', 'streak-kaiser'].includes(st.id)) && info.count > 1 && (
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
                    transition: 'all 0.3s ease',
                    overflow: 'hidden'
                  }}>
                    {isCollected ? (
                      <img 
                        src={`/stickers/${st.id}.png?v=1`} 
                        alt={st.title} 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const parent = e.currentTarget.parentElement;
                          if (parent) {
                            const existingSpan = parent.querySelector('.emoji-fallback');
                            if (!existingSpan) {
                              const span = document.createElement('span');
                              span.className = 'emoji-fallback';
                              span.innerText = st.emoji;
                              parent.appendChild(span);
                            }
                          }
                        }}
                      />
                    ) : (
                      <img 
                        src={`/stickers/${st.id}.png?v=1`} 
                        alt={st.title} 
                        style={{ 
                          width: '100%', 
                          height: '100%', 
                          objectFit: 'cover', 
                          filter: 'grayscale(100%) opacity(0.35) blur(1px)' 
                        }}
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const parent = e.currentTarget.parentElement;
                          if (parent) {
                            const existingSpan = parent.querySelector('.emoji-fallback');
                            if (!existingSpan) {
                              const span = document.createElement('span');
                              span.className = 'emoji-fallback';
                              span.style.fontSize = '2.5rem';
                              span.style.filter = 'grayscale(100%) opacity(0.35)';
                              span.innerText = st.emoji;
                              parent.appendChild(span);
                            }
                          }
                        }}
                      />
                    )}
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

          {/* STICKER PREVIEW & SOCIAL MEDIA SHARE CARD MODAL */}
          {selectedPreviewSticker && (() => {
            const st = selectedPreviewSticker;
            const info = collectedStickers[st.id] || { count: 0, details: [] };
            const isCollected = info.count > 0;
            const displayDate = info.details?.[0]?.date || new Date().toLocaleDateString('de-DE');
            const displayTopic = info.details?.[0]?.topic || 'Herausforderung gemeistert';

            return (
              <div style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(15, 23, 42, 0.9)',
                backdropFilter: 'blur(12px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10000,
                padding: '20px',
                animation: 'fadeIn 0.25s ease-out'
              }} onClick={() => setSelectedPreviewSticker(null)}>
                <div 
                  style={{
                    width: '100%',
                    maxWidth: '460px',
                    background: '#1e293b',
                    borderRadius: '32px',
                    border: '1.5px solid #334155',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                    padding: '32px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '24px',
                    color: 'white',
                    position: 'relative'
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Close button */}
                  <button
                    onClick={() => setSelectedPreviewSticker(null)}
                    style={{
                      position: 'absolute',
                      top: '20px',
                      right: '20px',
                      background: 'rgba(255,255,255,0.06)',
                      border: 'none',
                      borderRadius: '50%',
                      width: '36px',
                      height: '36px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      color: '#94a3b8',
                      transition: 'all 0.15s'
                    }}
                    className="hover-scale"
                  >
                    <X size={18} />
                  </button>

                  <div style={{ textAlign: 'center', marginTop: '10px' }}>
                    <span style={{ fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#34a853' }}>
                      Sticker Details
                    </span>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: 900, margin: '6px 0 0 0', letterSpacing: '-0.5px', color: '#ffffff' }}>
                      {st.title}
                    </h3>
                  </div>

                  {/* Layout Selector Switch */}
                  <div style={{ display: 'flex', background: 'rgba(255,255,255,0.06)', padding: '4px', borderRadius: '12px', gap: '4px', width: '320px', marginTop: '14px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <button
                      type="button"
                      onClick={() => setShareCardLayout('dark')}
                      style={{
                        flex: 1,
                        background: shareCardLayout === 'dark' ? '#34a853' : 'transparent',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '8px',
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.15s'
                      }}
                    >
                      Dunkler Beton
                    </button>
                    <button
                      type="button"
                      onClick={() => setShareCardLayout('light')}
                      style={{
                        flex: 1,
                        background: shareCardLayout === 'light' ? '#34a853' : 'transparent',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '8px',
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.15s'
                      }}
                    >
                      Heller Beton
                    </button>
                  </div>

                  {/* PREVIEW POST CARD (Concrete Glow Poster format - Dark or Light) */}
                  {shareCardLayout === 'dark' ? (
                    <div style={{
                      width: '320px',
                      height: '320px',
                      overflow: 'hidden',
                      borderRadius: '24px',
                      border: '1.5px solid rgba(255,255,255,0.08)',
                      position: 'relative',
                      boxShadow: '0 20px 45px rgba(0,0,0,0.6)',
                      animation: 'scaleIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)'
                    }}>
                      <div style={{
                        width: '1200px',
                        height: '1200px',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        background: '#09090b',
                        transform: 'scale(calc(320 / 1200))',
                        transformOrigin: 'top left',
                        boxSizing: 'border-box'
                      }}>
                        {/* Spotify Wrapped dynamic background color splash */}
                        <div style={{
                          position: 'absolute',
                          top: '-150px',
                          left: '-150px',
                          width: '1500px',
                          height: '900px',
                          background: `linear-gradient(135deg, ${(st.color || '#34a853')}45 0%, transparent 100%)`,
                          transform: 'rotate(-12deg)',
                          pointerEvents: 'none',
                          zIndex: 1
                        }} />

                        {/* Giant slanted background text overlay */}
                        <div style={{
                          position: 'absolute',
                          top: '450px',
                          left: '-100px',
                          fontSize: '130px',
                          fontWeight: 900,
                          color: st.color || '#34a853',
                          opacity: 0.06,
                          transform: 'rotate(-12deg)',
                          whiteSpace: 'nowrap',
                          fontFamily: '"Montserrat", "Arial Black", sans-serif',
                          textTransform: 'uppercase',
                          pointerEvents: 'none',
                          zIndex: 1
                        }}>
                          {st.title}
                        </div>

                        {/* Core Poster Box */}
                        <div style={{
                          position: 'absolute',
                          left: '180px',
                          top: '80px',
                          width: '840px',
                          height: '1040px',
                          background: '#121216',
                          border: `6px solid ${(st.color || '#34a853')}`,
                          boxShadow: `0 8px 32px ${(st.color || '#34a853')}20`,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '65px 40px 40px 40px',
                          zIndex: 2,
                          boxSizing: 'border-box'
                        }}>
                          {/* Upper section to flow naturally without overlapping */}
                          <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            width: '100%'
                          }}>
                            {/* Action Headline Pill */}
                            <span style={{ 
                              fontSize: '28px', 
                              fontWeight: 900, 
                              color: '#ffffff', 
                              background: st.color || '#34a853',
                              padding: '10px 30px',
                              borderRadius: '30px',
                              transform: 'rotate(-2deg) skewX(-6deg)',
                              letterSpacing: '0.06em', 
                              fontFamily: '"Arial Black", sans-serif', 
                              textTransform: 'uppercase', 
                              textAlign: 'center',
                              boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                            }}>
                              GEMEISTERT!
                            </span>

                            {/* Giant Sticker Display */}
                            <div style={{
                              marginTop: '80px',
                              width: '360px',
                              height: '360px',
                              borderRadius: '50%',
                              border: '6px solid #ffffff',
                              boxShadow: `0 0 40px ${(st.color || '#34a853')}60`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              overflow: 'hidden',
                              boxSizing: 'border-box'
                            }}>
                              <img 
                                src={`/stickers/${st.id}.png?v=1`} 
                                alt={st.title} 
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  const parent = e.currentTarget.parentElement;
                                  if (parent) {
                                    const span = document.createElement('span');
                                    span.style.fontSize = '8rem';
                                    span.innerText = st.emoji;
                                    parent.appendChild(span);
                                  }
                                }}
                              />
                            </div>

                            {/* Student Name */}
                            <span style={{ 
                              marginTop: '35px',
                              fontSize: '54px', 
                              fontWeight: 900, 
                              color: '#ffffff', 
                              textAlign: 'center', 
                              letterSpacing: '-0.01em',
                              width: '100%',
                              fontFamily: '"Helvetica Neue", Inter, sans-serif'
                            }}>
                              {displayedStudentName}
                            </span>

                            {/* Student Instrument */}
                            {studentInstrument && (
                              <span style={{ 
                                marginTop: '8px',
                                fontSize: '24px', 
                                fontWeight: 900, 
                                color: '#94a3b8', 
                                letterSpacing: '0.12em', 
                                textTransform: 'uppercase',
                                width: '100%',
                                textAlign: 'center',
                                fontFamily: '"Helvetica Neue", Inter, sans-serif'
                              }}>
                                {studentInstrument}
                              </span>
                            )}

                            {/* Sticker Milestone Title */}
                            <span style={{ 
                              marginTop: studentInstrument ? '12px' : '20px',
                              fontSize: '48px', 
                              fontWeight: 900, 
                              color: st.color || '#34a853', 
                              fontFamily: '"Arial Black", sans-serif', 
                              textTransform: 'uppercase', 
                              textAlign: 'center',
                              transform: 'skewX(-6deg)',
                              width: '100%'
                            }}>
                              {st.title}
                            </span>

                            {/* Challenge Description */}
                            <p style={{ 
                              marginTop: '15px',
                              fontSize: '28px', 
                              color: '#cbd5e1', 
                              fontWeight: 750, 
                              margin: 0, 
                              textAlign: 'center', 
                              padding: '0 40px', 
                              lineHeight: '1.3',
                              width: '100%',
                              boxSizing: 'border-box',
                              fontFamily: '"Helvetica Neue", Inter, sans-serif'
                            }}>
                              {st.desc}
                            </p>
                          </div>

                          {/* Footer Section */}
                          <div style={{
                            width: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '12px'
                          }}>
                            <div style={{
                              background: 'rgba(255, 255, 255, 0.08)',
                              border: '2px solid rgba(255, 255, 255, 0.15)',
                              borderRadius: '24px',
                              padding: '6px 20px',
                              fontSize: '20px',
                              fontWeight: 800,
                              color: '#ffffff',
                              letterSpacing: '0.04em',
                              textTransform: 'uppercase',
                              fontFamily: '"Helvetica Neue", Inter, sans-serif'
                            }}>
                              {schoolName}
                            </div>
                            <span style={{
                              fontSize: '24px',
                              fontWeight: 900,
                              color: st.color || '#34a853',
                              letterSpacing: '0.06em',
                              textTransform: 'lowercase',
                              fontFamily: '"Arial Black", sans-serif'
                            }}>
                              campus-groovelab.de
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{
                      width: '320px',
                      height: '320px',
                      overflow: 'hidden',
                      borderRadius: '24px',
                      border: '1.5px solid rgba(0,0,0,0.06)',
                      position: 'relative',
                      boxShadow: '0 20px 45px rgba(0,0,0,0.12)',
                      animation: 'scaleIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)'
                    }}>
                      <div style={{
                        width: '1200px',
                        height: '1200px',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        background: '#ffffff',
                        transform: 'scale(calc(320 / 1200))',
                        transformOrigin: 'top left',
                        boxSizing: 'border-box'
                      }}>
                        {/* Spotify Wrapped dynamic background color splash (light mode) */}
                        <div style={{
                          position: 'absolute',
                          top: '-150px',
                          left: '-150px',
                          width: '1500px',
                          height: '900px',
                          background: `linear-gradient(135deg, ${(st.color || '#34a853')}25 0%, transparent 100%)`,
                          transform: 'rotate(-12deg)',
                          pointerEvents: 'none',
                          zIndex: 1
                        }} />

                        {/* Giant slanted background text overlay (light mode) */}
                        <div style={{
                          position: 'absolute',
                          top: '450px',
                          left: '-100px',
                          fontSize: '130px',
                          fontWeight: 900,
                          color: st.color || '#34a853',
                          opacity: 0.05,
                          transform: 'rotate(-12deg)',
                          whiteSpace: 'nowrap',
                          fontFamily: '"Montserrat", "Arial Black", sans-serif',
                          textTransform: 'uppercase',
                          pointerEvents: 'none',
                          zIndex: 1
                        }}>
                          {st.title}
                        </div>

                        {/* Core Poster Box (Light) */}
                        <div style={{
                          position: 'absolute',
                          left: '180px',
                          top: '80px',
                          width: '840px',
                          height: '1040px',
                          background: 'rgba(250, 250, 250, 0.85)',
                          border: `6px solid ${(st.color || '#34a853')}bb`,
                          boxShadow: `0 8px 32px ${(st.color || '#34a853')}15`,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '65px 40px 40px 40px',
                          zIndex: 2,
                          boxSizing: 'border-box'
                        }}>
                          {/* Upper section to flow naturally without overlapping */}
                          <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            width: '100%'
                          }}>
                            {/* Action Headline Pill (Light) */}
                            <span style={{ 
                              fontSize: '28px', 
                              fontWeight: 900, 
                              color: '#ffffff', 
                              background: st.color || '#34a853',
                              padding: '10px 30px',
                              borderRadius: '30px',
                              transform: 'rotate(-2deg) skewX(-6deg)',
                              letterSpacing: '0.06em', 
                              fontFamily: '"Arial Black", sans-serif', 
                              textTransform: 'uppercase', 
                              textAlign: 'center',
                              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                            }}>
                              GEMEISTERT!
                            </span>

                            {/* Giant Sticker Display */}
                            <div style={{
                              marginTop: '80px',
                              width: '360px',
                              height: '360px',
                              borderRadius: '50%',
                              border: '6px solid #ffffff',
                              boxShadow: `0 0 40px ${(st.color || '#34a853')}45`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              overflow: 'hidden',
                              boxSizing: 'border-box'
                            }}>
                              <img 
                                src={`/stickers/${st.id}.png?v=1`} 
                                alt={st.title} 
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  const parent = e.currentTarget.parentElement;
                                  if (parent) {
                                    const span = document.createElement('span');
                                    span.style.fontSize = '8rem';
                                    span.innerText = st.emoji;
                                    parent.appendChild(span);
                                  }
                                }}
                              />
                            </div>

                            {/* Student Name */}
                            <span style={{ 
                              marginTop: '35px',
                              fontSize: '54px', 
                              fontWeight: 900, 
                              color: '#0f172a', 
                              textAlign: 'center', 
                              letterSpacing: '-0.01em',
                              width: '100%',
                              fontFamily: '"Helvetica Neue", Inter, sans-serif'
                            }}>
                              {displayedStudentName}
                            </span>

                            {/* Student Instrument */}
                            {studentInstrument && (
                              <span style={{ 
                                marginTop: '8px',
                                fontSize: '24px', 
                                fontWeight: 900, 
                                color: '#64748b', 
                                letterSpacing: '0.12em', 
                                textTransform: 'uppercase',
                                width: '100%',
                                textAlign: 'center',
                                fontFamily: '"Helvetica Neue", Inter, sans-serif'
                              }}>
                                {studentInstrument}
                              </span>
                            )}

                            {/* Sticker Milestone Title */}
                            <span style={{ 
                              marginTop: studentInstrument ? '12px' : '20px',
                              fontSize: '48px', 
                              fontWeight: 900, 
                              color: st.color || '#34a853', 
                              fontFamily: '"Arial Black", sans-serif', 
                              textTransform: 'uppercase', 
                              textAlign: 'center',
                              transform: 'skewX(-6deg)',
                              width: '100%'
                            }}>
                              {st.title}
                            </span>

                            {/* Challenge Description */}
                            <p style={{ 
                              marginTop: '15px',
                              fontSize: '28px', 
                              color: '#475569', 
                              fontWeight: 750, 
                              margin: 0, 
                              textAlign: 'center', 
                              padding: '0 40px', 
                              lineHeight: '1.3',
                              width: '100%',
                              boxSizing: 'border-box',
                              fontFamily: '"Helvetica Neue", Inter, sans-serif'
                            }}>
                              {st.desc}
                            </p>
                          </div>

                          {/* Footer Section */}
                          <div style={{
                            width: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '12px'
                          }}>
                            <div style={{
                              background: 'rgba(0, 0, 0, 0.04)',
                              border: '2px solid rgba(0, 0, 0, 0.08)',
                              borderRadius: '24px',
                              padding: '6px 20px',
                              fontSize: '20px',
                              fontWeight: 800,
                              color: '#1e293b',
                              letterSpacing: '0.04em',
                              textTransform: 'uppercase',
                              fontFamily: '"Helvetica Neue", Inter, sans-serif'
                            }}>
                              {schoolName}
                            </div>
                            <span style={{
                              fontSize: '24px',
                              fontWeight: 900,
                              color: st.color || '#34a853',
                              letterSpacing: '0.06em',
                              textTransform: 'lowercase',
                              fontFamily: '"Arial Black", sans-serif'
                            }}>
                              campus-groovelab.de
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div style={{ width: '100%', textAlign: 'center', background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <p style={{ fontSize: '0.78rem', color: '#cbd5e1', margin: '0 0 4px 0', lineHeight: '1.4', fontWeight: 600 }}>
                      {st.desc}
                    </p>
                    <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 700 }}>
                      {isCollected ? `Freigeschaltet! (Gesammelt: ${info.count}x)` : 'Noch nicht freigeschaltet'}
                    </span>
                  </div>

                  {/* Share button action */}
                  <button
                    type="button"
                    onClick={() => downloadShareCard(st)}
                    style={{
                      width: '100%',
                      background: 'linear-gradient(135deg, #34a853 0%, #34a853 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '16px',
                      padding: '16px',
                      fontSize: '0.86rem',
                      fontWeight: 900,
                      cursor: 'pointer',
                      boxShadow: '0 8px 20px rgba(52, 168, 83, 0.25)',
                      transition: 'all 0.15s'
                    }}
                    className="hover-scale"
                  >
                    Als Share-Card teilen (PNG herunterladen)
                  </button>
                </div>

                <style dangerouslySetInnerHTML={{__html: `
                  @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                  }
                  @keyframes scaleIn {
                    from { transform: scale(0.9); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                  }
                  @keyframes floatSticker {
                    0% { transform: translateY(0px) rotate(0deg); }
                    50% { transform: translateY(-6px) rotate(2deg); }
                    100% { transform: translateY(0px) rotate(0deg); }
                  }
                `}} />
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
      </div>
    );

    // ── Skill-Radar Drawer ──────────────────────────────────────────────
    const skillRadarDrawer = showSkillRadar ? createPortal(
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 999999, background: 'rgba(9,9,11,0.72)', backdropFilter: 'blur(18px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
        onClick={() => setShowSkillRadar(false)}
      >
        <div
          style={{ background: 'white', borderRadius: '28px', width: '100%', maxWidth: '540px', maxHeight: '85vh', overflowY: 'auto', padding: '28px', boxShadow: '0 30px 80px rgba(0,0,0,0.35)', display: 'flex', flexDirection: 'column', gap: '20px' }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#0f172a' }}>Skill-Radar</h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>Häufigste Schwierigkeiten — letzte 12 Bewertungen</p>
            </div>
            <button
              onClick={() => setShowSkillRadar(false)}
              style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <X size={14} color="#475569" />
            </button>
          </div>

          {/* Chart + Legend */}
          {(() => {
            const feedbackEntries = progressItems
              .map(item => {
                try {
                  const notes: string[] = JSON.parse(item.homework_notes || '[]');
                  const fbStr = notes.find(n => n.startsWith('FEEDBACK:'));
                  if (!fbStr) return null;
                  return JSON.parse(fbStr.substring(9));
                } catch { return null; }
              })
              .filter(Boolean)
              .slice(-12);

            if (feedbackEntries.length === 0) {
              return (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '10px' }}>📡</div>
                  <p style={{ fontWeight: 700, fontSize: '0.9rem', margin: '0 0 4px' }}>Noch keine Bewertungen</p>
                  <p style={{ fontSize: '0.75rem', margin: 0 }}>Hier werden deine am häufigsten markierten Schwierigkeiten aus den letzten 12 Unterrichtsstunden visualisiert.</p>
                </div>
              );
            }

            const tagCounts = SKILL_TAGS.map(tag => ({
              ...tag,
              count: feedbackEntries.filter((fb: any) => fb.tags?.includes(tag.key)).length,
              pct: feedbackEntries.filter((fb: any) => fb.tags?.includes(tag.key)).length / feedbackEntries.length,
            }));

            // Calculate custom tags counts in the last 12 entries
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

            // SVG Radar
            const N = SKILL_TAGS.length;
            const cx = 150, cy = 150, r = 110;
            const getPoint = (i: number, scale: number) => ({
              x: cx + scale * r * Math.sin((i * 2 * Math.PI) / N),
              y: cy - scale * r * Math.cos((i * 2 * Math.PI) / N),
            });
            const gridLevels = [0.25, 0.5, 0.75, 1.0];
            const gridPaths = gridLevels.map(lvl =>
              SKILL_TAGS.map((_, i) => getPoint(i, lvl))
                .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
                .join(' ') + ' Z'
            );
            const dataPath = tagCounts
              .map((tag, i) => { const p = getPoint(i, Math.max(tag.pct, 0.02)); return `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`; })
              .join(' ') + ' Z';

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <svg width="300" height="300" viewBox="0 0 300 300" style={{ margin: '0 auto', display: 'block' }}>
                  {gridPaths.map((d, i) => <path key={i} d={d} fill="none" stroke="#e2e8f0" strokeWidth="1" />)}
                  {SKILL_TAGS.map((_, i) => { const pt = getPoint(i, 1); return <line key={i} x1={cx} y1={cy} x2={pt.x} y2={pt.y} stroke="#e2e8f0" strokeWidth="1" />; })}
                  <path d={dataPath} fill="rgba(52,168,83,0.18)" stroke="#34a853" strokeWidth="2.5" strokeLinejoin="round" />
                  {tagCounts.map((tag, i) => { const p = getPoint(i, Math.max(tag.pct, 0.02)); return <circle key={i} cx={p.x} cy={p.y} r={tag.pct > 0 ? 5 : 3} fill={tag.pct > 0 ? '#34a853' : '#e2e8f0'} />; })}
                  {tagCounts.map((tag, i) => {
                    const p = getPoint(i, 1.28);
                    return (
                      <text key={i} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle" fontSize="9.5" fontWeight="700" fill={tag.pct > 0.5 ? '#dc2626' : tag.pct > 0 ? '#ca8a04' : '#94a3b8'}>
                        {tag.icon} {tag.label}
                      </text>
                    );
                  })}
                </svg>

                {/* Tag pills sorted by frequency */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {tagCounts.filter(t => t.count > 0).sort((a, b) => b.count - a.count).map(tag => (
                    <span key={tag.key} style={{
                      background: tag.pct > 0.5 ? '#fef2f2' : '#fefce8',
                      color: tag.pct > 0.5 ? '#dc2626' : '#ca8a04',
                      border: `1px solid ${tag.pct > 0.5 ? '#fecaca' : '#fde68a'}`,
                      padding: '4px 10px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 800
                    }}>
                      {tag.icon} {tag.label} · {tag.count}×
                    </span>
                  ))}
                  {tagCounts.every(t => t.count === 0) && customTagCounts.length === 0 && (
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Keine Schwierigkeiten erfasst</span>
                  )}
                </div>

                {/* Custom tag pills */}
                {customTagCounts.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                    <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Weitere dokumentierte Schwierigkeiten
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

                <p style={{ margin: 0, fontSize: '0.68rem', color: '#94a3b8', textAlign: 'center' }}>
                  Basierend auf {feedbackEntries.length} Bewertung{feedbackEntries.length !== 1 ? 'en' : ''}
                </p>
              </div>
            );
          })()}
        </div>
      </div>,
      document.body
    ) : null;
    // ────────────────────────────────────────────────────────────────────

    // Embed-Modus ohne Fullscreen: normal eingebettet (kein Overlay)
    if (isEmbed && !isFullscreen) {
      return (
        <>
          <div style={{ width: '100%', height: 'calc(100vh - 120px)', minHeight: '600px', fontFamily: '"Inter", sans-serif' }}>
            {content}
          </div>
          {skillRadarDrawer}
        </>
      );
    }

    // Embed-Modus MIT Fullscreen ODER normales Modal → immer als Portal über alles
    return (
      <>
        {createPortal(
          <div
            ref={modalContainerRef}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 99999,
              background: isFullscreen ? 'transparent' : 'rgba(9, 9, 11, 0.65)',
              backdropFilter: isFullscreen ? 'none' : 'blur(20px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: isFullscreen ? '0' : '20px',
              fontFamily: '"Inter", sans-serif',
              overflow: 'hidden',
              transition: 'background 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          >
            {content}
          </div>,
          document.body
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

const InlineAudioPlayer: React.FC<{ url: string; label: string; onDelete?: () => void }> = ({ url, label, onDelete }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

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
  }, [url]);

  return (
    <div style={{
      background: 'linear-gradient(135deg, #2c2a29 0%, #1a1817 100%)',
      borderRadius: '16px',
      padding: '16px',
      width: '320px',
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
          <span>{Math.round(currentTime)}s / {duration || '9'}s</span>
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

const RetroCassettePlayer: React.FC<{ url: string; duration: number; index: number; label?: string; onDelete?: () => void }> = ({ url, duration, index, label, onDelete }) => {
  return (
    <InlineAudioPlayer 
      url={url} 
      label={label || `Play-Along #${index + 1}`} 
      onDelete={onDelete}
    />
  );
};

interface Track {
  id: number;
  url: string | null;
  blob: Blob | null;
  volume: number;
  isMuted: boolean;
  isRecording: boolean;
  isWaiting: boolean;
  isSoloed?: boolean;
}

interface GrooveLoopstationProps {
  student: any;
  homeworkNotesList: string[];
  setHomeworkNotesList: React.Dispatch<React.SetStateAction<string[]>>;
  syncHomeworkNotes: (notesList: string[]) => Promise<void>;
  fetchProgress: () => Promise<void>;
  notifyHomeworkChange: () => void;
  readOnly: boolean;
  setActiveViewMode: (mode: 'document' | 'recordings' | 'loopstation') => void;
  useNotebookLayout: boolean;
}

interface VolumeKnobProps {
  value: number;
  onChange: (val: number) => void;
  disabled?: boolean;
}

const VolumeKnob: React.FC<VolumeKnobProps> = ({ value, onChange, disabled }) => {
  const startYRef = useRef(0);
  const startValRef = useRef(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (disabled) return;
    startYRef.current = e.clientY;
    startValRef.current = value;
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = startYRef.current - moveEvent.clientY;
      const newVal = Math.max(0, Math.min(100, startValRef.current + deltaY * 0.8));
      onChange(newVal);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const rotation = -135 + (value / 100) * 270;

  return (
    <div 
      onMouseDown={handleMouseDown}
      style={{
        width: '32px',
        height: '32px',
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #cbd5e1 0%, #94a3b8 100%)',
        border: '1.5px solid #475569',
        boxShadow: '0 3px 6px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.4)',
        position: 'relative',
        cursor: disabled ? 'not-allowed' : 'ns-resize',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        touchAction: 'none'
      }}
      title="Ziehen zum Einstellen der Lautstärke"
    >
      <div style={{
        position: 'absolute',
        width: '2.5px',
        height: '10px',
        background: '#0f172a',
        borderRadius: '1px',
        top: '4px',
        transform: `rotate(${rotation}deg)`,
        transformOrigin: '50% 12px',
        transition: 'transform 0.05s ease-out'
      }} />
      <div style={{
        width: '18px',
        height: '18px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, #f1f5f9 0%, #cbd5e1 100%)',
        boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)'
      }} />
    </div>
  );
};

const GrooveLoopstation: React.FC<GrooveLoopstationProps> = ({
  student,
  homeworkNotesList,
  setHomeworkNotesList,
  syncHomeworkNotes,
  fetchProgress,
  notifyHomeworkChange,
  readOnly,
  setActiveViewMode,
  useNotebookLayout
}) => {
  const [tracks, setTracks] = useState<Track[]>([
    { id: 1, url: null, blob: null, volume: 80, isMuted: false, isRecording: false, isWaiting: false, isSoloed: false },
    { id: 2, url: null, blob: null, volume: 80, isMuted: false, isRecording: false, isWaiting: false, isSoloed: false },
  ]);

  const pauseBars = 4;
  const [isPlaying, setIsPlaying] = useState(false);
  const [masterLoopDuration, setMasterLoopDuration] = useState<number | null>(null); // in ms
  const [playbackProgress, setPlaybackProgress] = useState(0); // 0 to 100
  const [currentBar, setCurrentBar] = useState<number>(1); // 1, 2, 3, or 4
  const [currentBeat, setCurrentBeat] = useState<number>(1); // 1, 2, 3, or 4
  const [isMetronomeActive, setIsMetronomeActive] = useState(false);
  const [bpm, setBpm] = useState(120);
  const [isExporting, setIsExporting] = useState(false);
  const [countInBeats, setCountInBeats] = useState<number | string | null>(null); // null, 4.4, 1.1 etc.
  const [isAutoSequenceActive, setIsAutoSequenceActive] = useState(false);
  const [autoSequenceStatus, setAutoSequenceStatus] = useState<string>('');
  const [syncOffsetMs, setSyncOffsetMs] = useState<number>(() => {
    const saved = localStorage.getItem('groovelab_sync_offset_ms');
    return saved ? parseInt(saved, 10) : 0;
  });
  useEffect(() => {
    localStorage.setItem('groovelab_sync_offset_ms', syncOffsetMs.toString());
  }, [syncOffsetMs]);

  useEffect(() => {
    if (homeworkNotesList) {
      const latencyEntry = homeworkNotesList.find(note => note.startsWith('LATENCY:'));
      if (latencyEntry) {
        const val = parseInt(latencyEntry.replace('LATENCY:', ''), 10);
        if (!isNaN(val)) {
          setSyncOffsetMs(val);
        }
      }
    }
  }, [homeworkNotesList]);

  const updateLatencyInDb = async (offsetVal: number) => {
    const cleanList = homeworkNotesList.filter(note => !note.startsWith('LATENCY:'));
    const updatedList = [...cleanList, `LATENCY:${offsetVal}`];
    setHomeworkNotesList(updatedList);
    await syncHomeworkNotes(updatedList);
  };

  const [calibrationWaveform, setCalibrationWaveform] = useState<number[] | null>(null);
  const [loopstationMetronomeVolume, setLoopstationMetronomeVolume] = useState<number>(50);
  const [timeSignature, setTimeSignature] = useState<'4/4' | '3/4'>('4/4');
  const [barLength, setBarLength] = useState<1 | 2 | 4 | 8>(4);
  const [metronomeSound, setMetronomeSound] = useState<'wood' | 'cowbell' | 'rimshot' | 'synth'>('wood');
  const timeSignatureRef = useRef(timeSignature);
  const barLengthRef = useRef(barLength);
  const metronomeSoundRef = useRef(metronomeSound);
  useEffect(() => { timeSignatureRef.current = timeSignature; }, [timeSignature]);
  useEffect(() => { barLengthRef.current = barLength; }, [barLength]);
  useEffect(() => { metronomeSoundRef.current = metronomeSound; }, [metronomeSound]);
  const loopstationMetronomeVolumeRef = useRef(loopstationMetronomeVolume);
  useEffect(() => {
    loopstationMetronomeVolumeRef.current = loopstationMetronomeVolume;
  }, [loopstationMetronomeVolume]);
  const [isCalibratingLatency, setIsCalibratingLatency] = useState(false);
  const [calibrationPhaseState, setCalibrationPhaseState] = useState<'idle' | 'ambient' | 'clicks' | 'result'>('idle');
  const [calibrationClickCount, setCalibrationClickCount] = useState<number>(0);
  const [calibrationMicLevel, setCalibrationMicLevel] = useState<number>(0);
  const [calibrationRunIndex, setCalibrationRunIndex] = useState<number>(1);
  const [calibrationRunResults, setCalibrationRunResults] = useState<number[]>([]);
  const [activeBeatPulse, setActiveBeatPulse] = useState<'downbeat' | 'upbeat' | null>(null);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [showCalibrationHelp, setShowCalibrationHelp] = useState(false);
  const [autoLatencyResult, setAutoLatencyResult] = useState<number | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'studio' | 'saved'>('studio');
  const [playingSavedLoopUrl, setPlayingSavedLoopUrl] = useState<string | null>(null);
  const [selectedSavedLoop, setSelectedSavedLoop] = useState<any>(null);
  const savedLoopAudioRef = useRef<HTMLAudioElement | null>(null);
  const savedLoopSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const calibrationStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (activeSubTab === 'saved' && homeworkNotesList) {
      const filtered = homeworkNotesList.filter((note: string) => note.startsWith('LOOP:'));
      if (filtered.length > 0 && !selectedSavedLoop) {
        const parts = filtered[0].replace('LOOP:', '').split('|');
        setSelectedSavedLoop({
          url: parts[0],
          duration: parts[1],
          date: parts[2],
          label: parts[3] || 'Loop-Mix',
          creatorRole: parts[4] || 'student',
          originalStr: filtered[0]
        });
      }
    }
  }, [activeSubTab, homeworkNotesList, selectedSavedLoop]);

  useEffect(() => {
    return () => {
      if (savedLoopAudioRef.current) {
        savedLoopAudioRef.current.pause();
      }
      if (savedLoopSourceRef.current) {
        try { savedLoopSourceRef.current.stop(); } catch (e) {}
        savedLoopSourceRef.current = null;
      }
      if (calibrationStreamRef.current) {
        try {
          calibrationStreamRef.current.getTracks().forEach(track => track.stop());
        } catch (e) {
          console.warn("Failed to stop calibration stream on unmount:", e);
        }
      }
    };
  }, []);

  const handlePlaySavedLoop = async (url: string) => {
    if (playingSavedLoopUrl === url) {
      if (savedLoopSourceRef.current) {
        try { savedLoopSourceRef.current.stop(); } catch (e) {}
        savedLoopSourceRef.current = null;
      }
      setPlayingSavedLoopUrl(null);
      setPlaybackProgress(0);
    } else {
      if (savedLoopSourceRef.current) {
        try { savedLoopSourceRef.current.stop(); } catch (e) {}
        savedLoopSourceRef.current = null;
      }
      setPlayingSavedLoopUrl(url);

      const matched = savedLoops.find(l => l.url === url);
      if (matched) {
        setSelectedSavedLoop(matched);
      }

      try {
        await initAudio();
        const ctx = audioContextRef.current;
        if (!ctx) return;

        // Fetch and decode for gapless Web Audio looping
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.loop = true;

        const gainNode = ctx.createGain();
        gainNode.gain.value = 0.8; // premium clean volume level
        source.connect(gainNode);
        gainNode.connect(ctx.destination);

        const loopStartTime = ctx.currentTime;
        source.start(0);
        savedLoopSourceRef.current = source;

        // Progress animation frame loop synced with audio context timeline
        if (progressIntervalRef.current) {
          cancelAnimationFrame(progressIntervalRef.current);
        }
        const durationSec = audioBuffer.duration;
        const progressSync = () => {
          if (!savedLoopSourceRef.current) return;
          const elapsed = (audioContextRef.current ? audioContextRef.current.currentTime : ctx.currentTime) - loopStartTime;
          const loopElapsed = elapsed % durationSec;
          setPlaybackProgress((loopElapsed / durationSec) * 100);
          progressIntervalRef.current = requestAnimationFrame(progressSync);
        };
        progressIntervalRef.current = requestAnimationFrame(progressSync);

      } catch (err) {
        console.error("Failed to play gapless saved loop:", err);
        setPlayingSavedLoopUrl(null);
        setPlaybackProgress(0);
      }
    }
  };

  const handleDeleteSavedLoop = async (originalStr: string) => {
    const confirmDelete = window.confirm("Möchtest du diesen gespeicherten Loop wirklich löschen?");
    if (!confirmDelete) return;
    
    if (playingSavedLoopUrl) {
      if (savedLoopAudioRef.current) {
        savedLoopAudioRef.current.pause();
      }
      setPlayingSavedLoopUrl(null);
      setPlaybackProgress(0);
    }

    if (selectedSavedLoop?.originalStr === originalStr) {
      setSelectedSavedLoop(null);
    }

    try {
      if (originalStr.startsWith("AUDIO:") || originalStr.startsWith("LOOP:")) {
        const prefixLen = originalStr.startsWith("AUDIO:") ? 6 : 5;
        const parts = originalStr.substring(prefixLen).split('|');
        const audioUrlString = parts[0];
        if (audioUrlString && audioUrlString.startsWith("http")) {
          const marker = '/storage/v1/object/public/campus-assets/';
          const markerIndex = audioUrlString.indexOf(marker);
          if (markerIndex !== -1) {
            const filePath = audioUrlString.substring(markerIndex + marker.length);
            console.log("Deleting loop audio file from storage:", filePath);
            await supabase.storage.from('campus-assets').remove([filePath]);
          }
        }
      }
    } catch (e) {
      console.error("Failed to delete loop file from storage:", e);
    }
    
    const updatedList = homeworkNotesList.filter(note => note !== originalStr);
    setHomeworkNotesList(updatedList);
    await syncHomeworkNotes(updatedList);
    await fetchProgress();
    notifyHomeworkChange();
    alert("Loop-Aufnahme erfolgreich gelöscht!");
  };

  const runAutoLatencyCalibration = async () => {
    // Only block if a measurement is actively running (ambient or clicks phases)
    if (calibrationPhaseState === 'ambient' || calibrationPhaseState === 'clicks') return;
    setIsCalibratingLatency(true);
    setCalibrationPhaseState('ambient');
    setCalibrationClickCount(0);
    setCalibrationMicLevel(0);
    setCalibrationRunIndex(1);
    setCalibrationRunResults([]);
    setCalibrationWaveform(null);
    
    let stream: MediaStream | null = null;
    let ctx: AudioContext | null = null;
    
    try {
      ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });
      calibrationStreamRef.current = stream;
      
      const sourceNode = ctx.createMediaStreamSource(stream);
      
      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(800, ctx.currentTime);
      
      const processor = ctx.createScriptProcessor(2048, 1, 1);
      
      sourceNode.connect(filter);
      filter.connect(processor);
      // Remove filter.connect(ctx.destination) to prevent routing mic input back to speakers
      processor.connect(ctx.destination);
      
      const runResults: number[] = [];
      let finalWaveformCaptured: number[] | null = null;
      
      let calibrationVolume = 0.15; // adaptive playback volume

      const executeProbePass = (freq: number): Promise<void> => {
        return new Promise((resolve) => {
          let observedPeak = 0.01;
          let samplesChecked = 0;
          let hasPlayed = false;
          let playTime = 0;

          const playProbeClick = () => {
            if (!ctx || ctx.state === 'closed') return;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, ctx.currentTime);
            
            gain.gain.setValueAtTime(0.15, ctx.currentTime);
            gain.gain.setValueAtTime(0.15, ctx.currentTime + 0.005);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.015);
            
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            playTime = ctx.currentTime;
            osc.start(playTime);
            osc.stop(playTime + 0.03);
            hasPlayed = true;
            
            // Blink LED during probe click
            setActiveBeatPulse('downbeat');
            setTimeout(() => setActiveBeatPulse(null), 150);
          };

          processor.onaudioprocess = (e) => {
            const inputData = e.inputBuffer.getChannelData(0);
            let peak = 0;
            for (let i = 0; i < inputData.length; i++) {
              const absVal = Math.abs(inputData[i]);
              if (absVal > peak) peak = absVal;
              if (hasPlayed && absVal > observedPeak) {
                observedPeak = absVal;
              }
            }
            setCalibrationMicLevel(Math.min(100, Math.round(peak * 400)));

            if (!hasPlayed) {
              samplesChecked += inputData.length;
              if (samplesChecked > 16384) {
                playProbeClick();
                samplesChecked = 0;
              }
            } else {
              samplesChecked += inputData.length;
              // Wait for 1 second (approx 44100/48000 samples) to decay
              if (samplesChecked > 44100) {
                processor.onaudioprocess = null;
                if (observedPeak > 0.85) {
                  calibrationVolume = 0.05; // Force low gain to prevent feedback
                } else {
                  calibrationVolume = Math.max(0.05, Math.min(1.0, 0.15 / Math.max(0.01, observedPeak)));
                }
                resolve();
              }
            }
          };
        });
      };

      const executePass = (passNum: number, freq: number): Promise<number> => {
        return new Promise((resolve, reject) => {
          setCalibrationRunIndex(passNum);
          setCalibrationPhaseState('ambient');
          setCalibrationClickCount(0);
          
          let ambientNoisePeak = 0.01;
          let samplesChecked = 0;
          let calibrationPhase: 'ambient' | 'waiting' | 'done' = 'ambient';
          
          const measurements: number[] = [];
          let currentClickIndex = 0;
          const totalClicksNeeded = 3;
          let playTime = 0;
          let detectionTime = 0;
          let timeoutId: any;
          
          const cleanupPass = () => {
            clearTimeout(timeoutId);
            processor.onaudioprocess = null;
          };
          
          timeoutId = setTimeout(() => {
            cleanupPass();
            reject(new Error(`Timeout in Durchgang ${passNum}`));
          }, 6000);
          
          const playNextClick = () => {
            if (!ctx || ctx.state === 'closed') return;
            calibrationPhase = 'waiting';
            setCalibrationPhaseState('clicks');
            setCalibrationClickCount(prev => prev + 1);
            
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, ctx.currentTime);
            
            gain.gain.setValueAtTime(calibrationVolume, ctx.currentTime);
            gain.gain.setValueAtTime(calibrationVolume, ctx.currentTime + 0.005);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.015);
            
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            playTime = ctx.currentTime;
            osc.start(playTime);
            osc.stop(playTime + 0.03);
            
            // Blink LED during calibration clicks
            const pulseType = currentClickIndex === 0 ? 'downbeat' : 'upbeat';
            setActiveBeatPulse(pulseType);
            setTimeout(() => setActiveBeatPulse(null), 150);
          };
          
          processor.onaudioprocess = (e) => {
            if (calibrationPhase === 'done') return;
            const inputData = e.inputBuffer.getChannelData(0);
            
            let peak = 0;
            for (let i = 0; i < inputData.length; i++) {
              const absVal = Math.abs(inputData[i]);
              if (absVal > peak) peak = absVal;
            }
            setCalibrationMicLevel(Math.min(100, Math.round(peak * 400)));
            
            if (calibrationPhase === 'ambient') {
              for (let i = 0; i < inputData.length; i++) {
                const absVal = Math.abs(inputData[i]);
                if (absVal > ambientNoisePeak) {
                  ambientNoisePeak = absVal;
                }
              }
              samplesChecked += inputData.length;
              
              if (samplesChecked > 16384) {
                playNextClick();
              }
            } else if (calibrationPhase === 'waiting') {
              const sampleRate = ctx!.sampleRate;
              const clickDurationSec = 0.015;
              const clickSamples = Math.floor(clickDurationSec * sampleRate);
              const refClick = new Float32Array(clickSamples);
              for (let s = 0; s < clickSamples; s++) {
                const t = s / sampleRate;
                const amp = t < 0.002 ? (t / 0.002) : Math.exp(-(t - 0.002) / 0.004);
                refClick[s] = Math.sin(2 * Math.PI * freq * t) * amp;
              }
              
              let maxCorrelation = 0;
              let bestIndex = -1;
              for (let offset = 0; offset <= inputData.length - clickSamples; offset++) {
                let sum = 0;
                for (let j = 0; j < clickSamples; j++) {
                  sum += inputData[offset + j] * refClick[j];
                }
                const absSum = Math.abs(sum);
                if (absSum > maxCorrelation) {
                  maxCorrelation = absSum;
                  bestIndex = offset;
                }
              }
              
              // Dynamic threshold: at least 0.08, or 3.5 times the ambient noise level
              const threshold = Math.max(0.08, ambientNoisePeak * 3.5);
              if (bestIndex !== -1 && maxCorrelation > threshold) {
                detectionTime = ctx!.currentTime + (bestIndex / sampleRate);
                const latencyMs = Math.round((detectionTime - playTime) * 1000);
                
                const estimatedLatency = Math.max(-150, Math.min(350, latencyMs - 15));
                measurements.push(estimatedLatency);
                
                // Capture first transient buffer for visual waveform feedback
                if (passNum === 1 && currentClickIndex === 0) {
                  const startOffset = Math.max(0, bestIndex - 120);
                  const endOffset = Math.min(inputData.length, bestIndex + 280);
                  const rawSlice = Array.from(inputData.slice(startOffset, endOffset));
                  
                  // Apply exponential decay window starting at onset to suppress room reflection/echo tails
                  const decayFactor = 0.991;
                  let currentDecay = 1.0;
                  const processed = rawSlice.map((v, idx) => {
                    if (idx >= 120) {
                      currentDecay *= decayFactor;
                      return v * currentDecay;
                    }
                    return v;
                  });

                  // Normalize waveform so the wave is clearly visible regardless of microphone volume
                  let maxVal = 0.001;
                  for (let i = 0; i < processed.length; i++) {
                    const absVal = Math.abs(processed[i]);
                    if (absVal > maxVal) maxVal = absVal;
                  }
                  finalWaveformCaptured = processed.map(v => v / maxVal);
                }
                
                currentClickIndex++;
                if (currentClickIndex < totalClicksNeeded) {
                  calibrationPhase = 'ambient';
                  samplesChecked = 0;
                  setTimeout(playNextClick, 600);
                } else {
                  calibrationPhase = 'done';
                  cleanupPass();
                  const avgPassLatency = Math.round(measurements.reduce((sum, val) => sum + val, 0) / measurements.length);
                  resolve(avgPassLatency);
                }
              }
            }
          };
        });
      };
      
      await executeProbePass(1500);
      await new Promise(r => setTimeout(r, 600));
      
      const pass1 = await executePass(1, 1500);
      runResults.push(pass1);
      setCalibrationRunResults([...runResults]);
      await new Promise(r => setTimeout(r, 800));
      
      const pass2 = await executePass(2, 2200);
      runResults.push(pass2);
      setCalibrationRunResults([...runResults]);
      await new Promise(r => setTimeout(r, 800));
      
      const pass3 = await executePass(3, 1000);
      runResults.push(pass3);
      setCalibrationRunResults([...runResults]);
      
      if (finalWaveformCaptured) {
        setCalibrationWaveform(finalWaveformCaptured);
      }
      
      // Calculate final offset
      const sorted = [...runResults].sort((a, b) => a - b);
      const median = sorted[1];
      const validRuns = runResults.filter(val => Math.abs(val - median) <= 40);
      const finalAvg = validRuns.length > 0 
        ? Math.round(validRuns.reduce((sum, val) => sum + val, 0) / validRuns.length)
        : median;
      
      setSyncOffsetMs(finalAvg);
      setAutoLatencyResult(finalAvg);
      isManualLatencyAdjustmentRef.current = true;
      setCalibrationPhaseState('result');
      
      try {
        processor.disconnect();
        filter.disconnect();
        sourceNode.disconnect();
      } catch (e) {}
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
      calibrationStreamRef.current = null;
      if (ctx && ctx.state !== 'closed') {
        ctx.close().catch(e => console.warn(e));
      }
      
    } catch (err: any) {
      console.error("Auto latency calibration failed:", err);
      alert(`Fehler bei der Latenz-Kalibrierung: ${err.message || err}`);
      setIsCalibratingLatency(false);
      setCalibrationPhaseState('idle');
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
      calibrationStreamRef.current = null;
      if (ctx && ctx.state !== 'closed') {
        ctx.close().catch(e => console.warn(e));
      }
    }
  };

  const audioContextRef = useRef<AudioContext | null>(null);
  const syncOffsetMsRef = useRef<number>(0);
  const isManualLatencyAdjustmentRef = useRef<boolean>(false);
  useEffect(() => { syncOffsetMsRef.current = syncOffsetMs; }, [syncOffsetMs]);
  const [useHeadphones, setUseHeadphones] = useState(false);
  const useHeadphonesRef = useRef(false);
  const isManualHeadphonesRef = useRef(false);
  useEffect(() => { useHeadphonesRef.current = useHeadphones; }, [useHeadphones]);
  const lastCycleScheduledTimeRef = useRef<number>(0);
  const schedulerTimeoutRef = useRef<any>(null);
  const isPlayingRef = useRef<boolean>(false);
  const masterLoopDurationRef = useRef<number | null>(null);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { masterLoopDurationRef.current = masterLoopDuration; }, [masterLoopDuration]);
  
  const processorNodeRef = useRef<AudioNode | null>(null);

  const [desiredTrackCount, setDesiredTrackCount] = useState(4);
  const maxAllowedTracks = useHeadphones ? desiredTrackCount : Math.min(2, desiredTrackCount);

  useEffect(() => {
    setTracks((prev) => {
      const currentLength = prev.length;
      if (currentLength === maxAllowedTracks) return prev;
      if (currentLength < maxAllowedTracks) {
        const newTracks = [...prev];
        for (let i = currentLength + 1; i <= maxAllowedTracks; i++) {
          newTracks.push({
            id: i,
            url: null,
            blob: null,
            volume: 80,
            isMuted: false,
            isRecording: false,
            isWaiting: false,
            isSoloed: false
          });
        }
        return newTracks;
      } else {
        const newTracks = prev.slice(0, maxAllowedTracks);
        prev.slice(maxAllowedTracks).forEach((t) => {
          if (t.url) URL.revokeObjectURL(t.url);
          delete audioBuffersRef.current[t.id];
          if (activeSourcesRef.current[t.id]) {
            try { activeSourcesRef.current[t.id].stop(); } catch (e) {}
            delete activeSourcesRef.current[t.id];
          }
          delete gainNodesRef.current[t.id];
        });
        return newTracks;
      }
    });
  }, [maxAllowedTracks]);

  useEffect(() => {
    if (!useHeadphones) {
      setDesiredTrackCount((prev) => Math.min(2, prev));
    }
  }, [useHeadphones]);

  const audioBuffersRef = useRef<{ [key: number]: AudioBuffer }>({});
  const activeSourcesRef = useRef<{ [key: number]: AudioBufferSourceNode }>({});
  const gainNodesRef = useRef<{ [key: number]: GainNode }>({});
  const analysersRef = useRef<{ [key: number]: AnalyserNode }>({});
  const highClickTemplateRef = useRef<Float32Array | null>(null);
  const lowClickTemplateRef = useRef<Float32Array | null>(null);
  const masterCompressorRef = useRef<DynamicsCompressorNode | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const mediaRecordersRef = useRef<{ [key: number]: MediaRecorder }>({});
  const recordStartTimesRef = useRef<{ [key: number]: number }>({});
  const progressIntervalRef = useRef<any>(null);
  const startTimeRef = useRef<number>(0);
  const loopTimeoutRef = useRef<any>(null);
  const clickIntervalRef = useRef<any>(null);
  const tapTimesRef = useRef<number[]>([]);
  const sequenceIntervalRef = useRef<any>(null);

  // Web Audio Scheduler Refs
  const nextNoteTimeRef = useRef<number>(0);
  const currentTickRef = useRef<number>(0);
  const lookaheadTimerRef = useRef<any>(null);
  const uiSyncFrameRef = useRef<any>(null);
  const uiEventsQueueRef = useRef<{ time: number, type: string, data?: any }[]>([]);
  const audioEventsQueueRef = useRef<{ time: number, type: string, data?: any }[]>([]);
  const isAutoSequenceActiveRef = useRef<boolean>(false);
  const continuousRecordStartTimeRef = useRef<number>(0);
  const isComponentMountedRef = useRef<boolean>(true);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const tracksRef = useRef<Track[]>([]);
  const sequenceStartTimeRef = useRef<number>(0);

  useEffect(() => {
    tracksRef.current = tracks;
  }, [tracks]);

  const connectTrackNode = (trackId: number, gainNode: GainNode, ctx: AudioContext) => {
    let analyser = analysersRef.current[trackId];
    if (!analyser) {
      analyser = ctx.createAnalyser();
      analyser.fftSize = 32;
      analysersRef.current[trackId] = analyser;
    }
    try { gainNode.disconnect(); } catch (e) {}
    gainNode.connect(analyser);
    try { analyser.disconnect(); } catch (e) {}
    analyser.connect(masterGainRef.current || ctx.destination);
  };

  // Dynamic Real-Time Ducking based on Track Age to prevent feedback build-up
  useEffect(() => {
    const activeTrack = tracks.find(t => t.isRecording || t.isWaiting);
    const activeTrackId = activeTrack ? activeTrack.id : null;
    const ctx = audioContextRef.current;
    
    tracks.forEach((t) => {
      const gainNode = gainNodesRef.current[t.id];
      if (gainNode) {
        const hasAnySolo = tracks.some(x => x.isSoloed);
        const isActive = (hasAnySolo ? t.isSoloed : !t.isMuted);
        const baseVolume = isActive ? (t.volume / 100) : 0;
        
        let multiplier = 1.0;
        if (activeTrackId !== null && t.id < activeTrackId) {
          const age = activeTrackId - t.id;
          if (useHeadphones) {
            multiplier = 1.0; // No ducking for headphones!
          } else {
            multiplier = Math.max(0.05, 1.0 - 0.55 * age); // Aggressive ducking for speakers
          }
        }
        
        const targetVolume = baseVolume * multiplier;
        
        if (ctx && ctx.state !== 'suspended') {
          try {
            gainNode.gain.linearRampToValueAtTime(targetVolume, ctx.currentTime + 0.05);
          } catch (e) {
            gainNode.gain.setValueAtTime(targetVolume, ctx.currentTime);
          }
        } else {
          gainNode.gain.setValueAtTime(targetVolume, 0);
        }
      }
    });
  }, [tracks, useHeadphones]);

  useEffect(() => {
    if (processorNodeRef.current) {
      try {
        (processorNodeRef.current as any).port?.postMessage({ type: 'SET_HEADPHONES', value: useHeadphones });
      } catch (e) {}
    }
  }, [useHeadphones]);

  useEffect(() => {
    handleReset();
  }, [student?.id]);

  const detectHeadphones = async (stream?: MediaStream) => {
    if (isManualHeadphonesRef.current) return;
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      let isBluetooth = false;
      let hasExternalAudio = devices.some((device) => {
        const label = device.label.toLowerCase();
        const match = (device.kind === 'audiooutput' || device.kind === 'audioinput') &&
          (label.includes('headphone') ||
            label.includes('kopfhörer') ||
            label.includes('earphone') ||
            label.includes('airpods') ||
            label.includes('bluetooth') ||
            label.includes('extern') ||
            label.includes('lineout') ||
            label.includes('headset'));
        if (match && (label.includes('bluetooth') || label.includes('airpods') || label.includes('wireless') || label.includes('beats') || label.includes('freebuds'))) {
          isBluetooth = true;
        }
        return match;
      });

      if (!hasExternalAudio && stream) {
        stream.getAudioTracks().forEach((track) => {
          const trackLabel = track.label.toLowerCase();
          const match = trackLabel.includes('headphone') ||
            trackLabel.includes('kopfhörer') ||
            trackLabel.includes('earphone') ||
            trackLabel.includes('airpods') ||
            trackLabel.includes('bluetooth') ||
            trackLabel.includes('extern') ||
            trackLabel.includes('headset');
          if (match && (trackLabel.includes('bluetooth') || trackLabel.includes('airpods') || trackLabel.includes('wireless') || trackLabel.includes('beats') || trackLabel.includes('freebuds'))) {
            isBluetooth = true;
          }
          if (match) hasExternalAudio = true;
        });
      }

      if (hasExternalAudio) {
        setUseHeadphones(true);
        if (!isManualLatencyAdjustmentRef.current && !isAutoSequenceActiveRef.current) {
          const ctx = audioContextRef.current;
          const hasNativeLatency = !!(ctx && ctx.outputLatency && ctx.outputLatency > 0.05);
          const outLatency = hasNativeLatency
            ? ctx.outputLatency!
            : (isBluetooth ? 0.220 : 0.010);
          const estimatedRoundtrip = outLatency + 0.015; // 15ms input latency
          const defaultOffsetMs = hasNativeLatency
            ? 0
            : Math.round((estimatedRoundtrip - 0.025) * 1000);
          setSyncOffsetMs(defaultOffsetMs);
        }
      } else {
        setUseHeadphones(false);
        if (!isManualLatencyAdjustmentRef.current && !isAutoSequenceActiveRef.current) {
          const ctx = audioContextRef.current;
          const hasNativeLatency = !!(ctx && ctx.outputLatency && ctx.outputLatency > 0.05);
          const outLatency = hasNativeLatency
            ? ctx.outputLatency!
            : 0.020;
          const estimatedRoundtrip = outLatency + 0.015; // 15ms input latency
          const defaultOffsetMs = hasNativeLatency
            ? 0
            : Math.round((estimatedRoundtrip - 0.025) * 1000);
          setSyncOffsetMs(defaultOffsetMs);
        }
      }
    } catch (e) {
      console.warn("Headphone detection failed:", e);
    }
  };

  useEffect(() => {
    detectHeadphones();
    if (navigator.mediaDevices) {
      const handleDeviceChange = () => detectHeadphones();
      navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
      return () => {
        navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
      };
    }
  }, []);

  const initAudio = async () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioContextRef.current;
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    if (ctx && !isManualLatencyAdjustmentRef.current && !isAutoSequenceActiveRef.current) {
      const isBluetooth = syncOffsetMs === 210;
      const hasExternalAudio = useHeadphones;
      const hasNativeLatency = !!(ctx.outputLatency && ctx.outputLatency > 0.05);
      const outLatency = hasNativeLatency
        ? ctx.outputLatency
        : (isBluetooth ? 0.220 : (hasExternalAudio ? 0.010 : 0.020));
      const estimatedRoundtrip = outLatency + 0.015; // 15ms input latency
      const defaultOffsetMs = hasNativeLatency
        ? 0
        : Math.round((estimatedRoundtrip - 0.025) * 1000);
      setSyncOffsetMs(defaultOffsetMs);
    }

    // Create master dynamics compressor (limiter) to prevent clipping distortion
    if (!masterCompressorRef.current) {
      const compressor = ctx.createDynamicsCompressor();
      // Set typical limiter settings to act as a safety barrier against clipping
      compressor.threshold.setValueAtTime(-1.0, ctx.currentTime); // start limiting just below 0dBFS
      compressor.knee.setValueAtTime(0, ctx.currentTime);         // hard knee
      compressor.ratio.setValueAtTime(20.0, ctx.currentTime);     // high ratio acting as a limiter
      compressor.attack.setValueAtTime(0.003, ctx.currentTime);   // fast attack (3ms)
      compressor.release.setValueAtTime(0.1, ctx.currentTime);    // release (100ms)
      
      masterCompressorRef.current = compressor;
    }
    
    // Create master gain to tame the overall volume slightly (since recordings sum up)
    if (!masterGainRef.current) {
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.8, ctx.currentTime); // Reduce master mix slightly to prevent hot levels
      
      masterGainRef.current = masterGain;
      
      // Connect: Track GainNodes -> MasterGain -> DynamicsCompressor -> Destination
      masterGainRef.current.connect(masterCompressorRef.current);
      masterCompressorRef.current.connect(ctx.destination);
    }
  };

  // Synthesize clean metronome click sounds (wood, cowbell, rimshot, synth) with premium organic modeling and loudness matching
  const playClickSound = (isHigh = false, time?: number, overrideSound?: string) => {
    try {
      initAudio();
      const ctx = audioContextRef.current;
      if (!ctx) return;
      const playTime = time !== undefined ? time : ctx.currentTime;
      const soundType = overrideSound || metronomeSoundRef.current || 'wood';
      
      const hasTrack1 = !!tracksRef.current[0]?.url;
      const baseMetronomeGain = (loopstationMetronomeVolumeRef.current / 100) * 0.10;
      // If previewing (time is undefined), ignore track 1 muting logic and play at full volume
      const targetMetronomeGain = (time === undefined) 
        ? 0.15 
        : ((hasTrack1 && !useHeadphonesRef.current) ? 0 : baseMetronomeGain);

      if (targetMetronomeGain === 0) return;

      if (soundType === 'synth') {
        // Soft synth beep with 1.5ms attack to prevent clicking, clean decay
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(isHigh ? 1000 : 800, playTime);
        
        // Loudness match multiplier: 0.65
        const volume = targetMetronomeGain * 0.65;
        gainNode.gain.setValueAtTime(0, playTime);
        gainNode.gain.linearRampToValueAtTime(volume, playTime + 0.0015);
        gainNode.gain.exponentialRampToValueAtTime(0.00001, playTime + 0.035);
        
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        osc.start(playTime);
        osc.stop(playTime + 0.045);
      } else if (soundType === 'rimshot') {
        // Organic rimshot/sidestick: resonant body sine wave mixed with bandpassed high-Q white noise click
        const bodyOsc = ctx.createOscillator();
        const bodyGain = ctx.createGain();
        bodyOsc.type = 'sine';
        bodyOsc.frequency.setValueAtTime(isHigh ? 380 : 310, playTime);
        
        const stickOsc = ctx.createOscillator();
        const stickGain = ctx.createGain();
        stickOsc.type = 'sine';
        stickOsc.frequency.setValueAtTime(isHigh ? 1500 : 1200, playTime);
        stickOsc.frequency.exponentialRampToValueAtTime(isHigh ? 500 : 400, playTime + 0.004);

        // Loudness match multipliers: body=0.35, stick=0.45
        bodyGain.gain.setValueAtTime(targetMetronomeGain * 0.35, playTime);
        bodyGain.gain.exponentialRampToValueAtTime(0.00001, playTime + 0.015);
        
        stickGain.gain.setValueAtTime(targetMetronomeGain * 0.45, playTime);
        stickGain.gain.exponentialRampToValueAtTime(0.00001, playTime + 0.008);

        bodyOsc.connect(bodyGain);
        bodyGain.connect(ctx.destination);
        stickOsc.connect(stickGain);
        stickGain.connect(ctx.destination);

        bodyOsc.start(playTime);
        bodyOsc.stop(playTime + 0.02);
        stickOsc.start(playTime);
        stickOsc.stop(playTime + 0.015);

        // Transient noise burst
        const bufferSize = ctx.sampleRate * 0.008; // 8ms
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * 0.15;
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.setValueAtTime(2200, playTime);
        bp.Q.setValueAtTime(5.0, playTime);
        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(targetMetronomeGain * 0.3, playTime);
        noiseGain.gain.exponentialRampToValueAtTime(0.00001, playTime + 0.006);
        noise.connect(bp);
        bp.connect(noiseGain);
        noiseGain.connect(ctx.destination);
        noise.start(playTime);
        noise.stop(playTime + 0.01);
      } else if (soundType === 'cowbell') {
        // High-end dual oscillator TR-808 style cowbell with bandpass filter & balanced amplitude
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gainNode = ctx.createGain();
        osc1.type = 'square';
        osc2.type = 'square';
        const f = isHigh ? 840 : 540;
        osc1.frequency.setValueAtTime(f, playTime);
        osc2.frequency.setValueAtTime(f * 1.48, playTime);
        
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.setValueAtTime(950, playTime);
        bp.Q.setValueAtTime(6.0, playTime);
        
        // Loudness match multiplier: 0.24 (square wave normalization)
        gainNode.gain.setValueAtTime(targetMetronomeGain * 0.24, playTime);
        gainNode.gain.exponentialRampToValueAtTime(0.00001, playTime + 0.065);
        
        osc1.connect(bp);
        osc2.connect(bp);
        bp.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        osc1.start(playTime);
        osc2.start(playTime);
        osc1.stop(playTime + 0.08);
        osc2.stop(playTime + 0.08);
      } else {
        // Wood click: fast pitch chirp (sticks hitting) for organic modeling, fast decay
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        osc.type = 'sine';
        
        const startFreq = isHigh ? 1600 : 1200;
        const endFreq = isHigh ? 900 : 700;
        osc.frequency.setValueAtTime(startFreq, playTime);
        osc.frequency.exponentialRampToValueAtTime(endFreq, playTime + 0.003);
        
        // Loudness match multiplier: 0.9
        gainNode.gain.setValueAtTime(targetMetronomeGain * 0.9, playTime);
        gainNode.gain.exponentialRampToValueAtTime(0.00001, playTime + 0.012);
        
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        osc.start(playTime);
        osc.stop(playTime + 0.015);
      }
    } catch (e) {
      console.warn(e);
    }
  };

  // Metronome Click Loop
  useEffect(() => {
    if (clickIntervalRef.current) clearInterval(clickIntervalRef.current);

    if (isMetronomeActive && isPlaying && !isAutoSequenceActive) {
      const intervalMs = (60 / bpm) * 1000;
      let beatCount = 0;
      clickIntervalRef.current = setInterval(() => {
        playClickSound(beatCount % 4 === 0);
        beatCount++;
      }, intervalMs);
    }

    return () => {
      if (clickIntervalRef.current) clearInterval(clickIntervalRef.current);
    };
  }, [isMetronomeActive, isPlaying, bpm, isAutoSequenceActive]);

  // Tap Tempo handler
  const handleTapTempo = () => {
    const now = Date.now();
    tapTimesRef.current = [...tapTimesRef.current, now].slice(-4);
    if (tapTimesRef.current.length >= 2) {
      const diffs = [];
      for (let i = 1; i < tapTimesRef.current.length; i++) {
        diffs.push(tapTimesRef.current[i] - tapTimesRef.current[i - 1]);
      }
      const avgDiff = diffs.reduce((sum, d) => sum + d, 0) / diffs.length;
      const calculatedBpm = Math.round(60000 / avgDiff);
      if (calculatedBpm >= 40 && calculatedBpm <= 240) {
        setBpm(calculatedBpm);
      }
    }
    // Audio feedback for tapping
    playClickSound(true);
  };

  const alignAudioBuffer = (
    decoded: AudioBuffer, 
    tStart: number, 
    t1Start: number, 
    beatSecs: number, 
    trackDurationMs: number,
    earlyStartBeats: number = 0.25
  ) => {
    const ctx = audioContextRef.current;
    if (!ctx) return decoded;
    
    const sampleRate = decoded.sampleRate;
    const loopSamples = Math.round((trackDurationMs / 1000) * sampleRate);
    
    // Create new buffer of exact loop length
    const aligned = ctx.createBuffer(decoded.numberOfChannels, loopSamples, sampleRate);
    
    // Professional DAW Latency Compensation
    // outputLatency is dynamic. inputLatency is typical mic/ADC capture latency (approx. 20-30ms).
    // Plus a small 10ms margin for MediaRecorder packetization/encoding overhead.
    const outputLatency = ctx.outputLatency || 0.025;
    const inputLatency = 0.025;
    const packetizationLatency = 0.010;
    const totalLatencySec = outputLatency + inputLatency + packetizationLatency;
    
    const earlyStartSamples = Math.round(earlyStartBeats * beatSecs * sampleRate);
    const latencySamples = Math.round(totalLatencySec * sampleRate);
    
    // Discard both early-start warmup and the hardware roundtrip latency
    const srcStart = Math.min(earlyStartSamples + latencySamples, decoded.length);
    
    for (let channel = 0; channel < decoded.numberOfChannels; channel++) {
      const srcData = decoded.getChannelData(channel);
      const dstData = aligned.getChannelData(channel);
      
      const copyLength = Math.min(srcData.length - srcStart, loopSamples);
      if (copyLength > 0) {
        dstData.set(srcData.subarray(srcStart, srcStart + copyLength), 0);
      }
    }
    return aligned;
  };

  const startAutoSequence = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert("Audio-Aufnahme wird von Ihrem Browser oder in diesem Sicherheitskontext nicht unterstützt.");
      return;
    }
    handleReset();
    setIsAutoSequenceActive(true);
    isAutoSequenceActiveRef.current = true;
    setAutoSequenceStatus('WARTE AUF MIKROFON...');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });
      mediaStreamRef.current = stream;
      await detectHeadphones(stream);
      
      setAutoSequenceStatus('BEAT-EINZÄHLER...');
      await initAudio();
      const beatMs = (60 / bpm) * 1000;
      const barMs = beatMs * 4;
      const trackDurationMs = barMs * 4; // Exactly 4 bars per track (16 beats)
      setMasterLoopDuration(trackDurationMs);
      masterLoopDurationRef.current = trackDurationMs;

      // === DAW Continuous PCM Recording (Web Audio Worklet) ===
      const ctx = audioContextRef.current!;
      const sourceNode = ctx.createMediaStreamSource(stream);
      
      const workletCode = `
        class RecorderProcessor extends AudioWorkletProcessor {
          constructor() { 
            super(); 
            this.isActive = true; 
          }
          process(inputs, outputs) {
            if (!this.isActive) return true;
            const input = inputs[0];
            if (input && input.length > 0 && input[0]) {
              this.port.postMessage({ data: input[0], time: currentTime });
            }
            // Explicitly zero out outputs to prevent whistling/feedback noise
            const output = outputs[0];
            if (output) {
              for (let channel = 0; channel < output.length; channel++) {
                output[channel].fill(0);
              }
            }
            return true;
          }
        }
        registerProcessor('recorder-worklet', RecorderProcessor);
      `;
      const blob = new Blob([workletCode], { type: 'application/javascript' });
      const workletUrl = URL.createObjectURL(blob);
      
      let processorNode: AudioNode;
      try {
        await ctx.audioWorklet.addModule(workletUrl);
        const workletNode = new AudioWorkletNode(ctx, 'recorder-worklet');
        workletNode.port.postMessage({ type: 'SET_HEADPHONES', value: useHeadphonesRef.current });
        processorNode = workletNode;
        processorNodeRef.current = workletNode;
      } catch (e) {
        console.warn("AudioWorklet fallback", e);
        processorNode = ctx.createScriptProcessor(4096, 1, 1);
        processorNodeRef.current = processorNode;
      }
      URL.revokeObjectURL(workletUrl);

      const muteNode = ctx.createGain();
      muteNode.gain.value = 0; // Prevent acoustic feedback!

      const continuousPCMData: Float32Array[] = [];
      let totalSamplesRecorded = 0;
      let isFirstBlock = true;

      if (processorNode instanceof AudioWorkletNode) {
        processorNode.port.onmessage = (e) => {
          if (!isAutoSequenceActiveRef.current) return;
          if (isFirstBlock) {
            continuousRecordStartTimeRef.current = e.data.time;
            isFirstBlock = false;
          }
          const inputData = e.data.data;
          continuousPCMData.push(new Float32Array(inputData));
          totalSamplesRecorded += inputData.length;
        };
      } else {
        (processorNode as ScriptProcessorNode).onaudioprocess = (e) => {
          if (!isAutoSequenceActiveRef.current) return;
          if (isFirstBlock) {
            const bufferDuration = e.inputBuffer.length / e.inputBuffer.sampleRate;
            continuousRecordStartTimeRef.current = ctx.currentTime - bufferDuration;
            isFirstBlock = false;
          }
          const inputData = e.inputBuffer.getChannelData(0);
          continuousPCMData.push(new Float32Array(inputData));
          totalSamplesRecorded += inputData.length;
          
          // Explicitly zero out ScriptProcessor output to prevent noise/whistling
          const outputData = e.outputBuffer.getChannelData(0);
          outputData.fill(0);
        };
      }

      const getFullPCMBuffer = (): AudioBuffer | null => {
        if (totalSamplesRecorded === 0) return null;
        const fullBuffer = ctx.createBuffer(1, totalSamplesRecorded, ctx.sampleRate);
        const channelData = fullBuffer.getChannelData(0);
        let offset = 0;
        for (const chunk of continuousPCMData) {
          channelData.set(chunk, offset);
          offset += chunk.length;
        }
        return fullBuffer;
      };

      const sliceContinuousBuffer = (
        continuousBuffer: AudioBuffer,
        tStartTicks: number,
        tEndTicks: number,
        beatSecs: number,
        tDurationMs: number
      ) => {
        const sampleRate = continuousBuffer.sampleRate;
        const loopSamples = Math.round((tDurationMs / 1000) * sampleRate);
        const aligned = ctx.createBuffer(1, loopSamples, sampleRate);

        // Calculate Web Audio time offsets
        const trackStartAudioTime = sequenceStartTimeRef.current + tStartTicks * beatSecs;
        
        // Exact hardware DAC/ADC latency compensation
        const outputLatency = ctx.outputLatency || 0.025;
        let inputLatency = 0.025;
        if (syncOffsetMsRef.current !== 0) {
          inputLatency = 0.025 + (syncOffsetMsRef.current / 1000);
        }
        const packetizationLatency = 0.003; 
        const totalLatencySec = outputLatency + inputLatency + packetizationLatency;

        const elapsedStartSec = trackStartAudioTime - continuousRecordStartTimeRef.current;
        const sliceStartSec = elapsedStartSec + totalLatencySec;

        const srcStart = Math.max(0, Math.min(Math.round(sliceStartSec * sampleRate), continuousBuffer.length));
        
        const srcData = continuousBuffer.getChannelData(0);
        const dstData = aligned.getChannelData(0);
        const copyLength = Math.min(srcData.length - srcStart, loopSamples);
        if (copyLength > 0) {
          dstData.set(srcData.subarray(srcStart, srcStart + copyLength), 0);
        }

        // Apply a quick 3ms fade-in and fade-out at loop boundaries to prevent zero-crossing clicks (knacken)
        const fadeSamples = Math.round(0.003 * sampleRate);
        for (let i = 0; i < fadeSamples; i++) {
          if (i < dstData.length) {
            dstData[i] *= (i / fadeSamples);
          }
          const endIdx = dstData.length - 1 - i;
          if (endIdx >= 0) {
            dstData[endIdx] *= (i / fadeSamples);
          }
        }

        return aligned;
      };

      const applyMetronomeGate = (buffer: AudioBuffer, bSecs: number) => {
        // Disabled to avoid transient loss due to ducking
        return;
      };

      const finalizeTrackBuffer = (trackId: number, tStartTicks: number, tEndTicks: number) => {
        const fullBuffer = getFullPCMBuffer();
        if (!fullBuffer) return;
        const beatSecs = 60.0 / bpm;
        const sliced = sliceContinuousBuffer(fullBuffer, tStartTicks, tEndTicks, beatSecs, trackDurationMs);
        if (sliced) {
          if (!useHeadphonesRef.current && trackId === 1) {
            applyMetronomeGate(sliced, beatSecs);
          }
          audioBuffersRef.current[trackId] = sliced;
          // Update track state immediately to unblock UI and scheduler
          setTracks((prev) =>
            prev.map((t) => (t.id === trackId ? { ...t, isWaiting: false } : t))
          );

          setTimeout(() => {
            if (!isComponentMountedRef.current) return;
            try {
              const freshFull = getFullPCMBuffer();
              if (freshFull) {
                const completeSliced = sliceContinuousBuffer(freshFull, tStartTicks, tEndTicks, beatSecs, trackDurationMs);
                if (completeSliced) {
                  if (!useHeadphonesRef.current && trackId === 1) {
                    applyMetronomeGate(completeSliced, beatSecs);
                  }
                  
                  // Store the complete buffer
                  audioBuffersRef.current[trackId] = completeSliced;
                  // Safe swap if currently playing:
                  const currentSource = activeSourcesRef.current[trackId];
                  if (currentSource && isAutoSequenceActiveRef.current) {
                    const playTime = ctx.currentTime;
                    const elapsed = playTime - (sequenceStartTimeRef.current + (tStartTicks + 16) * beatSecs);
                    const trackDurationSec = trackDurationMs / 1000;
                    const playOffset = Math.max(0, elapsed % trackDurationSec);
                    
                    // Create new source with complete buffer
                    const newSource = ctx.createBufferSource();
                    newSource.buffer = completeSliced;
                    newSource.loop = true;
                    
                    const gainNode = ctx.createGain();
                    const trackInfo = tracksRef.current.find(tr => tr.id === trackId);
                    const volume = trackInfo ? trackInfo.volume : 80;
                    const activeTrack = tracksRef.current.find(t => t.isRecording || t.isWaiting);
                    const activeTrackId = activeTrack ? activeTrack.id : null;
                    let multiplier = 1.0;
                    if (activeTrackId !== null && trackId < activeTrackId) {
                      const age = activeTrackId - trackId;
                      if (useHeadphonesRef.current) {
                        multiplier = 1.0;
                      } else {
                        multiplier = Math.max(0.05, 1.0 - 0.55 * age);
                      }
                    }
                    const targetVolume = (volume / 100) * multiplier;
                    gainNode.gain.setValueAtTime(targetVolume, playTime);
                    newSource.connect(gainNode);
                    connectTrackNode(trackId, gainNode, ctx);
                    
                    // Crossfade out old source to prevent clicks (5ms fade)
                    const oldGain = gainNodesRef.current[trackId];
                    if (oldGain) {
                      try {
                        oldGain.gain.setValueAtTime(oldGain.gain.value, playTime);
                        oldGain.gain.exponentialRampToValueAtTime(0.0001, playTime + 0.005);
                        currentSource.stop(playTime + 0.005);
                      } catch (e) {}
                    }
                    
                    // Start new source
                    newSource.start(playTime, playOffset);
                    activeSourcesRef.current[trackId] = newSource;
                    gainNodesRef.current[trackId] = gainNode;
                  }
                  
                  const wavBlob = bufferToWav(completeSliced);
                  const url = URL.createObjectURL(wavBlob);
                  setTracks((prev) =>
                    prev.map((t) => (t.id === trackId ? { ...t, url, blob: wavBlob } : t))
                  );
                }
              }
            } catch (e) {
              console.error("Deferred WAV encoding/buffer swap failed:", e);
            }
          }, 150);
          
          if (trackId === 1) {
            setMasterLoopDuration(trackDurationMs);
            setIsPlaying(true);
            isPlayingRef.current = true;
          }
          const loopStartOffset = sequenceStartTimeRef.current + (tStartTicks + 16) * beatSecs;
          const elapsed = ctx.currentTime - loopStartOffset;
          const trackDurationSec = trackDurationMs / 1000;
          const playOffset = Math.max(0, elapsed % trackDurationSec);
          
          const trackInfo = tracksRef.current.find(tr => tr.id === trackId);
          const hasAnySolo = tracksRef.current.some(tr => tr.isSoloed);
          const isActive = (hasAnySolo ? (trackInfo ? trackInfo.isSoloed : false) : true) && (trackInfo ? !trackInfo.isMuted : true);
          if (isActive && trackId < maxAllowedTracks) {
            const playTime = Math.max(ctx.currentTime, 0);
            if (activeSourcesRef.current[trackId]) {
              try { activeSourcesRef.current[trackId].stop(playTime); } catch (e) {}
            }
            const source = ctx.createBufferSource();
            source.buffer = sliced;
            source.loop = true;
            const gainNode = ctx.createGain();
            const volume = trackInfo ? trackInfo.volume : 80;
            // Age-based Auto-Ducking
            const activeTrack = tracksRef.current.find(t => t.isRecording || t.isWaiting);
            const activeTrackId = activeTrack ? activeTrack.id : null;
            let multiplier = 1.0;
            if (activeTrackId !== null && trackId < activeTrackId) {
              const age = activeTrackId - trackId;
              if (useHeadphonesRef.current) {
                multiplier = 1.0;
              } else {
                multiplier = Math.max(0.05, 1.0 - 0.55 * age);
              }
            }
            const targetVolume = (volume / 100) * multiplier;
            gainNode.gain.setValueAtTime(targetVolume, playTime);
            source.connect(gainNode);
            connectTrackNode(trackId, gainNode, ctx);
            activeSourcesRef.current[trackId] = source;
            gainNodesRef.current[trackId] = gainNode;
            source.start(playTime, playOffset);
          }
          console.log(`DAW Alignment: Track ${trackId} sample-accurately sliced and playback started.`);
        }
      };



      if (useHeadphonesRef.current) {
        sourceNode.connect(processorNode);
      } else {
        const inputHPF = ctx.createBiquadFilter();
        inputHPF.type = 'highpass';
        inputHPF.frequency.setValueAtTime(80, ctx.currentTime);

        const inputLPF = ctx.createBiquadFilter();
        inputLPF.type = 'lowpass';
        inputLPF.frequency.setValueAtTime(8000, ctx.currentTime);

        sourceNode.connect(inputHPF);
        inputHPF.connect(inputLPF);
        inputLPF.connect(processorNode);
      }
      processorNode.connect(muteNode);
      muteNode.connect(ctx.destination);
      // continuousRecordStartTimeRef.current is now set accurately in onaudioprocess

      setIsMetronomeActive(true);

      const highlightTrackRecording = (trackId: number) => {
        setAutoSequenceStatus(`AUFNAHME SPUR ${trackId}...`);
        setTracks((prev) =>
          prev.map((t) => (t.id === trackId ? { ...t, isRecording: true, isWaiting: false } : t))
        );
      };

      const unhighlightTrackRecording = (trackId: number) => {
        setTracks((prev) =>
          prev.map((t) => (t.id === trackId ? { ...t, isRecording: false, isWaiting: true } : t))
        );
        if (trackId < maxAllowedTracks) {
          setAutoSequenceStatus("PAUSE (NÄCHSTE SPUR...)");
        }
      };

      const pauseLen = pauseBars * 4;
      const trackBoundaries: { start: number; end: number }[] = [];
      let nextStartTick = 4;
      for (let i = 0; i < maxAllowedTracks; i++) {
        trackBoundaries.push({
          start: nextStartTick,
          end: nextStartTick + 16
        });
        nextStartTick = nextStartTick + 16 + pauseLen;
      }
      const totalTicks = trackBoundaries[trackBoundaries.length - 1].end;

      // Set sequence start time exactly when tick 0 will execute (at currentTime + 0.6)
      sequenceStartTimeRef.current = audioContextRef.current!.currentTime + 0.6;

      // === WEB AUDIO SCHEDULER ===
      const beatSecs = 60.0 / bpm;
      // Start scheduling 600ms in the future to allow audio hardware warmup during mic activation
      nextNoteTimeRef.current = audioContextRef.current!.currentTime + 0.6; 
      currentTickRef.current = 0;
      uiEventsQueueRef.current = [];
      audioEventsQueueRef.current = [];

      const scheduleNote = (tickIndex: number, time: number) => {
        playClickSound(tickIndex % 4 === 0, time);
        uiEventsQueueRef.current.push({ time, type: 'TICK', data: { tickIndex } });
        audioEventsQueueRef.current.push({ time, type: 'TICK', data: { tickIndex } });
      };

      const playTrackBufferAtTime = (trackId: number, time: number) => {
        const buffer = audioBuffersRef.current[trackId];
        const ctx = audioContextRef.current;
        if (!buffer || !ctx) return;

        if (activeSourcesRef.current[trackId]) {
          try { activeSourcesRef.current[trackId].stop(time); } catch (e) {}
        }

        const source = ctx.createBufferSource();
        source.buffer = buffer;

        const gainNode = ctx.createGain();
        const trackInfo = tracksRef.current.find(t => t.id === trackId);
        const volume = trackInfo ? trackInfo.volume : 80;
        const isMuted = trackInfo ? trackInfo.isMuted : false;
        const isSoloed = trackInfo ? trackInfo.isSoloed : false;

        const hasAnySolo = tracksRef.current.some(t => t.isSoloed);
        const active = hasAnySolo ? isSoloed : !isMuted;
        
        const activeTrack = tracksRef.current.find(tr => tr.isRecording || tr.isWaiting);
        const activeTrackId = activeTrack ? activeTrack.id : null;
        let multiplier = 1.0;
        if (activeTrackId !== null && trackId < activeTrackId) {
          const age = activeTrackId - trackId;
          if (useHeadphonesRef.current) {
            multiplier = Math.max(0.20, 1.0 - 0.30 * age);
          } else {
            multiplier = Math.max(0.05, 1.0 - 0.55 * age);
          }
        }
        const baseVolume = active ? (volume / 100) : 0;
        const targetVolume = baseVolume * multiplier;
        gainNode.gain.setValueAtTime(targetVolume, time);

        source.connect(gainNode);
        connectTrackNode(trackId, gainNode, ctx);

        source.loop = true;
        activeSourcesRef.current[trackId] = source;
        gainNodesRef.current[trackId] = gainNode;

        source.start(time);
      };

      const scheduler = () => {
        if (!audioContextRef.current || !isAutoSequenceActiveRef.current) return;
        
        // Detect if the scheduler has fallen behind the Web Audio clock by more than 150ms (thread lag)
        const lag = audioContextRef.current.currentTime - nextNoteTimeRef.current;
        if (lag > 0.15) {
          console.error("Loopstation timing lag detected:", lag);
          handleReset();
          alert("Audio-Timing-Fehler: Der Browser war kurz überlastet und die Loopstation lief asynchron. Die Aufnahme wurde gestoppt. Bitte starte sie neu.");
          return;
        }

        while (nextNoteTimeRef.current < audioContextRef.current.currentTime + 0.1) {
          const tickIndex = currentTickRef.current;
          if (tickIndex <= totalTicks) {
            scheduleNote(tickIndex, nextNoteTimeRef.current);
            
            // Loop playback start triggers aligned with recording phase starts (no phase shift)
            trackBoundaries.forEach((boundary, index) => {
              if (index > 0 && tickIndex === boundary.start) {
                const playTime = nextNoteTimeRef.current;
                const tracksToPlay = Array.from({ length: index }, (_, k) => k + 1);
                tracksToPlay.forEach((tId) => {
                  if (audioBuffersRef.current[tId]) {
                    const trackInfo = tracksRef.current.find(tr => tr.id === tId);
                    const hasAnySolo = tracksRef.current.some(tr => tr.isSoloed);
                    const isActive = (hasAnySolo ? (trackInfo ? trackInfo.isSoloed : false) : true) && (trackInfo ? !trackInfo.isMuted : true);
                    if (isActive) playTrackBufferAtTime(tId, playTime);
                  }
                });
              }
              if (useHeadphonesRef.current && tickIndex === boundary.end && (index + 1) < maxAllowedTracks) {
                const playTime = nextNoteTimeRef.current;
                const tracksToPlay = Array.from({ length: index + 1 }, (_, k) => k + 1);
                tracksToPlay.forEach((tId) => {
                  if (audioBuffersRef.current[tId]) {
                    const trackInfo = tracksRef.current.find(tr => tr.id === tId);
                    const hasAnySolo = tracksRef.current.some(tr => tr.isSoloed);
                    const isActive = (hasAnySolo ? (trackInfo ? trackInfo.isSoloed : false) : true) && (trackInfo ? !trackInfo.isMuted : true);
                    if (isActive) playTrackBufferAtTime(tId, playTime);
                  }
                });
              }
            });
          }
          nextNoteTimeRef.current += beatSecs;
          currentTickRef.current++;
        }
        lookaheadTimerRef.current = setTimeout(scheduler, 25);
      };

      const syncUI = () => {
        if (!audioContextRef.current || !isAutoSequenceActiveRef.current) return;
        const currentTime = audioContextRef.current.currentTime;


        // 1. Process discrete UI trigger events (highlight tracks & finalize slices exactly on time)
        while (uiEventsQueueRef.current.length > 0 && uiEventsQueueRef.current[0].time <= currentTime) {
          const event = uiEventsQueueRef.current.shift();
          if (!event || event.type !== 'TICK') continue;
          
          const tickIndex = event.data.tickIndex;

          // captureClickTemplate extracts the high/low acoustic signature of the metronome
          const captureClickTemplate = (expectedClickTime: number, isHigh: boolean) => {
            const fullBuffer = getFullPCMBuffer();
            if (!fullBuffer) return;
            const data = fullBuffer.getChannelData(0);
            const sampleRate = fullBuffer.sampleRate;
            const recordStartTime = continuousRecordStartTimeRef.current;
            const expectedClickIndex = Math.floor((expectedClickTime - recordStartTime) * sampleRate);
            
            if (expectedClickIndex < 0 || expectedClickIndex >= data.length) return;
            
            const searchEnd = Math.min(data.length, expectedClickIndex + Math.floor(0.25 * sampleRate));
            let peakIndex = -1;
            let maxVal = 0;
            for (let i = expectedClickIndex; i < searchEnd; i++) {
              const absVal = Math.abs(data[i]);
              if (absVal > maxVal) {
                maxVal = absVal;
                peakIndex = i;
              }
            }
            
            if (peakIndex !== -1 && maxVal > 0.005) {
              const templateLength = Math.floor(0.035 * sampleRate);
              const template = new Float32Array(templateLength);
              for (let j = 0; j < templateLength; j++) {
                if (peakIndex + j < data.length) {
                  template[j] = data[peakIndex + j];
                }
              }
              if (isHigh) {
                highClickTemplateRef.current = template;
                console.log("Captured HIGH click template (1000Hz):", templateLength, "samples");
              } else {
                lowClickTemplateRef.current = template;
                console.log("Captured LOW click template (700Hz):", templateLength, "samples");
              }
              
              // Latency Calibration on LOW click (beat 1 of count-in)
              if (!isHigh && !isManualLatencyAdjustmentRef.current) {
                const peakTime = recordStartTime + (peakIndex / sampleRate);
                const rawLatencySec = peakTime - expectedClickTime;
                if (rawLatencySec > 0 && rawLatencySec < 0.5) {
                   const inputLatency = rawLatencySec - (audioContextRef.current!.outputLatency || 0.025);
                   const finalOffsetMs = Math.round(inputLatency * 1000) - 25;
                   setSyncOffsetMs(finalOffsetMs);
                }
              }
            }
          };

          let matchedBoundaryEvent = false;
          trackBoundaries.forEach((boundary, index) => {
            const trackId = index + 1;
            if (tickIndex === boundary.start) {
              highlightTrackRecording(trackId);
              matchedBoundaryEvent = true;
            } else if (tickIndex === boundary.end) {
              unhighlightTrackRecording(trackId);
              matchedBoundaryEvent = true;
              
              if (trackId === maxAllowedTracks) {
                // End of entire auto-sequence
                clearTimeout(lookaheadTimerRef.current);
                cancelAnimationFrame(uiSyncFrameRef.current);
                setIsAutoSequenceActive(false);
                isAutoSequenceActiveRef.current = false;
                setIsMetronomeActive(false);
                setAutoSequenceStatus('FERTIG!');
                
                finalizeTrackBuffer(trackId, boundary.start, boundary.end);
                
                try { processorNode.disconnect(); } catch (e) {}
                try { sourceNode.disconnect(); } catch (e) {}
                try { muteNode.disconnect(); } catch (e) {}
                if (mediaStreamRef.current) {
                  mediaStreamRef.current.getTracks().forEach(track => track.stop());
                  mediaStreamRef.current = null;
                }
                
                playAll();
              } else {
                setTimeout(() => finalizeTrackBuffer(trackId, boundary.start, boundary.end), 0);
              }
            }
          });

          if (!matchedBoundaryEvent) {
            if (tickIndex === 0) {
              // Count-in beat 0 (HIGH Click)
              setTimeout(() => {
                if (isAutoSequenceActiveRef.current) {
                  captureClickTemplate(sequenceStartTimeRef.current, true);
                }
              }, 150);
            }
            else if (tickIndex === 1) {
              // Count-in beat 1 (LOW Click + Latency Calibration)
              setTimeout(() => {
                if (isAutoSequenceActiveRef.current) {
                  captureClickTemplate(sequenceStartTimeRef.current + beatSecs, false);
                }
              }, 150);
            }
            else if (tickIndex === 3) {
              // Noise check (0.2s to 0.05s BEFORE the first click, tickIndex 3 runs at count-in beat 3)
              setTimeout(() => {
                if (!isAutoSequenceActiveRef.current) return;
                const fullBuffer = getFullPCMBuffer();
                if (!fullBuffer) return;
                const data = fullBuffer.getChannelData(0);
                const sampleRate = fullBuffer.sampleRate;
                const expectedClickTime = sequenceStartTimeRef.current;
                const recordStartTime = continuousRecordStartTimeRef.current;
                const expectedClickIndex = Math.floor((expectedClickTime - recordStartTime) * sampleRate);
                
                if (expectedClickIndex >= 0 && expectedClickIndex < data.length) {
                  const noiseCheckStart = Math.max(0, expectedClickIndex - Math.floor(0.2 * sampleRate));
                  const noiseCheckEnd = Math.max(0, expectedClickIndex - Math.floor(0.05 * sampleRate));
                  let maxNoise = 0;
                  for (let i = noiseCheckStart; i < noiseCheckEnd; i++) {
                    if (Math.abs(data[i]) > maxNoise) maxNoise = Math.abs(data[i]);
                  }
                  
                  if (maxNoise > 0.08) {
                    clearTimeout(lookaheadTimerRef.current);
                    cancelAnimationFrame(uiSyncFrameRef.current);
                    setIsAutoSequenceActive(false);
                    isAutoSequenceActiveRef.current = false;
                    setIsMetronomeActive(false);
                    setAutoSequenceStatus('ABBRUCH: ZU LAUT BEIM EINZÄHLEN');
                    try { processorNode.disconnect(); } catch (e) {}
                    try { sourceNode.disconnect(); } catch (e) {}
                    try { muteNode.disconnect(); } catch (e) {}
                    if (mediaStreamRef.current) mediaStreamRef.current.getTracks().forEach(t => t.stop());
                    alert("Warnung: Es war zu laut beim Einzählen! Bitte spiele erst NACH dem 4. Klick, damit wir die Aufnahme-Latenz kalibrieren können.");
                    return;
                  }
                }
              }, 150);
            }
          }
        }

        // 2. Continuous smooth progress ring & text UI updates
        const elapsedSecs = currentTime - sequenceStartTimeRef.current;
        const currentTick = elapsedSecs / beatSecs;

        if (currentTick < 4) {
          // Count-in (4 beats count up: TAKT 1/4 to 4/4)
          const beatInBar = Math.max(1, Math.floor(currentTick) + 1);
          setCountInBeats(beatInBar + "/4");
          setPlaybackProgress(Math.max(0, (currentTick / 4) * 100));
          setCurrentBar(1);
          setCurrentBeat(beatInBar);
        } else {
          setCountInBeats(null);
          
          let currentBoundaryIndex = -1;
          let isInPauseIndex = -1;
          
          for (let i = 0; i < trackBoundaries.length; i++) {
            const boundary = trackBoundaries[i];
            if (currentTick >= boundary.start && currentTick < boundary.end) {
              currentBoundaryIndex = i;
              break;
            }
            if (i < trackBoundaries.length - 1) {
              const nextBoundary = trackBoundaries[i + 1];
              if (currentTick >= boundary.end && currentTick < nextBoundary.start) {
                isInPauseIndex = i;
                break;
              }
            }
          }
          
          const beatsPerBar = timeSignatureRef.current === '3/4' ? 3 : 4;
          if (currentBoundaryIndex !== -1) {
            const boundary = trackBoundaries[currentBoundaryIndex];
            const elapsed = currentTick - boundary.start;
            setPlaybackProgress((elapsed / 16) * 100);
            setCurrentBar(Math.floor(elapsed / beatsPerBar) + 1);
            setCurrentBeat(Math.floor(elapsed) % beatsPerBar + 1);
            setAutoSequenceStatus(`AUFNAHME SPUR ${currentBoundaryIndex + 1}...`);
          } else if (isInPauseIndex !== -1) {
            const boundary = trackBoundaries[isInPauseIndex];
            const nextBoundary = trackBoundaries[isInPauseIndex + 1];
            const elapsed = currentTick - boundary.end;
            const pauseLengthTicks = nextBoundary.start - boundary.end;
            setPlaybackProgress((elapsed / pauseLengthTicks) * 100);
            setCurrentBar(Math.floor(elapsed / beatsPerBar) + 1);
            setCurrentBeat(Math.floor(elapsed) % beatsPerBar + 1);
            setAutoSequenceStatus("ZWISCHENPAUSE...");
          }
        }
        
        uiSyncFrameRef.current = requestAnimationFrame(syncUI);
      };

      // Start the loops
      scheduler();
      syncUI();

    } catch (err) {
      console.error(err);
      alert('Mikrofonfehler.');
      setIsAutoSequenceActive(false);
    }
  };

  const handlePlayToggle = () => {
    initAudio();
    if (isPlaying) {
      stopAll();
    } else {
      playAll();
    }
  };

  const playTrackBuffer = (trackId: number, offset = 0, loop = false, startTime = 0) => {
    const buffer = audioBuffersRef.current[trackId];
    const ctx = audioContextRef.current;
    if (!buffer || !ctx) return;

    if (activeSourcesRef.current[trackId]) {
      try {
        if (startTime > 0) {
          activeSourcesRef.current[trackId].stop(startTime);
        } else {
          activeSourcesRef.current[trackId].stop();
        }
      } catch (e) {}
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    if (loop) {
      source.loop = true;
    }

    let gainNode = gainNodesRef.current[trackId];
    if (!gainNode) {
      gainNode = ctx.createGain();
      connectTrackNode(trackId, gainNode, ctx);
      gainNodesRef.current[trackId] = gainNode;
    }

    const trackInfo = tracks.find(t => t.id === trackId);
    const hasAnySolo = tracks.some(t => t.isSoloed);
    const vol = trackInfo ? trackInfo.volume / 100 : 0.8;
    const isActive = (hasAnySolo ? (trackInfo ? trackInfo.isSoloed : false) : true) && (trackInfo ? !trackInfo.isMuted : true);
    const activeTrack = tracks.find(tr => tr.isRecording || tr.isWaiting);
    const activeTrackId = activeTrack ? activeTrack.id : null;
    let multiplier = 1.0;
    if (activeTrackId !== null && trackId < activeTrackId) {
      const age = activeTrackId - trackId;
      if (useHeadphonesRef.current) {
        multiplier = Math.max(0.20, 1.0 - 0.30 * age);
      } else {
        multiplier = Math.max(0.05, 1.0 - 0.55 * age);
      }
    }
const targetVol = isActive ? vol : 0;
    const finalVol = targetVol * multiplier;
    gainNode.gain.setValueAtTime(finalVol, ctx.currentTime);

    source.connect(gainNode);
    const startAt = startTime > 0 ? startTime : ctx.currentTime;
    source.start(startAt, offset);
    activeSourcesRef.current[trackId] = source;
  };

  const startProgressLoop = (customStartTime?: number) => {
    if (progressIntervalRef.current) {
      cancelAnimationFrame(progressIntervalRef.current);
    }
    const duration = masterLoopDurationRef.current || masterLoopDuration;
    if (duration) {
      startTimeRef.current = customStartTime || Date.now();
      const loopProgressSync = () => {
        const elapsed = (Date.now() - startTimeRef.current) % duration;
        setPlaybackProgress((elapsed / duration) * 100);
        
        const totalBars = barLengthRef.current || barLength;
        const beatsPerBar = timeSignatureRef.current === '3/4' ? 3 : 4;
        const totalBeats = totalBars * beatsPerBar;
        const currentTotalBeat = Math.floor((elapsed / duration) * totalBeats);
        
        const bar = Math.max(1, Math.min(totalBars, Math.floor(currentTotalBeat / beatsPerBar) + 1));
        const beat = Math.max(1, Math.min(beatsPerBar, (currentTotalBeat % beatsPerBar) + 1));
        
        setCurrentBar(bar);
        setCurrentBeat(beat);
        progressIntervalRef.current = requestAnimationFrame(loopProgressSync);
      };
      progressIntervalRef.current = requestAnimationFrame(loopProgressSync);
    }
  };

  const playAll = () => {
    setIsPlaying(true);
    isPlayingRef.current = true;
    startTimeRef.current = Date.now();

    const ctx = audioContextRef.current;
    if (!ctx) return;
    
    const playTime = ctx.currentTime + 0.05; // 50ms lookahead for absolute synchronization
    lastCycleScheduledTimeRef.current = playTime;

    tracksRef.current.forEach((track) => {
      const hasAudio = !!audioBuffersRef.current[track.id];
      if (hasAudio && !track.isMuted) {
        playTrackBuffer(track.id, 0, true, playTime);
      }
    });

    startProgressLoop(Date.now() + 50);
  };

  const stopAll = () => {
    setIsPlaying(false);
    isPlayingRef.current = false;
    setPlaybackProgress(0);
    isAutoSequenceActiveRef.current = false;
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      cancelAnimationFrame(progressIntervalRef.current);
    }
    if (loopTimeoutRef.current) clearTimeout(loopTimeoutRef.current);
    if (schedulerTimeoutRef.current) {
      clearTimeout(schedulerTimeoutRef.current);
      schedulerTimeoutRef.current = null;
    }
    if (sequenceIntervalRef.current) {
      clearInterval(sequenceIntervalRef.current);
      sequenceIntervalRef.current = null;
    }
    if (lookaheadTimerRef.current) {
      clearTimeout(lookaheadTimerRef.current);
      lookaheadTimerRef.current = null;
    }
    if (uiSyncFrameRef.current) {
      cancelAnimationFrame(uiSyncFrameRef.current);
      uiSyncFrameRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    tracks.forEach((track) => {
      if (activeSourcesRef.current[track.id]) {
        try {
          activeSourcesRef.current[track.id].stop();
        } catch (e) {}
        delete activeSourcesRef.current[track.id];
      }
    });
    if (savedLoopSourceRef.current) {
      try { savedLoopSourceRef.current.stop(); } catch (e) {}
      savedLoopSourceRef.current = null;
    }
  };

  const handleReset = () => {
    isAutoSequenceActiveRef.current = false;
    setIsAutoSequenceActive(false);
    stopAll();
    if (savedLoopSourceRef.current) {
      try { savedLoopSourceRef.current.stop(); } catch (e) {}
      savedLoopSourceRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    Object.values(mediaRecordersRef.current).forEach((rec: any) => {
      if (rec && rec.state !== 'inactive') rec.stop();
    });

    tracks.forEach((t) => {
      if (t.url) URL.revokeObjectURL(t.url);
    });

    const resetTracks: Track[] = [];
    for (let i = 1; i <= maxAllowedTracks; i++) {
      resetTracks.push({
        id: i,
        url: null,
        blob: null,
        volume: 80,
        isMuted: false,
        isRecording: false,
        isWaiting: false,
        isSoloed: false
      });
    }
    setTracks(resetTracks);
    setMasterLoopDuration(null);
    audioBuffersRef.current = {};
    activeSourcesRef.current = {};
    gainNodesRef.current = {};
    Object.values(analysersRef.current).forEach((a) => {
      try { a.disconnect(); } catch (e) {}
    });
    analysersRef.current = {};
    mediaRecordersRef.current = {};
    recordStartTimesRef.current = {};
    setCountInBeats(null);
  };

  const startRecording = async (trackId: number) => {
    // Force one-time latency calibration before first recording
    if (!localStorage.getItem('groovelab_latency_calibrated')) {
      setIsCalibratingLatency(true);
      setCalibrationPhaseState('idle');
      return;
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert("Audio-Aufnahme wird von Ihrem Browser oder in diesem Sicherheitskontext nicht unterstützt.");
      return;
    }
    
    // Clear existing recording data immediately to allow clean override in next loop cycle
    delete audioBuffersRef.current[trackId];
    setTracks((prev) =>
      prev.map((t) => (t.id === trackId ? { ...t, url: null, blob: null } : t))
    );
    
    initAudio();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });
      mediaStreamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (e: any) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        if (mediaStreamRef.current === stream) mediaStreamRef.current = null;
        
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);

        // Decode array buffer
        try {
          const arrayBuffer = await blob.arrayBuffer();
          if (audioContextRef.current) {
            const decoded = await audioContextRef.current.decodeAudioData(arrayBuffer);
            const normalized = normalizeAudioBuffer(decoded, 0.95);
            audioBuffersRef.current[trackId] = normalized;
          }
        } catch (decodeErr) {
          console.error("Decoding error:", decodeErr);
        }

        setTracks((prev) =>
          prev.map((t) => (t.id === trackId ? { ...t, url, blob, isRecording: false, isWaiting: false } : t))
        );

        if (trackId === 1) {
          const duration = Date.now() - recordStartTimesRef.current[1];
          setMasterLoopDuration(duration);
          setIsPlaying(true);
          isPlayingRef.current = true;
          startTimeRef.current = Date.now();
          
          const ctx = audioContextRef.current;
          if (ctx) {
            const playTime = ctx.currentTime + 0.05;
            lastCycleScheduledTimeRef.current = playTime;
            playTrackBuffer(1, 0, false, playTime);

            const loopProgressSync = () => {
               const elapsed = (Date.now() - startTimeRef.current) % duration;
               setPlaybackProgress((elapsed / duration) * 100);
               progressIntervalRef.current = requestAnimationFrame(loopProgressSync);
            };
            progressIntervalRef.current = requestAnimationFrame(loopProgressSync);

            if (schedulerTimeoutRef.current) clearTimeout(schedulerTimeoutRef.current);
            const runScheduler = () => {
              if (!isPlayingRef.current) return;
              const lookAhead = 0.200;
              const loopDurationSec = duration / 1000;
              while (lastCycleScheduledTimeRef.current < ctx.currentTime + lookAhead) {
                const nextTime = lastCycleScheduledTimeRef.current + loopDurationSec;
                tracksRef.current.forEach((track) => {
                  const hasAudio = !!audioBuffersRef.current[track.id];
                  if (hasAudio && !track.isMuted) {
                    playTrackBuffer(track.id, 0, false, nextTime);
                  }
                });
                lastCycleScheduledTimeRef.current = nextTime;
              }
              schedulerTimeoutRef.current = setTimeout(runScheduler, 50);
            };
            runScheduler();
          }
        } else {
          const ctx = audioContextRef.current;
          if (ctx && isPlayingRef.current && masterLoopDuration) {
            const loopDurationSec = masterLoopDuration / 1000;
            const elapsedSecs = (Date.now() - startTimeRef.current) / 1000;
            const offset = elapsedSecs % loopDurationSec;
            // Play newly recorded track immediately, aligned to the current playhead phase
            playTrackBuffer(trackId, offset, false, ctx.currentTime);
          }
        }
      };

      mediaRecordersRef.current[trackId] = mediaRecorder;

      if (trackId === 1) {
        // Count-in logic (Exactly 4 beats = 1 bar)
        const intervalMs = (60 / bpm) * 1000;
        setCountInBeats(4);
        let count = 4;
        
        setIsMetronomeActive(true);

        const countTimer = setInterval(() => {
          count--;
          if (count > 0) {
            setCountInBeats(count);
          } else {
            clearInterval(countTimer);
            setCountInBeats(null);
            // Start recording
            recordStartTimesRef.current[1] = Date.now();
            mediaRecorder.start();
            setTracks((prev) =>
              prev.map((t) => (t.id === 1 ? { ...t, isRecording: true } : t))
            );
          }
        }, intervalMs);
      } else {
        setTracks((prev) =>
          prev.map((t) => (t.id === trackId ? { ...t, isWaiting: true } : t))
        );

        const msToNextCycle = masterLoopDuration
          ? masterLoopDuration - ((Date.now() - startTimeRef.current) % masterLoopDuration)
          : 0;

        setTimeout(() => {
          recordStartTimesRef.current[trackId] = Date.now();
          mediaRecorder.start();
          setTracks((prev) =>
            prev.map((t) => (t.id === trackId ? { ...t, isRecording: true, isWaiting: false } : t))
          );

          setTimeout(() => {
            if (mediaRecorder.state !== 'inactive') {
              mediaRecorder.stop();
            }
          }, masterLoopDuration || 5000);

        }, msToNextCycle);
      }
    } catch (err) {
      console.error('Mic error:', err);
      alert('Mikrofonzugriff verweigert.');
    }
  };

  const stopRecording = (trackId: number) => {
    const recorder = mediaRecordersRef.current[trackId];
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
    }
  };

  const handleVolumeChange = (trackId: number, vol: number) => {
    setTracks((prev) =>
      prev.map((t) => (t.id === trackId ? { ...t, volume: vol } : t))
    );
    const gainNode = gainNodesRef.current[trackId];
    if (gainNode && audioContextRef.current) {
      const isMuted = tracks.find(t => t.id === trackId)?.isMuted;
      gainNode.gain.setValueAtTime(isMuted ? 0 : vol / 100, audioContextRef.current.currentTime);
    }
  };

  const handleMuteToggle = (trackId: number) => {
    setTracks((prev) => {
      const nextTracks = prev.map((t) => (t.id === trackId ? { ...t, isMuted: !t.isMuted } : t));
      const hasAnySolo = nextTracks.some((t) => t.isSoloed);
      
      nextTracks.forEach((t) => {
        const gainNode = gainNodesRef.current[t.id];
        if (gainNode && audioContextRef.current) {
          const vol = t.volume / 100;
          const isActive = (hasAnySolo ? t.isSoloed : true) && !t.isMuted;
          gainNode.gain.setValueAtTime(isActive ? vol : 0, audioContextRef.current.currentTime);
        }
      });
      return nextTracks;
    });
  };

  const handleSoloToggle = (trackId: number) => {
    setTracks((prev) => {
      const nextTracks = prev.map((t) => (t.id === trackId ? { ...t, isSoloed: !t.isSoloed } : t));
      const hasAnySolo = nextTracks.some((t) => t.isSoloed);
      
      nextTracks.forEach((t) => {
        const gainNode = gainNodesRef.current[t.id];
        if (gainNode && audioContextRef.current) {
          const vol = t.volume / 100;
          const isActive = (hasAnySolo ? t.isSoloed : true) && !t.isMuted;
          gainNode.gain.setValueAtTime(isActive ? vol : 0, audioContextRef.current.currentTime);
        }
      });
      return nextTracks;
    });
  };

  const handleDeleteTrack = (trackId: number) => {
    if (tracksRef.current[trackId - 1]?.url) {
      const confirmDelete = window.confirm("Möchtest du diese Aufnahme wirklich löschen?");
      if (!confirmDelete) return;
    }
    if (activeSourcesRef.current[trackId]) {
      try { activeSourcesRef.current[trackId].stop(); } catch(e) {}
      delete activeSourcesRef.current[trackId];
    }
    delete audioBuffersRef.current[trackId];
    delete gainNodesRef.current[trackId];

    if (tracksRef.current[trackId - 1]?.url) {
      URL.revokeObjectURL(tracksRef.current[trackId - 1].url!);
    }

    setTracks((prev) =>
      prev.map((t) => (t.id === trackId ? { ...t, url: null, blob: null, isRecording: false, isWaiting: false, isSoloed: false } : t))
    );

    if (trackId === 1) {
      stopAll();
      setMasterLoopDuration(null);
    }
  };

  // Mixdown Master Export to Homework
  const bufferToWav = (buffer: AudioBuffer) => {
    const numOfChan = buffer.numberOfChannels;
    const length = buffer.length * numOfChan * 2 + 44;
    const bufferArr = new ArrayBuffer(length);
    const view = new DataView(bufferArr);
    const channels: Float32Array[] = [];
    let pos = 0;

    const setUint16 = (data: number) => {
      view.setUint16(pos, data, true);
      pos += 2;
    };

    const setUint32 = (data: number) => {
      view.setUint32(pos, data, true);
      pos += 4;
    };

    // write WAV header
    setUint32(0x46464952);                         // "RIFF"
    setUint32(length - 8);                         // file length - 8
    setUint32(0x45564157);                         // "WAVE"
    
    setUint32(0x20746d66);                         // "fmt " chunk
    setUint32(16);                                 // chunk length
    setUint16(1);                                  // sample format (raw PCM)
    setUint16(numOfChan);
    setUint32(buffer.sampleRate);
    setUint32(buffer.sampleRate * 2 * numOfChan); // byte rate
    setUint16(numOfChan * 2);                      // block align
    setUint16(16);                                 // bits per sample
    
    setUint32(0x61746164);                         // "data" - chunk
    setUint32(length - pos - 4);                   // chunk length

    for (let i = 0; i < numOfChan; i++) {
      channels.push(buffer.getChannelData(i));
    }
    
    let offset = 0;
    while (pos < length) {
      for (let i = 0; i < numOfChan; i++) {
        let sample = Math.max(-1, Math.min(1, channels[i][offset]));
        sample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
        view.setInt16(pos, sample, true);
        pos += 2;
      }
      offset++;
    }

    return new Blob([bufferArr], { type: 'audio/wav' });
  };

  const normalizeAudioBuffer = (buffer: AudioBuffer, targetPeak: number = 0.95): AudioBuffer => {
    const numChannels = buffer.numberOfChannels;
    let maxVal = 0;
    
    // Find peak value
    for (let c = 0; c < numChannels; c++) {
      const data = buffer.getChannelData(c);
      for (let i = 0; i < data.length; i++) {
        const val = Math.abs(data[i]);
        if (val > maxVal) {
          maxVal = val;
        }
      }
    }
    
    // Scale if we have a signal and it's not already at target
    if (maxVal > 0 && maxVal < targetPeak) {
      const scaleFactor = targetPeak / maxVal;
      for (let c = 0; c < numChannels; c++) {
        const data = buffer.getChannelData(c);
        for (let i = 0; i < data.length; i++) {
          data[i] *= scaleFactor;
        }
      }
    }
    
    return buffer;
  };

  const bufferToMp3 = (buffer: AudioBuffer) => {
    const channels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const Mp3EncoderClass = lamejs.Mp3Encoder || (lamejs as any).default?.Mp3Encoder || (window as any).lamejs?.Mp3Encoder;
    if (!Mp3EncoderClass) {
      throw new Error("LameJS Mp3Encoder constructor not found.");
    }
    const mp3encoder = new Mp3EncoderClass(channels, sampleRate, 128);
    
    const mp3Data: any[] = [];
    const samples = buffer.getChannelData(0);
    
    const sampleBlockSize = 1152;
    const int16Samples = new Int16Array(samples.length);
    for (let i = 0; i < samples.length; i++) {
      const sample = Math.max(-1, Math.min(1, samples[i]));
      int16Samples[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
    }
    
    if (channels === 2) {
      const samples2 = buffer.getChannelData(1);
      const int16Samples2 = new Int16Array(samples2.length);
      for (let i = 0; i < samples2.length; i++) {
        const sample = Math.max(-1, Math.min(1, samples2[i]));
        int16Samples2[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      }
      for (let i = 0; i < int16Samples.length; i += sampleBlockSize) {
        const chunk1 = int16Samples.subarray(i, i + sampleBlockSize);
        const chunk2 = int16Samples2.subarray(i, i + sampleBlockSize);
        const mp3buf = mp3encoder.encodeBuffer(chunk1, chunk2);
        if (mp3buf.length > 0) mp3Data.push(mp3buf);
      }
    } else {
      for (let i = 0; i < int16Samples.length; i += sampleBlockSize) {
        const chunk = int16Samples.subarray(i, i + sampleBlockSize);
        const mp3buf = mp3encoder.encodeBuffer(chunk);
        if (mp3buf.length > 0) mp3Data.push(mp3buf);
      }
    }
    
    const mp3buf = mp3encoder.flush();
    if (mp3buf.length > 0) mp3Data.push(mp3buf);
    
    return new Blob(mp3Data as unknown as BlobPart[], { type: 'audio/mp3' });
  };

  // Mixdown Master Export to Homework (Instant & offline rendering)
  const handleExportMix = async () => {
    if (!masterLoopDuration) return;
    const loopNotesCount = homeworkNotesList.filter(note => note.startsWith('LOOP:')).length;
    if (loopNotesCount >= 10) {
      alert("Limit erreicht! Du hast bereits 10 gespeicherte Loops. Bitte lösche im Tab 'Gespeicherte Loops' zuerst einen alten Loop, um Platz für diesen neuen Loop-Mix zu machen.");
      return;
    }
    setIsExporting(true);
    let label = "Mein Loop";
    try {
      const baseName = "Mein Loop";
      let uniqueName = baseName;
      let counter = 2;
      const existingLabels = homeworkNotesList
        .filter(note => note.startsWith('LOOP:'))
        .map(note => {
          const parts = note.replace('LOOP:', '').split('|');
          return (parts[3] || 'Loop-Mix').trim();
        });
      while (existingLabels.includes(uniqueName)) {
        uniqueName = `${baseName}${counter}`;
        counter++;
      }

      const inputLabel = prompt("Gib deinem Loop einen Namen:", uniqueName);
      if (inputLabel === null) {
        setIsExporting(false);
        return; // user cancelled
      }
      
      let finalLabel = inputLabel.trim() || baseName;
      let checkName = finalLabel;
      let finalCounter = 2;
      while (existingLabels.includes(checkName)) {
        checkName = `${finalLabel}${finalCounter}`;
        finalCounter++;
      }
      label = checkName;
      const sanitizedLabel = label.replace(/\|/g, '-');
      
      const offlineCtx = new OfflineAudioContext(
        2,
        Math.round((masterLoopDuration / 1000) * 44100),
        44100
      );
      
      tracksRef.current.forEach((track) => {
        const buffer = audioBuffersRef.current[track.id];
        if (buffer && track.url) {
          const hasAnySolo = tracksRef.current.some(t => t.isSoloed);
          const isActive = (hasAnySolo ? track.isSoloed : true) && !track.isMuted;
          if (!isActive) return;

          const source = offlineCtx.createBufferSource();
          source.buffer = buffer;
          
          const gainNode = offlineCtx.createGain();
          const vol = track.volume / 100;
          gainNode.gain.setValueAtTime(vol, 0);
          
          source.connect(gainNode);
          gainNode.connect(offlineCtx.destination);
          
          source.start(0);
        }
      });
      
      const renderedBuffer = await offlineCtx.startRendering();
      normalizeAudioBuffer(renderedBuffer, 0.95);
      
      // Attempt MP3 conversion, fallback to WAV
      let mixBlob: Blob;
      let contentType = 'audio/mp3';
      let fileExt = 'mp3';
      try {
        mixBlob = bufferToMp3(renderedBuffer);
      } catch (mp3Err) {
        console.warn("MP3 conversion failed, falling back to WAV format:", mp3Err);
        mixBlob = bufferToWav(renderedBuffer);
        contentType = 'audio/wav';
        fileExt = 'wav';
      }
      
      const fileName = `${student.id}_loopmix_${Date.now()}.${fileExt}`;
      const filePath = `avatars/audio_feedback_${fileName}`;
      
      const { error } = await supabase.storage
        .from('campus-assets')
        .upload(filePath, mixBlob, { contentType, cacheControl: 'private, max-age=3600' });
        
      if (error) throw error;
      
      const publicUrl = supabase.storage.from('campus-assets').getPublicUrl(filePath).data.publicUrl;
      const creatorRole = readOnly ? 'student' : 'teacher';
      const audioMetaStr = `LOOP:${publicUrl}|${Math.round(masterLoopDuration / 1000)}|${new Date().toISOString()}|${sanitizedLabel}|${creatorRole}`;
      
      setHomeworkNotesList(prev => [...prev, audioMetaStr]);
      const updatedList = [...homeworkNotesList, audioMetaStr];
      await syncHomeworkNotes(updatedList);
      await fetchProgress();
      notifyHomeworkChange();
      alert("Loop-Mix erfolgreich gespeichert!");
      setActiveSubTab('saved');
    } catch (err: any) {
      console.error("Export mix failed:", err);
      alert(`Cloud-Speicherung im Campus-Groovelab Hausaufgabenheft fehlgeschlagen: ${err.message || err}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadMix = async () => {
    if (!masterLoopDuration) return;
    setIsExporting(true);
    try {
      const baseName = "Mein Loop";
      let uniqueName = baseName;
      let counter = 2;
      const existingLabels = homeworkNotesList
        .filter(note => note.startsWith('LOOP:'))
        .map(note => {
          const parts = note.replace('LOOP:', '').split('|');
          return (parts[3] || 'Loop-Mix').trim();
        });
      while (existingLabels.includes(uniqueName)) {
        uniqueName = `${baseName}${counter}`;
        counter++;
      }

      const inputLabel = prompt("Gib deinem Loop einen Namen für den Download:", uniqueName);
      if (inputLabel === null) {
        setIsExporting(false);
        return; // user cancelled
      }
      
      let finalLabel = inputLabel.trim() || baseName;
      let checkName = finalLabel;
      let finalCounter = 2;
      while (existingLabels.includes(checkName)) {
        checkName = `${finalLabel}${finalCounter}`;
        finalCounter++;
      }
      const sanitizedLabel = checkName.replace(/\|/g, '-');

      const repsPrompt = prompt("Wie oft soll der Loop im exportierten Song hintereinander wiederholt werden?", "4");
      if (repsPrompt === null) {
        setIsExporting(false);
        return; // user cancelled
      }
      const repetitions = Math.max(1, parseInt(repsPrompt, 10) || 4);
      const totalDurationSec = (masterLoopDuration / 1000) * repetitions;
      
      const offlineCtx = new OfflineAudioContext(
        2,
        Math.round(totalDurationSec * 44100),
        44100
      );
      
      tracksRef.current.forEach((track) => {
        const buffer = audioBuffersRef.current[track.id];
        if (buffer && track.url) {
          const hasAnySolo = tracksRef.current.some(t => t.isSoloed);
          const isActive = (hasAnySolo ? track.isSoloed : true) && !track.isMuted;
          if (!isActive) return;

          const source = offlineCtx.createBufferSource();
          source.buffer = buffer;
          source.loop = true;
          
          const gainNode = offlineCtx.createGain();
          const vol = track.volume / 100;
          gainNode.gain.setValueAtTime(vol, 0);
          
          source.connect(gainNode);
          gainNode.connect(offlineCtx.destination);
          
          source.start(0);
        }
      });
      
      const renderedBuffer = await offlineCtx.startRendering();
      normalizeAudioBuffer(renderedBuffer, 0.95);
      
      // Attempt MP3 conversion, fallback to WAV
      let mixBlob: Blob;
      let fileExt = 'mp3';
      try {
        mixBlob = bufferToMp3(renderedBuffer);
      } catch (mp3Err) {
        console.warn("MP3 conversion failed, falling back to WAV format for download:", mp3Err);
        mixBlob = bufferToWav(renderedBuffer);
        fileExt = 'wav';
      }
      
      const downloadUrl = URL.createObjectURL(mixBlob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${sanitizedLabel.toLowerCase().replace(/\s+/g, '_')}_x${repetitions}.${fileExt}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);
      
      alert("Loop-Mix erfolgreich heruntergeladen!");
    } catch (err) {
      console.error(err);
      alert("Herunterladen des Mixdowns fehlgeschlagen.");
    } finally {
      setIsExporting(false);
    }
  };

  useEffect(() => {
    isComponentMountedRef.current = true;
    return () => {
      isComponentMountedRef.current = false;
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        cancelAnimationFrame(progressIntervalRef.current);
      }
      if (loopTimeoutRef.current) clearTimeout(loopTimeoutRef.current);
      if (clickIntervalRef.current) clearInterval(clickIntervalRef.current);
      if (lookaheadTimerRef.current) clearTimeout(lookaheadTimerRef.current);
      if (uiSyncFrameRef.current) cancelAnimationFrame(uiSyncFrameRef.current);
      
      // eslint-disable-next-line react-hooks/exhaustive-deps
      Object.values(activeSourcesRef.current).forEach((source) => {
        try { source.stop(); } catch (e) {}
      });

      // Stop mic stream tracks to turn off recording light
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
      }

      // Close AudioContext
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(e => console.warn(e));
        audioContextRef.current = null;
        masterCompressorRef.current = null;
        masterGainRef.current = null;
        processorNodeRef.current = null;
      }

      // Revoke URLs
      tracksRef.current.forEach((t) => {
        if (t.url) URL.revokeObjectURL(t.url);
      });
    };
  }, []);

  // LED Level Meter Animation
  const [meterHeights, setMeterHeights] = useState<{ [key: number]: number }>({ 1: 0, 2: 0, 3: 0, 4: 0 });

  useEffect(() => {
    let animId: any;
    const updateMeters = () => {
      const hasAnySolo = tracks.some(t => t.isSoloed);
      const newMeters: { [key: number]: number } = {};
      
      tracks.forEach((track) => {
        const hasAudio = !!audioBuffersRef.current[track.id] || !!track.url;
        const isTrackPlaying = (isPlaying || isAutoSequenceActive) && hasAudio && !track.isMuted && (!hasAnySolo || track.isSoloed);
        
        let meterValue = 0;
        const analyser = analysersRef.current[track.id];
        
        if (track.isRecording) {
          meterValue = Math.random() > 0.15 ? Math.floor(Math.random() * 8) + 1 : 1;
        } else if (isTrackPlaying) {
          if (analyser) {
            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            const avg = sum / dataArray.length;
            meterValue = Math.max(0, Math.min(8, Math.round((avg / 160) * 8)));
          }
          
          if (meterValue <= 2) {
            const currentTick = Math.floor((Date.now() % 4000) / 125);
            const stepIntensity = [5, 2, 3, 1, 6, 2, 4, 1][(currentTick + track.id * 2) % 8];
            meterValue = Math.max(meterValue, stepIntensity);
          }
        }
        newMeters[track.id] = meterValue;
      });
      
      setMeterHeights(newMeters);
      animId = setTimeout(updateMeters, 50);
    };
    
    updateMeters();
    return () => clearTimeout(animId);
  }, [isPlaying, isAutoSequenceActive, tracks]);

  const isPause = isAutoSequenceActive && !autoSequenceStatus.includes("AUFNAHME") && !autoSequenceStatus.includes("FERTIG");
  const isAnyTrackRecording = tracks.some(t => t.isRecording);
  const isSavedLoopPlaying = !!playingSavedLoopUrl;
  const ringColor = activeSubTab === 'saved'
    ? (isSavedLoopPlaying ? '#34a853' : '#e5e5e7')
    : (isPause
      ? '#eab308' // Yellow during the intermission pause
      : (isAutoSequenceActive || isAnyTrackRecording)
        ? '#ea4335' // Red during active recording
        : isPlaying 
          ? '#34a853' // Green during playback
          : '#e5e5e7'); // default/ready

  const savedLoops = homeworkNotesList
    .filter(note => note.startsWith('LOOP:'))
    .map(note => {
      const parts = note.replace('LOOP:', '').split('|');
      return {
        url: parts[0],
        duration: parts[1],
        date: parts[2],
        label: parts[3] || 'Loop-Mix',
        creatorRole: parts[4] || 'student',
        originalStr: note
      };
    });

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      flex: 1,
      background: 'linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%)',
      borderTop: '1px solid #e2e8f0',
      borderRadius: useNotebookLayout ? '0 0 24px 24px' : '24px',
      minHeight: '520px',
      color: '#1d1d1f',
      padding: '24px 28px',
      gap: '20px',
      boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.03)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
    }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes pulse-recording-card {
          0% { box-shadow: 0 0 0 0 rgba(234, 67, 53, 0.25); border-color: #ea4335; }
          70% { box-shadow: 0 0 0 8px rgba(234, 67, 53, 0); border-color: rgba(234, 67, 53, 0.4); }
          100% { box-shadow: 0 0 0 0 rgba(234, 67, 53, 0); border-color: #ea4335; }
        }
        .recording-card-pulse {
          animation: pulse-recording-card 2s infinite ease-in-out;
        }
        @keyframes glow-record {
          0% { filter: drop-shadow(0 0 3px rgba(234, 67, 53, 0.3)); }
          50% { filter: drop-shadow(0 0 12px rgba(234, 67, 53, 0.8)); }
          100% { filter: drop-shadow(0 0 3px rgba(234, 67, 53, 0.3)); }
        }
        @keyframes glow-play {
          0% { filter: drop-shadow(0 0 3px rgba(52, 168, 83, 0.25)); }
          50% { filter: drop-shadow(0 0 10px rgba(52, 168, 83, 0.65)); }
          100% { filter: drop-shadow(0 0 3px rgba(52, 168, 83, 0.25)); }
        }
        @keyframes glow-pause {
          0% { filter: drop-shadow(0 0 3px rgba(234, 179, 8, 0.3)); }
          50% { filter: drop-shadow(0 0 12px rgba(234, 179, 8, 0.8)); }
          100% { filter: drop-shadow(0 0 3px rgba(234, 179, 8, 0.3)); }
        }
        .glow-record {
          animation: glow-record 2s infinite ease-in-out;
        }
        .glow-play {
          animation: glow-play 2s infinite ease-in-out;
        }
        .glow-pause {
          animation: glow-pause 2s infinite ease-in-out;
        }
        @keyframes central-pulse-play {
          0% { transform: scale(1); box-shadow: inset 0 1.5px 3px rgba(255,255,255,0.8), 0 8px 24px rgba(0,0,0,0.03); }
          50% { transform: scale(1.04); box-shadow: inset 0 1.5px 3px rgba(255,255,255,0.8), 0 12px 32px rgba(52,168,83,0.25); }
          100% { transform: scale(1); box-shadow: inset 0 1.5px 3px rgba(255,255,255,0.8), 0 8px 24px rgba(0,0,0,0.03); }
        }
        @keyframes central-pulse-rec {
          0% { transform: scale(1); box-shadow: inset 0 1.5px 3px rgba(255,255,255,0.8), 0 8px 24px rgba(0,0,0,0.03); }
          50% { transform: scale(1.04); box-shadow: inset 0 1.5px 3px rgba(255,255,255,0.8), 0 12px 32px rgba(234,67,53,0.35); }
          100% { transform: scale(1); box-shadow: inset 0 1.5px 3px rgba(255,255,255,0.8), 0 8px 24px rgba(0,0,0,0.03); }
        }
        @keyframes central-pulse-pause {
          0% { transform: scale(1); box-shadow: inset 0 1.5px 3px rgba(255,255,255,0.8), 0 8px 24px rgba(0,0,0,0.03); }
          50% { transform: scale(1.04); box-shadow: inset 0 1.5px 3px rgba(255,255,255,0.8), 0 12px 32px rgba(234,179,8,0.35); }
          100% { transform: scale(1); box-shadow: inset 0 1.5px 3px rgba(255,255,255,0.8), 0 8px 24px rgba(0,0,0,0.03); }
        }
        .central-pulse-play {
          animation: central-pulse-play 2s infinite ease-in-out;
        }
        .central-pulse-rec {
          animation: central-pulse-rec 2s infinite ease-in-out;
        }
        .central-pulse-pause {
          animation: central-pulse-pause 2s infinite ease-in-out;
        }
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
        }
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .shimmer-active {
          background: linear-gradient(90deg, #34a853 30%, #a7f3d0 50%, #34a853 70%) !important;
          background-size: 200% 100% !important;
          animation: shimmer 1.5s infinite linear !important;
        }
        .tactile-btn:hover:not(:disabled) {
          transform: translateY(-1.5px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08) !important;
        }
        .tactile-btn:active:not(:disabled) {
          transform: translateY(0.5px);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04) !important;
        }
        .groovelab-fader {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 24px;
          background: transparent;
          outline: none;
          cursor: pointer;
        }
        .groovelab-fader::-webkit-slider-runnable-track {
          width: 100%;
          height: 6px;
          background: linear-gradient(to bottom, #a0aec0 0%, #1a202c 35%, #1a202c 65%, #a0aec0 100%);
          border-radius: 3px;
          box-shadow: inset 0 1.5px 3px rgba(0,0,0,0.4);
        }
        .groovelab-fader::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 26px;
          border-radius: 3px;
          background: linear-gradient(to bottom, #f1f5f9 0%, #ffffff 42%, #0f172a 43%, #0f172a 57%, #ffffff 58%, #cbd5e1 100%);
          border: 1px solid #64748b;
          box-shadow: 0 3px 6px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.3);
          margin-top: -10px;
          transition: transform 0.1s ease;
        }
        .groovelab-fader::-webkit-slider-thumb:hover {
          transform: scale(1.05);
        }
        .groovelab-fader::-moz-range-track {
          width: 100%;
          height: 6px;
          background: linear-gradient(to bottom, #a0aec0 0%, #1a202c 35%, #1a202c 65%, #a0aec0 100%);
          border-radius: 3px;
          box-shadow: inset 0 1.5px 3px rgba(0,0,0,0.4);
        }
        .groovelab-fader::-moz-range-thumb {
          width: 18px;
          height: 26px;
          border-radius: 3px;
          background: linear-gradient(to bottom, #f1f5f9 0%, #ffffff 42%, #0f172a 43%, #0f172a 57%, #ffffff 58%, #cbd5e1 100%);
          border: 1px solid #64748b;
          box-shadow: 0 3px 6px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.3);
          transition: transform 0.1s ease;
        }
        .groovelab-fader::-moz-range-thumb:hover {
          transform: scale(1.05);
        }
        .daw-console-strip {
          transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
        }
        .daw-console-strip:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 28px rgba(0, 0, 0, 0.05) !important;
          border-color: rgba(52, 168, 83, 0.15) !important;
        }
      `}} />

      {/* Segmented Switch Control */}
      <div style={{
        display: 'flex',
        background: '#e5e5ea',
        borderRadius: '10px',
        padding: '2px',
        width: '100%',
        maxWidth: '340px',
        alignSelf: 'center',
        boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.08)'
      }}>
        <button
          type="button"
          onClick={() => {
            if (playingSavedLoopUrl) {
              if (savedLoopAudioRef.current) savedLoopAudioRef.current.pause();
              setPlayingSavedLoopUrl(null);
            }
            setActiveSubTab('studio');
          }}
          className="tactile-btn"
          style={{
            flex: 1,
            background: activeSubTab === 'studio' ? '#ffffff' : 'transparent',
            color: activeSubTab === 'studio' ? '#1d1d1f' : '#86868b',
            border: 'none',
            borderRadius: '8px',
            padding: '8px 16px',
            fontSize: '0.74rem',
            fontWeight: activeSubTab === 'studio' ? 700 : 600,
            cursor: 'pointer',
            boxShadow: activeSubTab === 'studio' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            transition: 'all 0.15s ease'
          }}
        >
          Loopstation Studio
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('saved')}
          className="tactile-btn"
          style={{
            flex: 1,
            background: activeSubTab === 'saved' ? '#ffffff' : 'transparent',
            color: activeSubTab === 'saved' ? '#1d1d1f' : '#86868b',
            border: 'none',
            borderRadius: '8px',
            padding: '8px 16px',
            fontSize: '0.74rem',
            fontWeight: activeSubTab === 'saved' ? 700 : 600,
            cursor: 'pointer',
            boxShadow: activeSubTab === 'saved' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            transition: 'all 0.15s ease'
          }}
        >
          Gespeicherte Loops
        </button>
      </div>

      <div style={{ display: 'flex', gap: '24px', flex: 1, width: '100%' }} className="flex-col lg:flex-row">
      
      {/* Left Column: Loop Progress, Metronom & Controls */}
      <div style={{
        flex: '1 1 0%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        gap: '20px',
        width: '100%',
        maxWidth: '300px'
      }}>
        {/* The iPod Classic Hardware Controller */}
        <div style={{
          width: '300px',
          height: '460px',
          background: 'linear-gradient(135deg, #3c3c3e 0%, #1c1c1e 100%)',
          borderRadius: '38px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 25px 50px rgba(0, 0, 0, 0.35), inset 0 1.5px 0 rgba(255, 255, 255, 0.15), inset 0 -2px 5px rgba(0,0,0,0.5)',
          padding: '20px 16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'relative',
          boxSizing: 'border-box'
        }}>
          {/* Edge Chrome Bezel Glare Effect */}
          <div style={{
            position: 'absolute',
            inset: '1px',
            borderRadius: '37px',
            border: '1px solid rgba(255, 255, 255, 0.04)',
            pointerEvents: 'none'
          }} />

          {/* LCD Display Screen Bezel */}
          <div style={{
            width: '266px',
            height: '180px',
            background: 'linear-gradient(180deg, #18202c 0%, #0d1218 100%)',
            borderRadius: '20px',
            border: '2.5px solid #111112',
            boxShadow: 'inset 0 6px 12px rgba(0, 0, 0, 0.6), 0 1px 0 rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Diagonal LCD Glass Reflection Sheen */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 40%, rgba(255,255,255,0) 41%, rgba(255,255,255,0) 100%)',
              pointerEvents: 'none',
              zIndex: 10
            }} />

            {/* Screen Content */}
            <div style={{
              position: 'relative',
              width: '136px',
              height: '136px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent'
            }}>
              {/* Dynamic latency-compensated visual beat pulse ring */}
              {activeBeatPulse && (
                <div style={{
                  position: 'absolute',
                  top: '-8px',
                  left: '-8px',
                  right: '-8px',
                  bottom: '-8px',
                  borderRadius: '50%',
                  border: activeBeatPulse === 'downbeat' ? '3.5px solid #ea4335' : '2.5px solid #34a853',
                  boxShadow: activeBeatPulse === 'downbeat'
                    ? '0 0 16px #ea4335, inset 0 0 10px #ea4335'
                    : '0 0 12px #34a853, inset 0 0 8px #34a853',
                  opacity: 0.95,
                  pointerEvents: 'none',
                  zIndex: 25,
                  transition: 'all 0.05s ease-out'
                }} />
              )}

              {/* Animated SVG Progress Sweep */}
              <svg 
                viewBox="0 0 200 200"
                className={activeSubTab === 'saved' ? (isSavedLoopPlaying ? 'glow-play' : '') : (isPause ? 'glow-pause' : (isAnyTrackRecording || isAutoSequenceActive) ? 'glow-record' : isPlaying ? 'glow-play' : '')}
                style={{
                  position: 'absolute',
                  width: '100%',
                  height: '100%',
                  transform: 'rotate(-90deg) translate3d(0,0,0)',
                  willChange: 'transform',
                  transition: 'filter 0.3s ease'
                }}
              >
                <circle
                  cx="100"
                  cy="100"
                  r="84"
                  stroke="#222b39"
                  strokeWidth="5"
                  fill="none"
                />
                <circle
                  cx="100"
                  cy="100"
                  r="84"
                  stroke={ringColor}
                  strokeWidth="7"
                  fill="none"
                  strokeDasharray="527.8 527.8"
                  strokeDashoffset={527.8 - (527.8 * playbackProgress) / 100}
                  strokeLinecap="round"
                  style={{
                    transition: (isPlaying || isAutoSequenceActive || isSavedLoopPlaying) ? 'none' : 'stroke-dashoffset 0.2s ease-out',
                    willChange: 'stroke-dashoffset'
                  }}
                />
              </svg>

              {/* Central readout area */}
              <div 
                className={activeSubTab === 'saved' ? (isSavedLoopPlaying ? 'central-pulse-play' : '') : (isPause ? 'central-pulse-pause' : (isAnyTrackRecording || isAutoSequenceActive) ? 'central-pulse-rec' : isPlaying ? 'central-pulse-play' : '')}
                style={{
                  position: 'absolute',
                  width: '106px',
                  height: '106px',
                  borderRadius: '50%',
                  background: activeSubTab === 'saved'
                    ? (isSavedLoopPlaying ? 'radial-gradient(circle, rgba(52,168,83,0.12) 0%, rgba(13,18,24,0.98) 100%)' : 'radial-gradient(circle, rgba(40,48,64,0.9) 0%, rgba(13,18,24,0.98) 100%)')
                    : (isAutoSequenceActive 
                      ? 'radial-gradient(circle, rgba(239,68,68,0.12) 0%, rgba(13,18,24,0.98) 100%)' 
                      : isPlaying 
                        ? 'radial-gradient(circle, rgba(52,168,83,0.12) 0%, rgba(13,18,24,0.98) 100%)' 
                        : 'radial-gradient(circle, rgba(40,48,64,0.9) 0%, rgba(13,18,24,0.98) 100%)'),
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.08)',
                  transition: 'all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)'
                }}
              >
                <span style={{ 
                  fontSize: '1.9rem', 
                  fontWeight: 800, 
                  fontFamily: '"Outfit", "Nunito", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                  letterSpacing: '0.02em', 
                  color: ringColor === '#e5e5e7' ? '#e2e8f0' : ringColor,
                  textShadow: ringColor !== '#e5e5e7' ? `0 2px 10px ${ringColor}35` : 'none',
                  transition: 'all 0.3s ease'
                }}>
                  {activeSubTab === 'saved'
                    ? (isSavedLoopPlaying
                      ? `${Math.floor((playbackProgress / 100) * (selectedSavedLoop ? Number(selectedSavedLoop.duration) : 8))}s`
                      : '0s')
                    : (countInBeats !== null
                      ? `00 | 0${countInBeats.toString().charAt(0)}`
                      : (isPlaying || isAutoSequenceActive)
                        ? `${currentBar.toString().padStart(2, '0')} | ${currentBeat.toString().padStart(2, '0')}`
                        : '01 | 01')}
                </span>
                
                {/* Horizontal Apple-style beat segments */}
                {activeSubTab !== 'saved' && (
                  <div style={{ display: 'flex', gap: '3px', marginTop: '3px', marginBottom: '2px', alignItems: 'center' }}>
                    {[1, 2, 3, 4].map((b) => {
                      const maxBeats = timeSignature === '3/4' ? 3 : 4;
                      if (b > maxBeats) return null;
                      const isActive = (isPlaying || isAutoSequenceActive) && currentBeat === b;
                      return (
                        <div
                          key={b}
                          style={{
                            width: '6px',
                            height: '2px',
                            borderRadius: '1px',
                            background: isActive
                              ? (ringColor === '#e5e5e7' ? '#ef4444' : ringColor)
                              : 'rgba(255, 255, 255, 0.12)',
                            boxShadow: isActive
                              ? `0 0 5px ${ringColor === '#e5e5e7' ? '#ef4444' : ringColor}`
                              : 'none',
                            transition: 'all 0.1s ease'
                          }}
                        />
                      );
                    })}
                  </div>
                )}

                <span style={{ 
                  fontSize: '0.45rem', 
                  color: '#7b8a9e', 
                  fontWeight: 800, 
                  letterSpacing: '0.12em', 
                  marginTop: '1px', 
                  textTransform: 'uppercase' 
                }}>
                  {activeSubTab === 'saved'
                    ? (isSavedLoopPlaying ? 'PLAYBACK' : 'ARCHIVE')
                    : (countInBeats !== null ? (isPause ? 'WAIT' : (isAutoSequenceActive ? 'CALIBRATION' : 'COUNT')) : isPlaying ? 'PLAYBACK' : isAutoSequenceActive ? 'RECORD' : 'OFFLINE')}
                </span>
              </div>
            </div>

            {/* Bottom Screen Label */}
            {activeSubTab === 'studio' && isAutoSequenceActive && (
              <span style={{
                position: 'absolute',
                bottom: '6px',
                fontSize: '0.44rem',
                fontWeight: 800,
                letterSpacing: '0.04em',
                color: isPause ? '#eab308' : '#ef4444',
                textTransform: 'uppercase',
                animation: 'pulse 1s infinite alternate'
              }}>
                {autoSequenceStatus}
              </span>
            )}
            {activeSubTab === 'saved' && selectedSavedLoop && (
              <span style={{
                position: 'absolute',
                bottom: '8px',
                fontSize: '0.52rem',
                fontWeight: 800,
                color: '#e2e8f0',
                width: '90%',
                textAlign: 'center',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                letterSpacing: '0.02em'
              }}>
                {selectedSavedLoop.label}
              </span>
            )}
          </div>

          {/* Click Wheel Controller */}
          <div style={{
            width: '210px',
            height: '210px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #2d2d30 0%, #1e1e20 100%)',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.4), inset 0 1px 1px rgba(255, 255, 255, 0.08), inset 0 -1.5px 3px rgba(0,0,0,0.4)',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            userSelect: 'none'
          }}>
            {/* Top Quadrant: MENU Printed text */}
            <div 
              onClick={() => {
                if (activeSubTab === 'studio') {
                  setShowAdvancedSettings(!showAdvancedSettings);
                }
              }}
              style={{
                position: 'absolute',
                top: '18px',
                fontSize: '0.62rem',
                fontWeight: 900,
                color: activeSubTab === 'saved' ? '#555558' : '#a1a1a6',
                letterSpacing: '0.08em',
                transition: 'color 0.2s ease',
                cursor: activeSubTab === 'saved' ? 'default' : 'pointer'
              }}
              onMouseEnter={(e) => { if (activeSubTab === 'studio') e.currentTarget.style.color = '#ffffff'; }}
              onMouseLeave={(e) => { if (activeSubTab === 'studio') e.currentTarget.style.color = '#a1a1a6'; }}
            >
              MENU
            </div>

            {/* Bottom Quadrant: PLAY / PAUSE Printed text */}
            <div 
              onClick={() => {
                if (activeSubTab === 'saved') {
                  if (selectedSavedLoop) handlePlaySavedLoop(selectedSavedLoop.url);
                } else {
                  handlePlayToggle();
                }
              }}
              style={{
                position: 'absolute',
                bottom: '18px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.56rem',
                fontWeight: 900,
                color: '#a1a1a6',
                transition: 'color 0.2s ease',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#ffffff'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#a1a1a6'; }}
            >
              {activeSubTab === 'saved'
                ? (isSavedLoopPlaying ? <Square size={6} fill="currentColor" /> : <Play size={6} fill="currentColor" />)
                : (isPlaying ? <Square size={6} fill="currentColor" /> : <Play size={6} fill="currentColor" />)}
              <span>PLAY / PAUSE</span>
            </div>

            {/* Left Quadrant: RESET Printed text */}
            <div 
              onClick={() => {
                if (activeSubTab === 'saved') {
                  if (savedLoopAudioRef.current) {
                    savedLoopAudioRef.current.currentTime = 0;
                    setPlaybackProgress(0);
                  }
                } else {
                  const hasRecordedTracks = tracks.some(t => t.url);
                  if (hasRecordedTracks) {
                    const confirmReset = window.confirm("Möchtest du deinen aktuellen Loop wirklich löschen und neu aufnehmen?");
                    if (!confirmReset) return;
                  }
                  handleReset();
                }
              }}
              style={{
                position: 'absolute',
                left: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                fontSize: '0.56rem',
                fontWeight: 900,
                color: '#a1a1a6',
                transition: 'color 0.2s ease',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#ffffff'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#a1a1a6'; }}
            >
              <RotateCcw size={6} />
              <span>RESET</span>
            </div>

            {/* Right Quadrant: SELECT Printed text */}
            <div 
              style={{
                position: 'absolute',
                right: '20px',
                fontSize: '0.56rem',
                fontWeight: 900,
                color: '#555558',
                letterSpacing: '0.04em'
              }}
            >
              SELECT
            </div>

            {/* Center Action Button (Record Action) */}
            <button
              type="button"
              onClick={() => {
                if (activeSubTab === 'saved') {
                  if (selectedSavedLoop) handlePlaySavedLoop(selectedSavedLoop.url);
                } else {
                  if (isPlaying) {
                    stopAll();
                  } else {
                    const hasRecordedTracks = tracks.some(t => t.url);
                    if (hasRecordedTracks) {
                      playAll();
                    } else {
                      startAutoSequence();
                    }
                  }
                }
              }}
              disabled={activeSubTab === 'studio' && isAutoSequenceActive}
              className="tactile-btn"
              style={{
                width: '74px',
                height: '74px',
                borderRadius: '50%',
                background: activeSubTab === 'saved'
                  ? (isSavedLoopPlaying ? 'linear-gradient(135deg, #6ee7b7 0%, #34a853 100%)' : 'linear-gradient(135deg, #e5e5ea 0%, #d1d1d6 100%)')
                  : (isPause 
                    ? 'linear-gradient(135deg, #facc15 0%, #eab308 100%)' 
                    : isAutoSequenceActive 
                      ? 'linear-gradient(135deg, #f87171 0%, #ef4444 100%)' 
                      : (tracks.some(t => t.url)
                          ? (isPlaying
                              ? 'linear-gradient(135deg, #f87171 0%, #ef4444 100%)' // Red for STOP
                              : 'linear-gradient(135deg, #6ee7b7 0%, #34a853 100%)') // Green for PLAY
                          : 'linear-gradient(135deg, #e5e5ea 0%, #d1d1d6 100%)')), // Gray for RECORD
                border: '1.5px solid rgba(0, 0, 0, 0.15)',
                boxShadow: (activeSubTab === 'studio' && isAutoSequenceActive)
                  ? '0 0 15px rgba(239, 68, 68, 0.4)' 
                  : 'inset 0 1.5px 2px rgba(255,255,255,0.6), 0 4px 8px rgba(0,0,0,0.25)',
                cursor: (activeSubTab === 'studio' && isAutoSequenceActive) ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.72rem',
                fontWeight: 900,
                color: (activeSubTab === 'saved' ? isSavedLoopPlaying : (isAutoSequenceActive || isPause || isPlaying)) ? '#ffffff' : '#3a3a3c',
                textTransform: 'uppercase',
                transition: 'all 0.25s ease'
              }}
            >
              {activeSubTab === 'saved'
                ? (isSavedLoopPlaying ? 'PLAY' : 'START')
                : (isAutoSequenceActive 
                    ? 'REC' 
                    : (tracks.some(t => t.url) 
                        ? (isPlaying ? 'STOP' : 'PLAY') 
                        : 'RECORD'))}
            </button>
          </div>
        </div>

        {/* Master Mixdown Export Buttons & Loop Onboarding Instruction Card */}
        {activeSubTab === 'studio' ? (
          masterLoopDuration ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', maxWidth: '300px', marginTop: '4px' }}>
              <button
                type="button"
                onClick={handleExportMix}
                disabled={isExporting}
                className="tactile-btn"
                style={{
                  background: '#34a853',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '10px 16px',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  cursor: isExporting ? 'not-allowed' : 'pointer',
                  width: '100%',
                  boxShadow: '0 4px 12px rgba(52, 168, 83, 0.15)',
                  transition: 'all 0.2s ease',
                  letterSpacing: '0.02em'
                }}
              >
                {isExporting ? 'SPEICHERE...' : 'LOOP SPEICHERN'}
              </button>
              <button
                type="button"
                onClick={handleDownloadMix}
                disabled={isExporting}
                className="tactile-btn"
                style={{
                  background: '#1d1d1f',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '10px 16px',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  cursor: isExporting ? 'not-allowed' : 'pointer',
                  width: '100%',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                  transition: 'all 0.2s ease',
                  letterSpacing: '0.02em'
                }}
              >
                {isExporting ? 'RENDERE MP3...' : 'MP3 SPEICHERN'}
              </button>
            </div>
          ) : (
            <div style={{
              width: '100%',
              maxWidth: '300px',
              background: 'rgba(255, 255, 255, 0.45)',
              border: '1.5px dashed rgba(0, 0, 0, 0.08)',
              borderRadius: '20px',
              padding: '16px 20px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              textAlign: 'center',
              marginTop: '4px'
            }}>
              <Music size={16} style={{ color: '#86868b' }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '0.66rem', fontWeight: 800, color: '#1d1d1f' }}>
                  Bereit zum Recorden
                </span>
                <span style={{ fontSize: '0.54rem', color: '#86868b', lineHeight: 1.3 }}>
                  Klicke die mittlere Taste <strong>START</strong> am iPod, um den automatischen Aufnahmezyklus zu starten.
                </span>
              </div>
            </div>
          )
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', maxWidth: '300px' }}>
            <div style={{
              width: '100%',
              background: 'rgba(255, 255, 255, 0.45)',
              border: '1.5px dashed rgba(0, 0, 0, 0.08)',
              borderRadius: '20px',
              padding: '16px 20px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              textAlign: 'center',
              marginTop: '4px'
            }}>
              <Music size={16} style={{ color: '#86868b' }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '0.66rem', fontWeight: 800, color: '#1d1d1f' }}>
                  Archiv-Modus
                </span>
                <span style={{ fontSize: '0.54rem', color: '#86868b', lineHeight: 1.3 }}>
                  Wähle einen Loop aus der Liste. Steuere die Wiedergabe über das <strong>Click Wheel</strong> am iPod.
                </span>
              </div>
            </div>
            {selectedSavedLoop && (
              <button
                type="button"
                onClick={async (e) => {
                  const btn = e.currentTarget;
                  const originalText = btn.innerText;
                  btn.innerText = "LADE...";
                  btn.disabled = true;
                  try {
                    const response = await fetch(selectedSavedLoop.url);
                    const arrayBuffer = await response.arrayBuffer();
                    
                    btn.innerText = "DECODIERE...";
                    const ctx = audioContextRef.current || new AudioContext();
                    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
                    
                    const repsPrompt = prompt("Wie oft soll der Loop im exportierten Song hintereinander wiederholt werden?", "4");
                    if (repsPrompt === null) {
                      btn.innerText = originalText;
                      btn.disabled = false;
                      return;
                    }
                    const repetitions = Math.max(1, parseInt(repsPrompt, 10) || 4);
                    
                    btn.innerText = "RENDERE...";
                    const totalDurationSec = audioBuffer.duration * repetitions;
                    const offlineCtx = new OfflineAudioContext(
                      2,
                      Math.round(totalDurationSec * 44100),
                      44100
                    );
                    
                    const source = offlineCtx.createBufferSource();
                    source.buffer = audioBuffer;
                    source.loop = true;
                    
                    source.connect(offlineCtx.destination);
                    source.start(0);
                    
                    const renderedBuffer = await offlineCtx.startRendering();
                    normalizeAudioBuffer(renderedBuffer, 0.95);
                    
                    btn.innerText = "KONVERTIERE...";
                    let mixBlob: Blob;
                    let fileExt = 'mp3';
                    try {
                      mixBlob = bufferToMp3(renderedBuffer);
                    } catch (mp3Err) {
                      console.warn("MP3 conversion failed, falling back to WAV:", mp3Err);
                      mixBlob = bufferToWav(renderedBuffer);
                      fileExt = 'wav';
                    }
                    
                    const downloadUrl = URL.createObjectURL(mixBlob);
                    const a = document.createElement('a');
                    a.href = downloadUrl;
                    a.download = `${(selectedSavedLoop.label || 'loop').toLowerCase().replace(/\s+/g, '_')}_x${repetitions}.${fileExt}`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(downloadUrl);
                  } catch (err) {
                    console.error("Archive export failed, falling back to direct download:", err);
                    try {
                      const response = await fetch(selectedSavedLoop.url);
                      const blob = await response.blob();
                      const blobUrl = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = blobUrl;
                      a.download = `${selectedSavedLoop.label || 'loop'}.mp3`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(blobUrl);
                    } catch (fallbackErr) {
                      window.open(selectedSavedLoop.url, '_blank');
                    }
                  } finally {
                    btn.innerText = originalText;
                    btn.disabled = false;
                  }
                }}
                className="tactile-btn"
                style={{
                  background: '#1d1d1f',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '10px 16px',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  width: '100%',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                  transition: 'all 0.2s ease',
                  letterSpacing: '0.02em'
                }}
              >
                MP3 SPEICHERN
              </button>
            )}
          </div>
        )}
      </div>

      <div style={{
        flex: '1.2 1 0%',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        padding: '2px 0',
        justifyContent: 'flex-start'
      }}>
        {activeSubTab === 'studio' ? (
          <>
            {/* Master Control Parameter Tray (Horizontal layout at the top of right column) */}
        <div style={{
          width: '100%',
          background: 'linear-gradient(135deg, #ffffff 0%, #f4f5f8 100%)',
          border: '1.5px solid rgba(0, 0, 0, 0.08)',
          borderRadius: '20px',
          padding: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          boxShadow: '0 8px 20px rgba(0, 0, 0, 0.03)',
          marginBottom: '8px'
        }}>
          <style>{`
            .apple-slider {
              -webkit-appearance: none;
              appearance: none;
              height: 4px;
              border-radius: 2px;
              outline: none;
              transition: background 0.1s ease;
            }
            .apple-slider::-webkit-slider-thumb {
              -webkit-appearance: none;
              appearance: none;
              width: 14px;
              height: 14px;
              border-radius: 50%;
              background: #ffffff;
              border: 0.5px solid rgba(0, 0, 0, 0.15);
              box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15), 0 1px 1px rgba(0, 0, 0, 0.1);
              cursor: pointer;
              transition: transform 0.1s ease;
            }
            .apple-slider::-webkit-slider-thumb:hover {
              transform: scale(1.1);
            }
            .apple-slider::-webkit-slider-thumb:active {
              transform: scale(0.95);
            }
            .apple-slider::-moz-range-thumb {
              width: 14px;
              height: 14px;
              border-radius: 50%;
              background: #ffffff;
              border: 0.5px solid rgba(0, 0, 0, 0.15);
              box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15), 0 1px 1px rgba(0, 0, 0, 0.1);
              cursor: pointer;
              border: none;
            }
          `}</style>
          <div style={{ display: 'flex', gap: '12px', width: '100%', alignItems: 'center' }}>
            {/* Kopfhörer Modus Toggle Card */}
            <div 
              onClick={() => {
                if (!isAutoSequenceActive) {
                  isManualHeadphonesRef.current = true;
                  setUseHeadphones(!useHeadphones);
                }
              }}
              style={{
                flex: 1.3,
                background: useHeadphones ? 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)' : '#ffffff',
                border: useHeadphones ? '1.5px solid #34a853' : '1.5px solid rgba(0, 0, 0, 0.08)',
                borderRadius: '12px',
                padding: '8px 12px',
                cursor: isAutoSequenceActive ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                transition: 'all 0.25s ease',
                opacity: isAutoSequenceActive ? 0.6 : 1
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Headphones size={13} style={{ color: useHeadphones ? '#2e7d32' : '#86868b' }} />
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '0.66rem', fontWeight: 800, color: useHeadphones ? '#2e7d32' : '#1d1d1f' }}>
                    Kopfhörer-Modus
                  </span>
                  <span style={{ fontSize: '0.50rem', color: '#616161', fontWeight: 500 }}>
                    Mehrspur aktiv
                  </span>
                </div>
              </div>
              
              <div style={{
                width: '32px',
                height: '18px',
                borderRadius: '99px',
                background: useHeadphones ? '#34a853' : 'rgba(0, 0, 0, 0.08)',
                position: 'relative',
                transition: 'all 0.25s ease',
                padding: '2px'
              }}>
                <div style={{
                  width: '14px',
                  height: '14px',
                  borderRadius: '50%',
                  background: '#ffffff',
                  position: 'absolute',
                  left: useHeadphones ? '16px' : '2px',
                  top: '2px',
                  transition: 'all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                }} />
              </div>
            </div>

            {/* Spuren Select Option Card */}
            <div style={{ 
              flex: 1,
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              background: '#ffffff',
              border: '1.5px solid rgba(0, 0, 0, 0.08)',
              borderRadius: '12px',
              padding: '8px 12px'
            }}>
              <span style={{ fontSize: '0.64rem', fontWeight: 800, color: '#55555d' }}>
                Spuren:
              </span>
              <select
                value={desiredTrackCount}
                onChange={(e) => setDesiredTrackCount(parseInt(e.target.value))}
                disabled={isAutoSequenceActive}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '0.66rem',
                  fontWeight: 800,
                  color: '#1d1d1f',
                  cursor: isAutoSequenceActive ? 'not-allowed' : 'pointer',
                  outline: 'none'
                }}
              >
                <option value={1}>1 Spur</option>
                <option value={2}>2 Spuren</option>
                {useHeadphones && (
                  <>
                    <option value={3}>3 Spuren</option>
                    <option value={4}>4 Spuren</option>
                    <option value={5}>5 Spuren</option>
                  </>
                )}
              </select>
            </div>

            {/* Tempo & Metronom Action Card */}
            <div 
              onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
              style={{
                flex: 1.3,
                background: showAdvancedSettings ? 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)' : '#ffffff',
                border: showAdvancedSettings ? '1.5px solid #1976d2' : '1.5px solid rgba(0, 0, 0, 0.08)',
                borderRadius: '12px',
                padding: '8px 12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                transition: 'all 0.25s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sliders size={13} style={{ color: showAdvancedSettings ? '#1565c0' : '#86868b' }} />
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '0.66rem', fontWeight: 800, color: showAdvancedSettings ? '#1565c0' : '#1d1d1f' }}>
                    Tempo & Metronom
                  </span>
                  <span style={{ fontSize: '0.50rem', color: '#616161', fontWeight: 500 }}>
                    {bpm} BPM | Click {isMetronomeActive ? 'AN' : 'AUS'}
                  </span>
                </div>
              </div>
              <ChevronRight size={12} style={{
                color: showAdvancedSettings ? '#1565c0' : '#86868b',
                transition: 'transform 0.2s',
                transform: showAdvancedSettings ? 'rotate(90deg)' : 'none'
              }} />
            </div>
          </div>

          {/* Advanced Drawer inside the Horizontal Tray */}
          {showAdvancedSettings && (
            <div style={{
              borderTop: '1.5px solid rgba(0, 0, 0, 0.06)',
              paddingTop: '12px',
              marginTop: '4px',
              width: '100%',
              display: 'flex',
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: '16px'
            }}>
              {/* Left Column: Metronome & Tempo Controls */}
              <div style={{
                flex: '1.3 1 360px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}>
                {/* Row 1: Click Active Toggle, Tap Tempo, BPM controls */}
                {isMetronomeActive && !useHeadphones && (
                  <div style={{
                    fontSize: '0.54rem',
                    color: '#ea4335',
                    fontWeight: 700,
                    padding: '4px 8px',
                    background: '#fce8e6',
                    borderRadius: '6px',
                    border: '1px solid rgba(234, 67, 53, 0.15)',
                    width: 'fit-content'
                  }}>
                    ⚠️ Tipp: Metronom stummschalten oder Kopfhörer nutzen, damit das Klicken nicht mit aufgenommen wird!
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => setIsMetronomeActive(!isMetronomeActive)}
                    className="tactile-btn"
                    style={{
                      background: isMetronomeActive ? '#eab308' : '#e5e5ea',
                      border: 'none',
                      color: isMetronomeActive ? '#ffffff' : '#1d1d1f',
                      fontSize: '0.62rem',
                      fontWeight: 800,
                      borderRadius: '8px',
                      height: '32px',
                      padding: '0 12px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      letterSpacing: '0.04em',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {isMetronomeActive ? 'CLICK ON' : 'CLICK OFF'}
                  </button>
                  
                  <button
                    type="button"
                    onClick={handleTapTempo}
                    className="tactile-btn"
                    style={{
                      background: 'rgba(0, 0, 0, 0.04)',
                      color: '#1d1d1f',
                      border: 'none',
                      borderRadius: '8px',
                      height: '32px',
                      padding: '0 12px',
                      fontSize: '0.62rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    TAP TEMPO
                  </button>

                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    <button
                      type="button"
                      onClick={() => setBpm(prev => Math.max(40, prev - 1))}
                      className="tactile-btn"
                      style={{ width: '28px', height: '32px', background: 'rgba(0, 0, 0, 0.04)', border: 'none', color: '#1d1d1f', borderRadius: '6px', fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      -
                    </button>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={bpm}
                      onChange={(e) => {
                        const cleanVal = e.target.value.replace(/[^0-9]/g, '');
                        if (cleanVal === '') {
                          setBpm(0 as any);
                        } else {
                          const num = parseInt(cleanVal);
                          if (!isNaN(num)) {
                            setBpm(Math.min(240, num));
                          }
                        }
                      }}
                      onBlur={() => {
                        if (bpm < 40) setBpm(40);
                        if (bpm > 240) setBpm(240);
                      }}
                      style={{
                        fontSize: '0.78rem',
                        fontWeight: 800,
                        fontFamily: 'SF Mono, monospace',
                        width: '36px',
                        textAlign: 'center',
                        color: '#1d1d1f',
                        border: '1px solid rgba(0, 0, 0, 0.1)',
                        borderRadius: '6px',
                        background: '#ffffff',
                        padding: '2px 0',
                        outline: 'none'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setBpm(prev => Math.min(240, prev + 1))}
                      className="tactile-btn"
                      style={{ width: '28px', height: '32px', background: 'rgba(0, 0, 0, 0.04)', border: 'none', color: '#1d1d1f', borderRadius: '6px', fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Row 2: Selectors */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 70px' }}>
                    <span style={{ fontSize: '0.52rem', color: '#86868b', fontWeight: 800, marginBottom: '2px', letterSpacing: '0.04em' }}>TAKTART</span>
                    <select
                      value={timeSignature}
                      onChange={(e) => setTimeSignature(e.target.value as any)}
                      style={{
                        background: '#ffffff',
                        border: '1.5px solid rgba(0, 0, 0, 0.08)',
                        borderRadius: '8px',
                        height: '32px',
                        padding: '0 4px',
                        fontSize: '0.62rem',
                        fontWeight: 700,
                        outline: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="4/4">4/4 Takt</option>
                      <option value="3/4">3/4 Takt</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 80px' }}>
                    <span style={{ fontSize: '0.52rem', color: '#86868b', fontWeight: 800, marginBottom: '2px', letterSpacing: '0.04em' }}>LOOP-LÄNGE</span>
                    <select
                      value={barLength}
                      onChange={(e) => setBarLength(parseInt(e.target.value) as any)}
                      style={{
                        background: '#ffffff',
                        border: '1.5px solid rgba(0, 0, 0, 0.08)',
                        borderRadius: '8px',
                        height: '32px',
                        padding: '0 4px',
                        fontSize: '0.62rem',
                        fontWeight: 700,
                        outline: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      <option value={1}>1 Takt</option>
                      <option value={2}>2 Takte</option>
                      <option value={4}>4 Takte</option>
                      <option value={8}>8 Takte</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 90px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                      <span style={{ fontSize: '0.52rem', color: '#86868b', fontWeight: 800, letterSpacing: '0.04em' }}>METRONOM-SOUND</span>
                      <button
                        type="button"
                        onClick={() => playClickSound(true)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          padding: '0 2px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#86868b'
                        }}
                      >
                        <Volume2 size={10} />
                      </button>
                    </div>
                    <select
                      value={metronomeSound}
                      onChange={(e) => {
                        const newSound = e.target.value as any;
                        setMetronomeSound(newSound);
                        // Trigger a short audio preview click
                        setTimeout(() => playClickSound(true, undefined, newSound), 50);
                      }}
                      style={{
                        background: '#ffffff',
                        border: '1.5px solid rgba(0, 0, 0, 0.08)',
                        borderRadius: '8px',
                        height: '32px',
                        padding: '0 4px',
                        fontSize: '0.62rem',
                        fontWeight: 700,
                        outline: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="wood">Holz-Klick</option>
                      <option value="cowbell">Cowbell</option>
                      <option value="synth">Synth-Beep</option>
                      <option value="rimshot">Rimshot</option>
                    </select>
                  </div>
                </div>

                {/* Row 3: Click Volume Slider */}
                <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                    <span style={{ fontSize: '0.52rem', color: '#86868b', fontWeight: 800, letterSpacing: '0.04em' }}>CLICK LAUTSTÄRKE</span>
                    <span style={{ fontSize: '0.58rem', color: '#eab308', fontWeight: 800, fontFamily: 'SF Mono, monospace' }}>{loopstationMetronomeVolume}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    value={loopstationMetronomeVolume} 
                    onChange={(e) => setLoopstationMetronomeVolume(parseInt(e.target.value))} 
                    className="apple-slider"
                    style={{
                      width: '100%',
                      height: '4px',
                      cursor: 'pointer',
                      background: `linear-gradient(to right, #86868b 0%, #86868b ${loopstationMetronomeVolume}%, rgba(0,0,0,0.06) ${loopstationMetronomeVolume}%, rgba(0,0,0,0.06) 100%)`
                    }}
                  />
                </div>
              </div>

              {/* Vertical Divider (Desktop only) */}
              <div style={{ width: '1px', alignSelf: 'stretch', background: 'rgba(0, 0, 0, 0.06)' }} className="hidden md:block" />

              {/* Right Column: Latency Sync Card (Neutral Apple grey design) */}
              <div style={{
                flex: '1 1 240px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                background: '#f5f5f7',
                borderRadius: '12px',
                padding: '12px',
                border: '1.5px solid rgba(0, 0, 0, 0.04)'
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                    <span style={{ fontSize: '0.52rem', color: '#1d1d1f', fontWeight: 800, letterSpacing: '0.04em' }}>LATENZ-AUSGLEICH</span>
                    <span style={{ fontSize: '0.58rem', color: '#86868b', fontWeight: 800, fontFamily: 'SF Mono, monospace' }}>{syncOffsetMs > 0 ? '+' : ''}{syncOffsetMs}ms</span>
                  </div>
                  <input 
                    type="range" 
                    min="-150" 
                    max="350" 
                    value={syncOffsetMs} 
                    onChange={(e) => {
                      setSyncOffsetMs(parseInt(e.target.value));
                      isManualLatencyAdjustmentRef.current = true;
                    }} 
                    onMouseUp={(e) => {
                      updateLatencyInDb(parseInt((e.target as HTMLInputElement).value));
                    }}
                    onTouchEnd={(e) => {
                      updateLatencyInDb(parseInt((e.target as HTMLInputElement).value));
                    }}
                    className="apple-slider"
                    style={{
                      width: '100%',
                      height: '4px',
                      cursor: 'pointer',
                      background: `linear-gradient(to right, #86868b 0%, #86868b ${((syncOffsetMs + 150) / 500) * 100}%, rgba(0,0,0,0.06) ${((syncOffsetMs + 150) / 500) * 100}%, rgba(0,0,0,0.06) 100%)`
                    }}
                  />
                </div>
                
                <button
                  type="button"
                  onClick={() => {
                    setIsCalibratingLatency(true);
                    setCalibrationPhaseState('idle');
                  }}
                  disabled={isCalibratingLatency}
                  className="tactile-btn"
                  style={{
                    background: isCalibratingLatency ? '#e5e5ea' : 'rgba(0, 0, 0, 0.04)',
                    color: isCalibratingLatency ? '#86868b' : '#1d1d1f',
                    border: 'none',
                    borderRadius: '8px',
                    height: '32px',
                    padding: '0 10px',
                    fontSize: '0.58rem',
                    fontWeight: 800,
                    cursor: isCalibratingLatency ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s ease',
                    textTransform: 'uppercase',
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '100%'
                  }}
                >
                  {isCalibratingLatency ? 'Kalibriere...' : 'Latenz-Kalibrierung'}
                </button>
              </div>
            </div>
          )}
        </div>

        {tracks.map((track) => {
          const hasAudio = !!track.url;
          const hasAnySolo = tracks.some(t => t.isSoloed);
          const isImplicitlyMuted = hasAnySolo && !track.isSoloed && !track.isMuted;
          
          return (
            <div
              key={track.id}
              className={`daw-console-strip ${track.isRecording ? 'recording-card-pulse' : ''}`}
              style={{
                background: 'rgba(255, 255, 255, 0.72)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: track.isRecording 
                  ? '1.5px solid #ea4335' 
                  : track.isWaiting 
                    ? '1.5px solid #d97706'
                    : '1px solid rgba(255, 255, 255, 0.6)',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.02), inset 0 1px 0 rgba(255, 255, 255, 0.5)',
                borderRadius: '16px',
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px',
                position: 'relative',
                opacity: isImplicitlyMuted ? 0.45 : 1,
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                overflow: 'hidden'
              }}
            >
              {/* Playback progress bar */}
              {isPlaying && hasAudio && !track.isMuted && (
                <div style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: '3px',
                  background: '#34a853',
                  opacity: 0.8
                }} />
              )}

              {/* DAW Channel Arm Button */}
              <div>
                {track.isRecording ? (
                  <button
                    type="button"
                    onClick={() => stopRecording(track.id)}
                    className="tactile-btn"
                    style={{
                      background: '#fce8e6',
                      color: '#ea4335',
                      border: 'none',
                      borderRadius: '50%',
                      width: '40px',
                      height: '40px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <Square size={10} fill="currentColor" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => startRecording(track.id)}
                    disabled={track.isWaiting || (track.id > 1 && !masterLoopDuration) || countInBeats !== null}
                    className="tactile-btn"
                    style={{
                      background: track.isWaiting 
                        ? '#fef3c7' 
                        : hasAudio 
                          ? '#f5f5f7' 
                          : 'rgba(52, 168, 83, 0.06)',
                      color: track.isWaiting 
                        ? '#d97706' 
                        : hasAudio 
                          ? '#86868b' 
                          : '#34a853',
                      border: 'none',
                      borderRadius: '50%',
                      width: '40px',
                      height: '40px',
                      cursor: (track.isWaiting || (track.id > 1 && !masterLoopDuration)) ? 'not-allowed' : 'pointer',
                      opacity: (track.id > 1 && !masterLoopDuration) ? 0.35 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <Mic size={14} />
                  </button>
                )}
              </div>

              {/* Volume Slider & Label */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '0.66rem', fontWeight: 700, color: '#1d1d1f' }}>
                    Spur {track.id}
                  </span>
                  <div style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: track.isRecording 
                      ? '#ea4335' 
                      : track.isWaiting 
                        ? '#d97706' 
                        : hasAudio 
                          ? '#34a853' 
                          : '#cbd5e0',
                    transition: 'background 0.2s ease'
                  }} />
                  <span style={{ 
                    fontSize: '0.52rem', 
                    color: '#86868b', 
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    marginLeft: 'auto'
                  }}>
                    {track.isRecording ? 'Aufnahme' : track.isWaiting ? 'Wartet' : hasAudio ? 'Bereit' : 'Leer'}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: hasAudio ? 1 : 0.3 }}>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={track.volume}
                    onChange={(e) => handleVolumeChange(track.id, Number(e.target.value))}
                    className="groovelab-fader"
                    disabled={!hasAudio}
                  />
                  <span style={{ fontSize: '0.54rem', color: '#86868b', fontFamily: 'SF Mono, monospace', width: '28px', textAlign: 'right' }}>
                    {track.volume === 0 ? 'Mute' : `${Math.round(track.volume / 100 * 6)}dB`}
                  </span>
                </div>

                {/* Visuelle 8tel-Noten Timeline */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '2.5px',
                  marginTop: '8px',
                  width: '100%'
                }}>
                  {Array.from({ length: 32 }).map((_, stepIdx) => {
                    const isBarStart = stepIdx % 8 === 0;
                    const isQuarterBeat = stepIdx % 2 === 0;
                    
                    let isCurrentStep = false;
                    if (isPlaying) {
                      const activeStep = Math.floor((playbackProgress / 100) * 32);
                      isCurrentStep = activeStep === stepIdx;
                    } else if (isAutoSequenceActive) {
                      const elapsedSecs = (audioContextRef.current ? audioContextRef.current.currentTime : 0) - sequenceStartTimeRef.current;
                      const continuousTick = elapsedSecs / (60 / bpm);
                      if (continuousTick >= 4) {
                        const sequenceOffsetBeats = continuousTick - 4;
                        const sequenceOffsetSteps = Math.floor(sequenceOffsetBeats * 2);
                        const activeStep = sequenceOffsetSteps % 32;
                        isCurrentStep = activeStep === stepIdx;
                      }
                    }

                    // Taller, premium waveform transient envelope heights
                    const wavePattern = [
                      16, 7, 5, 3, 9, 5, 4, 3,
                      12, 6, 4, 3, 8, 5, 4, 6,
                      14, 7, 5, 3, 10, 5, 4, 3,
                      12, 6, 4, 3, 9, 5, 7, 13
                    ];
                    const baseHeight = wavePattern[stepIdx];
                    const isPassed = isPlaying && (Math.floor((playbackProgress / 100) * 32) > stepIdx);
                    
                    let blockColor = '#e5e5ea';
                    if (track.isRecording) {
                      blockColor = isCurrentStep ? '#ef4444' : 'rgba(239, 68, 68, 0.25)';
                    } else if (hasAudio) {
                      if (isCurrentStep) {
                        blockColor = '#34a853';
                      } else if (isPassed) {
                        blockColor = 'rgba(52, 168, 83, 0.4)';
                      } else {
                        blockColor = 'rgba(52, 168, 83, 0.15)';
                      }
                    } else {
                      // Highlight current step even on empty/waiting tracks for visual synchronization
                      if (isCurrentStep) {
                        blockColor = 'rgba(0, 0, 0, 0.18)';
                      }
                    }

                    return (
                      <div
                        key={stepIdx}
                        style={{
                          flex: 1,
                          height: `${isCurrentStep ? baseHeight + 3 : baseHeight}px`,
                          borderRadius: '1px',
                          background: blockColor,
                          transition: 'all 0.08s ease',
                          opacity: isCurrentStep ? 1 : ((hasAudio || track.isRecording) ? 0.8 : 0.25)
                        }}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Clean LED Level Meter */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '2.5px',
                padding: '5px 4px',
                background: '#111112',
                borderRadius: '6px',
                minWidth: '18px',
                justifyContent: 'space-between',
                alignItems: 'center',
                height: '64px',
                border: '1px solid rgba(255,255,255,0.05)',
                boxShadow: 'inset 0 2px 5px rgba(0,0,0,0.8), 0 1px 0 rgba(255,255,255,0.05)'
              }}>
                {Array.from({ length: 10 }).map((_, idx) => {
                  const level = 10 - idx;
                  const isActive = meterHeights[track.id] >= level;
                  let targetColor = '#222225'; // Dark state
                  if (isActive) {
                    if (level >= 9) targetColor = '#ea4335'; // Red peak clip
                    else if (level >= 7) targetColor = '#facc15'; // Yellow warn
                    else targetColor = '#34a853'; // Green safe
                  }
                  return (
                    <div
                      key={idx}
                      style={{
                        width: '6px',
                        height: '2px',
                        borderRadius: '0.5px',
                        background: targetColor,
                        boxShadow: isActive ? `0 0 4px ${targetColor}` : 'none',
                        transition: 'all 0.05s ease'
                      }}
                    />
                  );
                })}
              </div>

              {/* Actions: Mute & Solo */}
              <div style={{ display: 'flex', gap: '4px', opacity: hasAudio ? 1 : 0.2, pointerEvents: hasAudio ? 'auto' : 'none' }}>
                <button
                  type="button"
                  onClick={() => handleSoloToggle(track.id)}
                  className="tactile-btn"
                  style={{
                    background: track.isSoloed ? 'rgba(217, 119, 6, 0.1)' : '#f5f5f7',
                    color: track.isSoloed ? '#d97706' : '#1d1d1f',
                    borderRadius: '16px',
                    padding: '4px 10px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    fontWeight: 700,
                    fontSize: '0.58rem',
                    border: 'none'
                  }}
                >
                  SOLO
                </button>

                <button
                  type="button"
                  onClick={() => handleMuteToggle(track.id)}
                  className="tactile-btn"
                  style={{
                    background: track.isMuted ? 'rgba(234, 67, 53, 0.1)' : '#f5f5f7',
                    color: track.isMuted ? '#ea4335' : '#1d1d1f',
                    borderRadius: '16px',
                    padding: '4px 10px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    fontWeight: 700,
                    fontSize: '0.58rem',
                    border: 'none'
                  }}
                >
                  MUTE
                </button>

                <button
                  type="button"
                  onClick={() => handleDeleteTrack(track.id)}
                  className="tactile-btn"
                  style={{
                    background: 'transparent',
                    color: '#86868b',
                    border: 'none',
                    borderRadius: '50%',
                    width: '28px',
                    height: '28px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = '#ea4335'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = '#86868b'; }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          );
        })}
      </>
      ) : (
          /* Saved Loops List View */
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            background: '#ffffff',
            borderRadius: '20px',
            border: '1.5px solid rgba(0, 0, 0, 0.08)',
            padding: '24px',
            width: '100%',
            boxShadow: '0 8px 20px rgba(0, 0, 0, 0.03)'
          }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#1d1d1f', marginBottom: '8px' }}>
              Deine Aufnahmen
            </h3>
            {savedLoops.length === 0 ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '120px', color: '#86868b', background: 'rgba(0,0,0,0.02)', borderRadius: '12px', border: '1px dashed rgba(0,0,0,0.08)' }}>
                <span style={{ fontSize: '0.74rem' }}>Noch keine gespeicherten Loops vorhanden.</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {savedLoops.map((loop, idx) => {
                  const isSelected = selectedSavedLoop?.url === loop.url;
                  return (
                    <div 
                      key={idx} 
                      onClick={() => {
                        setSelectedSavedLoop(loop);
                        if (playingSavedLoopUrl && playingSavedLoopUrl !== loop.url) {
                          if (savedLoopAudioRef.current) savedLoopAudioRef.current.pause();
                          setPlayingSavedLoopUrl(null);
                          setPlaybackProgress(0);
                        }
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 16px',
                        background: isSelected ? 'rgba(52, 168, 83, 0.05)' : '#f5f5f7',
                        borderRadius: '12px',
                        border: isSelected ? '1.5px solid #34a853' : '1.5px solid transparent',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5px', flex: 1 }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1d1d1f' }}>{loop.label}</span>
                        <span style={{ fontSize: '0.58rem', color: '#86868b' }}>
                          {new Date(loop.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })} Uhr • {loop.duration}s
                        </span>
                        <div style={{
                          width: '140px',
                          height: '4px',
                          background: isSelected ? 'rgba(52, 168, 83, 0.15)' : '#e5e5ea',
                          borderRadius: '2px',
                          marginTop: '6px',
                          position: 'relative',
                          overflow: 'hidden'
                        }}>
                          <div
                            className={playingSavedLoopUrl === loop.url ? 'shimmer-active' : ''}
                            style={{
                              width: `${Math.min(100, (Number(loop.duration) / 16) * 100)}%`,
                              height: '100%',
                              background: playingSavedLoopUrl === loop.url ? '#34a853' : '#a8aec4',
                              borderRadius: '2px',
                              transition: 'all 0.3s ease'
                            }}
                          />
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }} onClick={e => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => handlePlaySavedLoop(loop.url)}
                          className="tactile-btn"
                          style={{
                            background: '#34a853',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '50%',
                            width: '32px',
                            height: '32px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer'
                          }}
                        >
                          {playingSavedLoopUrl === loop.url ? <Square size={10} fill="currentColor" /> : <Play size={10} fill="currentColor" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSavedLoop(loop.originalStr)}
                          className="tactile-btn"
                          style={{
                            background: 'transparent',
                            color: '#86868b',
                            border: 'none',
                            borderRadius: '50%',
                            width: '32px',
                            height: '32px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer'
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.color = '#ea4335'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.color = '#86868b'; }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
      </div>

        {/* Auto-Calibration Glassmorphism Overlay */}
        {isCalibratingLatency && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(255, 255, 255, 0.45)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderRadius: useNotebookLayout ? '0 0 24px 24px' : '24px',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px'
          }}>
            <div style={{
              background: 'rgba(255, 255, 255, 0.85)',
              backdropFilter: 'blur(40px)',
              WebkitBackdropFilter: 'blur(40px)',
              border: '1px solid rgba(255, 255, 255, 0.5)',
              borderRadius: '24px',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.12), inset 0 1px 0 rgba(255,255,255,0.6)',
              padding: '32px',
              width: '100%',
              maxWidth: '460px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '20px',
              animation: 'fadeInScale 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.62rem', fontWeight: 900, color: '#34a853', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                    System-Kalibrierung
                  </span>
                  {/* Blinking Calibration LED */}
                  {isCalibratingLatency && calibrationPhaseState !== 'idle' && calibrationPhaseState !== 'result' && (
                    <div style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: activeBeatPulse === 'downbeat' ? '#ea4335' : activeBeatPulse === 'upbeat' ? '#34a853' : '#e5e5ea',
                      boxShadow: activeBeatPulse ? `0 0 8px ${activeBeatPulse === 'downbeat' ? '#ea4335' : '#34a853'}` : 'none',
                      transition: 'all 0.1s ease',
                      border: '1px solid rgba(0,0,0,0.1)'
                    }} />
                  )}
                </div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1d1d1f', margin: 0 }}>
                  {calibrationPhaseState === 'idle' && 'Latenz einrichten'}
                  {calibrationPhaseState === 'ambient' && 'Hintergrundgeräusche...'}
                  {calibrationPhaseState === 'clicks' && `Messung läuft...`}
                  {calibrationPhaseState === 'result' && 'Kalibrierung abgeschlossen!'}
                </h3>
              </div>

              {/* Display progress status */}
              {calibrationPhaseState === 'idle' ? (
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.74rem', color: '#515154', lineHeight: 1.5, padding: '0 8px' }}>
                    Bitte kalibriere einmalig deine Latenz, um deine erste Aufnahme perfekt synchron einzuspielen. Dieser Vorgang dauert nur wenige Sekunden.
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', marginTop: '8px' }}>
                    <button
                      type="button"
                      onClick={() => runAutoLatencyCalibration()}
                      className="tactile-btn"
                      style={{
                        background: '#34a853',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '10px 24px',
                        fontSize: '0.74rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        width: '100%'
                      }}
                    >
                      Kalibrierung starten
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsCalibratingLatency(false)}
                      className="tactile-btn"
                      style={{
                        background: 'transparent',
                        color: '#86868b',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '8px 24px',
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        width: '100%'
                      }}
                    >
                      Abbrechen
                    </button>
                  </div>
                </div>
              ) : calibrationPhaseState !== 'result' ? (
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                  <span style={{ fontSize: '0.68rem', fontWeight: 600, color: '#86868b' }}>
                    {calibrationPhaseState === 'ambient' 
                      ? `Durchgang ${calibrationRunIndex} von 3: Messe Raumlautstärke...`
                      : `Durchgang ${calibrationRunIndex} von 3: Click ${calibrationClickCount} von 3 gesendet`
                    }
                  </span>
                  
                  {/* Visual mic level bar */}
                  <div style={{ width: '100%', height: '6px', background: 'rgba(0,0,0,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${calibrationMicLevel}%`,
                      height: '100%',
                      background: '#34a853',
                      borderRadius: '3px',
                      transition: 'width 0.05s ease-out'
                    }} />
                  </div>

                  {/* Sub-results history */}
                  {calibrationRunResults.length > 0 && (
                    <div style={{
                      width: '100%',
                      background: '#f5f5f7',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      alignItems: 'flex-start'
                    }}>
                      <span style={{ fontSize: '0.52rem', fontWeight: 800, color: '#86868b' }}>BISHERIGE ERGEBNISSE:</span>
                      {calibrationRunResults.map((res: number, idx: number) => (
                        <div key={idx} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', fontSize: '0.58rem', fontFamily: 'SF Mono, monospace', color: '#1d1d1f' }}>
                          <span>Durchgang {idx + 1}:</span>
                          <span>{res} ms</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                  <div style={{
                    width: '100%',
                    background: '#f5f5f7',
                    borderRadius: '12px',
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}>
                    {calibrationRunResults.map((res: number, idx: number) => (
                      <div key={idx} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', fontSize: '0.62rem', fontFamily: 'SF Mono, monospace', color: '#1d1d1f' }}>
                        <span>Durchgang {idx + 1}:</span>
                        <span style={{ fontWeight: 700 }}>{res} ms</span>
                      </div>
                    ))}
                    <div style={{ width: '100%', height: '1px', background: 'rgba(0, 0, 0, 0.06)', margin: '4px 0' }} />
                    <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: '#34a853', fontWeight: 800 }}>
                      <span>Automatische Latenz:</span>
                      <span>{syncOffsetMs} ms</span>
                    </div>
                  </div>

                  {/* --- ADVANCED TRANS-ALIGN WAVEFORM VISUALIZER --- */}
                  {calibrationWaveform && (
                    <div style={{
                      width: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}>
                      <span style={{ fontSize: '0.58rem', fontWeight: 800, color: '#86868b', alignSelf: 'flex-start' }}>TRANSIENT ALIGNMENT (FEINJUSTIERUNG)</span>
                      <div style={{
                        width: '100%',
                        height: '100px',
                        background: '#18202c',
                        borderRadius: '12px',
                        border: '1.5px solid #0d1218',
                        position: 'relative',
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {/* Grid Lines */}
                        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0.1, backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)', backgroundSize: '10px 10px' }} />
                        
                        {/* Zero/Target reference line */}
                        <div style={{
                          position: 'absolute',
                          left: '30%', // Align with the onset (sample index 120 of 400 is 30%)
                          top: 0,
                          width: '2px',
                          height: '100%',
                          background: '#ea4335',
                          boxShadow: '0 0 8px #ea4335',
                          zIndex: 10
                        }}>
                          <span style={{ position: 'absolute', top: '4px', left: '6px', fontSize: '0.46rem', color: '#ea4335', fontWeight: 800, whiteSpace: 'nowrap' }}>TRIGGER TIME (0ms)</span>
                        </div>

                        {/* Waveform SVG */}
                        <svg
                          style={{
                            width: '100%',
                            height: '80%',
                            position: 'relative',
                            overflow: 'visible'
                          }}
                        >
                          {/* Horizontal Yellow Baseline (0-amplitude level) */}
                          <line
                            x1="0"
                            y1="40"
                            x2="100%"
                            y2="40"
                            stroke="#eab308"
                            strokeWidth="1"
                            strokeDasharray="2,3"
                            opacity="0.45"
                          />
                          <g style={{
                            // Shift the waveform path horizontally based on current offset vs finalAvg
                            transform: `translateX(${(syncOffsetMs - (calibrationRunResults[0] || 0)) * 0.8}px)`,
                            transition: 'transform 0.1s ease-out'
                          }}>
                            <path
                              d={`M ${calibrationWaveform.map((val: number, idx: number) => {
                                const x = (idx / calibrationWaveform.length) * 400; // Stretch across width
                                const y = 40 + val * 120; // Center y axis and scale amplitude
                                return `${x} ${y}`;
                              }).join(' L ')}`}
                              fill="none"
                              stroke="#34a853"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              style={{ filter: 'drop-shadow(0 0 4px rgba(52, 168, 83, 0.6))' }}
                            />
                            
                            {/* Green Onset Marker Line and Dot */}
                            <line
                              x1={120}
                              y1={0}
                              x2={120}
                              y2={80}
                              stroke="#34a853"
                              strokeWidth="1.5"
                              strokeDasharray="3,3"
                              opacity="0.8"
                            />
                            <circle
                              cx={120}
                              cy={40}
                              r="5"
                              fill="#34a853"
                              style={{ filter: 'drop-shadow(0 0 5px #34a853)' }}
                            />
                            <text
                              x={128}
                              y={15} // Moved to top to prevent wave overlap
                              fill="#34a853"
                              style={{ fontSize: '0.45rem', fontWeight: 900, letterSpacing: '0.05em' }}
                            >
                              SIGNAL-START
                            </text>
                          </g>
                        </svg>
                      </div>

                      {/* Fine-Tuning Slider */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', width: '100%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.52rem', color: '#86868b', fontWeight: 800 }}>MANUELLE KORREKTUR</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {autoLatencyResult !== null && syncOffsetMs !== autoLatencyResult && (
                              <button
                                type="button"
                                onClick={() => setSyncOffsetMs(autoLatencyResult)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#34a853',
                                  fontSize: '0.52rem',
                                  fontWeight: 800,
                                  cursor: 'pointer',
                                  padding: 0,
                                  textDecoration: 'underline'
                                }}
                              >
                                Zurück auf Auto ({autoLatencyResult} ms)
                              </button>
                            )}
                            <span style={{ fontSize: '0.58rem', color: '#34a853', fontWeight: 800, fontFamily: 'SF Mono, monospace' }}>{syncOffsetMs} ms</span>
                          </div>
                        </div>
                        <input
                          type="range"
                          min="-150"
                          max="350"
                          value={syncOffsetMs}
                          onChange={(e) => {
                            setSyncOffsetMs(parseInt(e.target.value));
                            isManualLatencyAdjustmentRef.current = true;
                          }}
                          style={{ width: '100%', accentColor: '#34a853', height: '4px', cursor: 'pointer' }}
                        />
                      </div>

                      {/* Accordion Trigger */}
                      <button
                        type="button"
                        onClick={() => setShowCalibrationHelp(!showCalibrationHelp)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#86868b',
                          fontSize: '0.62rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '4px 0',
                          alignSelf: 'flex-start',
                          outline: 'none'
                        }}
                      >
                        <span>Wie funktioniert die Feinjustierung? ℹ️</span>
                        <span style={{
                          transform: showCalibrationHelp ? 'rotate(90deg)' : 'none',
                          transition: 'transform 0.2s ease',
                          display: 'inline-block'
                        }}>▶</span>
                      </button>

                      {/* Accordion Content */}
                      {showCalibrationHelp && (
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px',
                          width: '100%',
                          background: '#f5f5f7',
                          borderRadius: '12px',
                          padding: '12px',
                          border: '1px solid rgba(0,0,0,0.06)',
                          animation: 'slideDown 0.2s ease-out',
                          textAlign: 'left'
                        }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.62rem', color: '#1d1d1f', lineHeight: 1.4 }}>
                            <p style={{ margin: 0, fontWeight: 700 }}>1. Kurve ausrichten</p>
                            <p style={{ margin: 0, color: '#515154' }}>Bewege den Regler, bis der <b>grüne Punkt (Signal-Start)</b> der Kurve exakt auf der <b>roten Referenzlinie (Trigger Time)</b> liegt.</p>
                            <p style={{ margin: 0, color: '#86868b', fontSize: '0.56rem', marginTop: '2px', fontStyle: 'italic' }}>Hinweis: Richte die Linien am Signalstart (wo die Kurve die Nulllinie verlässt) aus, nicht am Wellen-Peak.</p>
                            
                            <p style={{ margin: 0, fontWeight: 700, marginTop: '4px' }}>2. Speichern</p>
                            <p style={{ margin: 0, color: '#515154' }}>Klicke auf Speichern. Das System merkt sich den Wert und gleicht Latenzen bei zukünftigen Aufnahmen automatisch aus.</p>
                          </div>

                          {/* High-Fidelity Comparison Schematic SVG */}
                          <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px',
                            width: '100%',
                            marginTop: '4px'
                          }}>
                            <span style={{ fontSize: '0.52rem', fontWeight: 800, color: '#86868b' }}>VERGLEICHS-SCHEMA:</span>
                            <div style={{
                              display: 'flex',
                              gap: '8px',
                              width: '100%'
                            }}>
                              {/* Left: Ideal */}
                              <div style={{
                                flex: 1,
                                height: '58px',
                                background: '#18202c',
                                border: '1.5px solid #0d1218',
                                borderRadius: '8px',
                                position: 'relative',
                                overflow: 'hidden',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                padding: '4px'
                              }}>
                                <span style={{ fontSize: '0.46rem', color: '#34a853', fontWeight: 800 }}>✓ OPTIMAL (SYNCHRON)</span>
                                <svg viewBox="0 0 100 32" style={{ width: '100%', height: '32px' }}>
                                  {/* Red Ref Line at x=30 */}
                                  <line x1="30" y1="0" x2="30" y2="32" stroke="#ea4335" strokeWidth="1.5" strokeDasharray="2,2" />
                                  {/* Green Wave aligned: starts rising exactly at x=30 with taller amplitude */}
                                  <path d="M 0 16 L 30 16 Q 35 0, 40 16 T 50 16 L 100 16" fill="none" stroke="#34a853" strokeWidth="1.8" />
                                </svg>
                              </div>

                              {/* Right: Too Late */}
                              <div style={{
                                flex: 1,
                                height: '58px',
                                background: '#18202c',
                                border: '1.5px solid #0d1218',
                                borderRadius: '8px',
                                position: 'relative',
                                overflow: 'hidden',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                padding: '4px'
                              }}>
                                <span style={{ fontSize: '0.46rem', color: '#ea4335', fontWeight: 800 }}>✗ ASYNCHRON (ABWEICHUNG)</span>
                                <svg viewBox="0 0 100 32" style={{ width: '100%', height: '32px' }}>
                                  {/* Red Ref Line at x=30 */}
                                  <line x1="30" y1="0" x2="30" y2="32" stroke="#ea4335" strokeWidth="1.5" strokeDasharray="2,2" />
                                  {/* Green Wave shifted: starts rising way after at x=55 with taller amplitude */}
                                  <path d="M 0 16 L 55 16 Q 60 0, 65 16 T 75 16 L 100 16" fill="none" stroke="#34a853" strokeWidth="1.8" opacity="0.6" />
                                </svg>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setIsCalibratingLatency(false);
                      updateLatencyInDb(syncOffsetMs);
                      localStorage.setItem('groovelab_latency_calibrated', 'true');
                    }}
                    className="tactile-btn"
                    style={{
                      background: '#34a853',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '8px 24px',
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      width: '100%'
                    }}
                  >
                    Kalibrierung abschließen & speichern
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
  );
};

// -------------------------------------------------------------
// GroovePracticeCompanion (Student Metronome & Beat Generator)
// -------------------------------------------------------------
interface GroovePracticeCompanionProps {
  useNotebookLayout: boolean;
}

const GroovePracticeCompanion: React.FC<any> = ({ useNotebookLayout }) => {
  const getBeatsPerBar = (style: string) => {
    if (style === 'walzer') return 3;
    if (style === 'ballad68') return 6;
    return 4;
  };

  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(120);
  const [selectedStyle, setSelectedStyle] = useState<'metronome' | 'rock' | 'hiphop' | 'swing' | 'latin' | 'funk' | 'reggae' | 'walzer' | 'ballad68' | 'disco'>('metronome');
  const [selectedVariation, setSelectedVariation] = useState<'A' | 'B' | 'C'>('A');
  const [volKick, setVolKick] = useState(80);
  const [volSnare, setVolSnare] = useState(80);
  const [volHat, setVolHat] = useState(80);
  const [volMetronome, setVolMetronome] = useState(80);
  
  const [mutedInstruments, setMutedInstruments] = useState<string[]>([]);
  const [soloedInstruments, setSoloedInstruments] = useState<string[]>([]);
  
  const [activeBeatIndex, setActiveBeatIndex] = useState<number | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const nextNoteTimeRef = useRef(0.0);
  const current16thNoteRef = useRef(0);
  const timerIdRef = useRef<any>(null);
  const noiseBufferRef = useRef<AudioBuffer | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);

  const [barProgress, setBarProgress] = useState(0);
  const barStartAudioTimeRef = useRef<number>(0);
  const progressFrameRef = useRef<number | null>(null);

  // Refs to allow real-time volume, variation, and solo/mute adjustments without rebuilding the scheduler loop
  const volKickRef = useRef(volKick);
  const volSnareRef = useRef(volSnare);
  const volHatRef = useRef(volHat);
  const volMetronomeRef = useRef(volMetronome);
  const selectedVariationRef = useRef(selectedVariation);
  const mutedInstrumentsRef = useRef(mutedInstruments);
  const soloedInstrumentsRef = useRef(soloedInstruments);

  useEffect(() => { volKickRef.current = volKick; }, [volKick]);
  useEffect(() => { volSnareRef.current = volSnare; }, [volSnare]);
  useEffect(() => { volHatRef.current = volHat; }, [volHat]);
  useEffect(() => { volMetronomeRef.current = volMetronome; }, [volMetronome]);
  useEffect(() => { selectedVariationRef.current = selectedVariation; }, [selectedVariation]);
  useEffect(() => { mutedInstrumentsRef.current = mutedInstruments; }, [mutedInstruments]);
  useEffect(() => { soloedInstrumentsRef.current = soloedInstruments; }, [soloedInstruments]);

  const toggleMute = (inst: string) => {
    setMutedInstruments(prev => 
      prev.includes(inst) ? prev.filter(x => x !== inst) : [...prev, inst]
    );
  };
  const toggleSolo = (inst: string) => {
    setSoloedInstruments(prev => 
      prev.includes(inst) ? prev.filter(x => x !== inst) : [...prev, inst]
    );
  };
  const isMuted = (inst: string) => mutedInstruments.includes(inst);
  const isSolo = (inst: string) => soloedInstruments.includes(inst);

  // Keep bpm and style in refs to update scheduler on the fly without closing AudioContext
  const bpmRef = useRef(bpm);
  const selectedStyleRef = useRef(selectedStyle);
  const isPlayingRef = useRef(isPlaying);

  useEffect(() => { bpmRef.current = bpm; }, [bpm]);
  useEffect(() => { selectedStyleRef.current = selectedStyle; }, [selectedStyle]);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);

  const tapTimesRef = useRef<number[]>([]);
  const handleTapTempo = () => {
    const now = performance.now();
    tapTimesRef.current = [...tapTimesRef.current.filter(t => now - t < 2000), now];
    if (tapTimesRef.current.length >= 2) {
      const intervals = [];
      for (let i = 1; i < tapTimesRef.current.length; i++) {
        intervals.push(tapTimesRef.current[i] - tapTimesRef.current[i - 1]);
      }
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const calculatedBpm = Math.round(60000 / avgInterval);
      setBpm(Math.max(40, Math.min(240, calculatedBpm)));
    }
  };

  useEffect(() => {
    if (!isPlaying) {
      if (timerIdRef.current) clearInterval(timerIdRef.current);
      if (progressFrameRef.current) cancelAnimationFrame(progressFrameRef.current);
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
        audioCtxRef.current = null;
      }
      setActiveBeatIndex(null);
      setBarProgress(0);
      return;
    }

    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    audioCtxRef.current = audioCtx;
    
    const masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.8;
    masterGain.connect(audioCtx.destination);
    masterGainRef.current = masterGain;

    const bufferSize = audioCtx.sampleRate * 0.25;
    const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    noiseBufferRef.current = noiseBuffer;

    nextNoteTimeRef.current = audioCtx.currentTime + 0.05;
    barStartAudioTimeRef.current = audioCtx.currentTime + 0.05;
    current16thNoteRef.current = 0;

    const syncBarProgress = () => {
      if (!audioCtxRef.current || !isPlayingRef.current) return;
      const ctx = audioCtxRef.current;
      const secondsPerBeat = 60.0 / bpmRef.current;
      const style = selectedStyleRef.current;
      const beats = style === 'walzer' ? 3 : (style === 'ballad68' ? 6 : 4);
      const secondsPerBar = secondsPerBeat * beats;
      
      const elapsed = ctx.currentTime - barStartAudioTimeRef.current;
      const progressPercent = Math.min(100, Math.max(0, (elapsed / secondsPerBar) * 100));
      setBarProgress(progressPercent);
      progressFrameRef.current = requestAnimationFrame(syncBarProgress);
    };
    progressFrameRef.current = requestAnimationFrame(syncBarProgress);

    const scheduler = () => {
      while (nextNoteTimeRef.current < audioCtx.currentTime + 0.1) {
        scheduleNote(current16thNoteRef.current, nextNoteTimeRef.current, audioCtx, masterGain);
        advanceNote();
      }
    };

    const advanceNote = () => {
      const secondsPerBeat = 60.0 / bpmRef.current;
      const style = selectedStyleRef.current;
      let stepsInBar = 16;
      let stepDuration = secondsPerBeat / 4;
      if (style === 'swing') {
        stepsInBar = 12;
        stepDuration = secondsPerBeat / 3;
      } else if (style === 'walzer') {
        stepsInBar = 12;
        stepDuration = secondsPerBeat / 4;
      } else if (style === 'ballad68') {
        stepsInBar = 12;
        stepDuration = secondsPerBeat / 2;
      }
      nextNoteTimeRef.current += stepDuration;
      current16thNoteRef.current = (current16thNoteRef.current + 1) % stepsInBar;
      
      if (current16thNoteRef.current === 0) {
        barStartAudioTimeRef.current = nextNoteTimeRef.current;
      }
    };

    timerIdRef.current = setInterval(scheduler, 25);
    return () => {
      clearInterval(timerIdRef.current);
      if (progressFrameRef.current) cancelAnimationFrame(progressFrameRef.current);
      if (audioCtxRef.current) audioCtxRef.current.close();
    };
  }, [isPlaying]);

  const scheduleNote = (step: number, time: number, ctx: AudioContext, masterGain: GainNode) => {
    const getEffectiveVolume = (id: string, baseVol: number) => {
      if (soloedInstrumentsRef.current.length > 0 && !soloedInstrumentsRef.current.includes(id)) {
        return 0;
      }
      if (mutedInstrumentsRef.current.includes(id)) {
        return 0;
      }
      return baseVol / 100;
    };

    const kVol = getEffectiveVolume('kick', volKickRef.current);
    const sVol = getEffectiveVolume('snare', volSnareRef.current);
    const hVol = getEffectiveVolume('hat', volHatRef.current);
    const mVol = getEffectiveVolume('click', volMetronomeRef.current);

    const playKick = (volMul = 1.0) => {
      if (kVol <= 0.001) return;
      // Resonant drumhead sine sweep (warm bass body)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(140, time);

      osc.connect(lp);
      lp.connect(gain);
      gain.connect(masterGain);

      osc.frequency.setValueAtTime(110, time);
      osc.frequency.exponentialRampToValueAtTime(46, time + 0.09);

      gain.gain.setValueAtTime(kVol * volMul * 0.9, time);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.16);
      
      osc.start(time);
      osc.stop(time + 0.20);

      // Acoustic leather beater contact slap
      const beater = ctx.createOscillator();
      const beaterGain = ctx.createGain();
      beater.type = 'triangle';
      
      const beaterFilter = ctx.createBiquadFilter();
      beaterFilter.type = 'bandpass';
      beaterFilter.frequency.setValueAtTime(1700, time);
      beaterFilter.Q.setValueAtTime(2.0, time);

      beater.connect(beaterFilter);
      beaterFilter.connect(beaterGain);
      beaterGain.connect(masterGain);

      beater.frequency.setValueAtTime(800, time);
      beater.frequency.exponentialRampToValueAtTime(140, time + 0.008);

      beaterGain.gain.setValueAtTime(kVol * volMul * 0.22, time);
      beaterGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.01);

      beater.start(time);
      beater.stop(time + 0.015);
    };

    const playSnare = (volMul = 1.0) => {
      if (sVol <= 0.001) return;
      if (!noiseBufferRef.current) return;
      
      // Snappy snare wires rattle (filtered noise)
      const noise = ctx.createBufferSource();
      noise.buffer = noiseBufferRef.current;
      
      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.setValueAtTime(2100, time);
      noiseFilter.Q.setValueAtTime(1.4, time);
      
      const noiseHp = ctx.createBiquadFilter();
      noiseHp.type = 'highpass';
      noiseHp.frequency.setValueAtTime(950, time);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(sVol * 0.36 * volMul, time);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.15);
      
      noise.connect(noiseFilter);
      noiseFilter.connect(noiseHp);
      noiseHp.connect(noiseGain);
      noiseGain.connect(masterGain);
      
      noise.start(time);
      noise.stop(time + 0.18);

      // Acoustic drumhead shell resonance tone
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(175, time);
      osc1.frequency.exponentialRampToValueAtTime(125, time + 0.08);

      gain1.gain.setValueAtTime(sVol * 0.40 * volMul, time);
      gain1.gain.exponentialRampToValueAtTime(0.0001, time + 0.09);
      
      osc1.connect(gain1);
      gain1.connect(masterGain);
      osc1.start(time);
      osc1.stop(time + 0.11);

      // Stick impact transient
      const rim = ctx.createOscillator();
      const rimGain = ctx.createGain();
      rim.type = 'triangle';
      rim.frequency.setValueAtTime(950, time);
      rim.frequency.exponentialRampToValueAtTime(350, time + 0.01);
      
      rimGain.gain.setValueAtTime(sVol * 0.18 * volMul, time);
      rimGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.014);
      
      rim.connect(rimGain);
      rimGain.connect(masterGain);
      rim.start(time);
      rim.stop(time + 0.018);
    };

    const playRimClick = (volMul = 1.0) => {
      if (sVol <= 0.001) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.setValueAtTime(450, time);

      osc.connect(hp);
      hp.connect(gain);
      gain.connect(masterGain);

      osc.frequency.setValueAtTime(1100, time);
      osc.frequency.exponentialRampToValueAtTime(580, time + 0.012);

      gain.gain.setValueAtTime(sVol * 0.38 * volMul, time);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.016);
      osc.start(time);
      osc.stop(time + 0.02);
    };

    const playHat = (isOpen = false, volMul = 1.0) => {
      if (hVol <= 0.001) return;
      if (!noiseBufferRef.current) return;
      
      const noise = ctx.createBufferSource();
      noise.buffer = noiseBufferRef.current;
      
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.setValueAtTime(7000, time);

      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(11500, time);
      bp.Q.setValueAtTime(1.8, time);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(hVol * (isOpen ? 0.14 : 0.09) * volMul, time);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + (isOpen ? 0.20 : 0.035));

      noise.connect(hp);
      hp.connect(bp);
      bp.connect(gain);
      gain.connect(masterGain);
      
      noise.start(time);
      noise.stop(time + (isOpen ? 0.22 : 0.05));
    };

    const playClick = (isAccent = false) => {
      if (mVol <= 0.001) return;
      
      // Resonant woodblock body with physical decay and pitch bend
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      
      // Pitch drop simulating physical strike impact bending
      osc.frequency.setValueAtTime(isAccent ? 1550 : 1050, time);
      osc.frequency.exponentialRampToValueAtTime(isAccent ? 650 : 450, time + 0.012);
      
      // Bandpass filter to simulate wood block hollow enclosure resonance
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(isAccent ? 1200 : 850, time);
      bp.Q.setValueAtTime(3.8, time);

      osc.connect(bp);
      bp.connect(gain);
      gain.connect(masterGain);

      gain.gain.setValueAtTime(mVol * 0.75, time);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.028);
      osc.start(time);
      osc.stop(time + 0.045);

      // Mallet click transient (wood strike sound)
      if (noiseBufferRef.current) {
        const noise = ctx.createBufferSource();
        noise.buffer = noiseBufferRef.current;
        
        const noiseFilter = ctx.createBiquadFilter();
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.setValueAtTime(3200, time);
        noiseFilter.Q.setValueAtTime(4.0, time);

        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(mVol * 0.42, time);
        noiseGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.006);

        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(masterGain);

        noise.start(time);
        noise.stop(time + 0.01);
      }
    };

    const triggerVisualBeat = (beatIdx: number) => {
      ctx.resume().then(() => {
        if (!isPlayingRef.current) return;
        const msDiff = Math.max(0, (time - ctx.currentTime) * 1000);
        setTimeout(() => {
          if (isPlayingRef.current) {
            setActiveBeatIndex(beatIdx);
          }
        }, msDiff);
      });
    };

    const isSwing = selectedStyleRef.current === 'swing';
    const variant = selectedVariationRef.current; // 'A', 'B' or 'C'

    if (selectedStyleRef.current === 'metronome') {
      const beatIdx = Math.floor(step / 4);
      if (variant === 'A') {
        // V1: Classic quarter-note clicks
        if (step % 4 === 0) {
          playClick(beatIdx === 0);
          triggerVisualBeat(beatIdx);
        }
      } else if (variant === 'B') {
        // V2: Eighth-note clicks (pedagogical subdivision)
        if (step % 2 === 0) {
          playClick(step === 0);
          if (step % 4 === 0) triggerVisualBeat(beatIdx);
        }
      } else {
        // V3: 16th-note clicks (high resolution micro-timing)
        playClick(step === 0);
        if (step % 4 === 0) triggerVisualBeat(beatIdx);
      }
    } else if (selectedStyleRef.current === 'rock') {
      if (variant === 'A') {
        // V1: Solid basic Pop/Rock beat
        if (step === 0 || step === 8 || step === 10) playKick(1.0);
        if (step === 4 || step === 12) playSnare(1.0);
        if (step % 2 === 0) playHat(false, step % 4 === 0 ? 1.0 : 0.62);
      } else if (variant === 'B') {
        // V2: Groove+ (Syncopated kick upbeats)
        if (step === 0 || step === 6 || step === 8 || step === 10 || step === 14) playKick(1.0);
        if (step === 4 || step === 12) playSnare(1.0);
        if (step % 2 === 0) playHat(false, step % 4 === 0 ? 1.0 : 0.65);
      } else {
        // V3: Complex (Snare ghost notes + ride feel)
        if (step === 0 || step === 3 || step === 8 || step === 10 || step === 11) playKick(1.0);
        if (step === 4 || step === 12) playSnare(1.0);
        else if (step === 7 || step === 15) playSnare(0.25); // Ghost notes
        if (step % 2 === 0) playHat(false, step % 4 === 0 ? 1.05 : 0.72);
        else if (step === 11) playHat(false, 0.45);
      }
      if (step % 4 === 0) triggerVisualBeat(Math.floor(step / 4));
    } else if (selectedStyleRef.current === 'hiphop') {
      if (variant === 'A') {
        // V1: Classic laid-back pocket
        if (step === 0) playKick(1.3);
        else if (step === 3 || step === 10) playKick(0.9);
        if (step === 4 || step === 12) playSnare(1.1);
        else if (step === 7 || step === 15) playSnare(0.22);
        if (step % 2 === 0) playHat(step === 14, step % 4 === 0 ? 0.9 : 0.55);
      } else if (variant === 'B') {
        // V2: Groove+ (Boom-Bap double kick)
        if (step === 0 || step === 2 || step === 8 || step === 10) playKick(1.2);
        if (step === 4 || step === 12) playSnare(1.1);
        else if (step === 15) playSnare(0.25);
        if (step % 2 === 0) playHat(false, step % 4 === 0 ? 0.95 : 0.62);
      } else {
        // V3: Complex (Trap hat subdivisions/rolls)
        if (step === 0 || step === 8 || step === 11) playKick(1.3);
        if (step === 4 || step === 12) playSnare(1.15);
        // Hi-Hat roll on step 14 & 15
        if (step === 14 || step === 15) {
          playHat(false, 0.75);
        } else if (step % 2 === 0) {
          playHat(false, step % 4 === 0 ? 1.0 : 0.6);
        }
      }
      if (step % 4 === 0) triggerVisualBeat(Math.floor(step / 4));
    } else if (isSwing) {
      if (variant === 'A') {
        // V1: Classic jazz swing ride cymbal with feathered kick
        if (step === 0 || step === 3 || step === 6 || step === 9) playKick(0.32);
        if (step === 2) playRimClick(0.45);
        else if (step === 8) playSnare(0.4);
        if (step === 0 || step === 3 || step === 6 || step === 9) playHat(false, 1.0);
        else if (step === 2 || step === 5 || step === 8 || step === 11) playHat(true, 0.55);
        if (step === 3 || step === 9) playRimClick(0.25);
      } else if (variant === 'B') {
        // V2: Groove+ (Comping snare hits)
        if (step === 0 || step === 6) playKick(0.35);
        if (step === 2 || step === 5 || step === 11) playSnare(0.5); // active snare comping
        if (step === 0 || step === 3 || step === 6 || step === 9) playHat(false, 1.05);
        else if (step === 2 || step === 5 || step === 8 || step === 11) playHat(true, 0.62);
        if (step === 3 || step === 9) playRimClick(0.3);
      } else {
        // V3: Complex (Swing triplets fill)
        if (step === 0 || step === 6) playKick(0.5);
        if (step === 9 || step === 10 || step === 11) {
          playSnare(0.7); // crescendo snare fill
        } else if (step === 2 || step === 5) {
          playSnare(0.32);
        }
        if (step === 0 || step === 3 || step === 6 || step === 9) playHat(false, 1.0);
      }
      if (step % 3 === 0) triggerVisualBeat(Math.floor(step / 3));
    } else if (selectedStyleRef.current === 'latin') {
      if (variant === 'A') {
        // V1: Classic Bossa double kick & rim clave
        if (step === 0 || step === 3 || step === 8 || step === 11) playKick(0.95);
        if (step === 0 || step === 3 || step === 6 || step === 10 || step === 12) playRimClick(1.0);
        if (step % 2 === 0) playHat(false, step % 4 === 0 ? 0.8 : 0.48);
      } else if (variant === 'B') {
        // V2: Groove+ (High-energy Samba surdo sweep)
        if (step === 0 || step === 2 || step === 4 || step === 6 || step === 8 || step === 10 || step === 12 || step === 14) {
          playKick(step % 4 === 2 ? 1.15 : 0.6); // typical surdo groove
        }
        if (step === 0 || step === 4 || step === 8 || step === 12) playRimClick(0.95);
        if (step % 2 === 0) playHat(false, 0.75);
      } else {
        // V3: Complex (Cascara clave & open hats)
        if (step === 0 || step === 3 || step === 8 || step === 11) playKick(1.0);
        // Cascara rimshot pattern
        if (step === 0 || step === 2 || step === 3 || step === 5 || step === 6 || step === 8 || step === 10 || step === 11 || step === 13 || step === 14) {
          playRimClick(0.85);
        }
        if (step % 4 === 2) playHat(true, 0.7); // open hat barks
      }
      if (step % 4 === 0) triggerVisualBeat(Math.floor(step / 4));
    } else if (selectedStyleRef.current === 'funk') {
      if (variant === 'A') {
        // V1: Funky Breakbeat with ghost snares
        if (step === 0 || step === 6 || step === 10 || step === 11) playKick(1.15);
        if (step === 4 || step === 12) playSnare(1.1);
        else if (step === 7 || step === 13 || step === 15) playSnare(0.28);
        if (step % 2 === 0) playHat(step === 6 || step === 14, (step === 6 || step === 14) ? 1.0 : (step % 4 === 0 ? 0.95 : 0.55));
        else if (step === 3 || step === 11) playHat(false, 0.35);
      } else if (variant === 'B') {
        // V2: Groove+ (Linear Funk - tight groove, no simultaneous strikes)
        if (step === 0 || step === 6 || step === 10) playKick(1.2);
        else if (step === 4 || step === 12 || step === 14) playSnare(1.15);
        else if (step === 2 || step === 8 || step === 15) playHat(false, 0.85);
      } else {
        // V3: Complex (Funk drum fill)
        if (step === 0 || step === 6 || step === 11) playKick(1.2);
        if (step === 4 || step === 12) playSnare(1.1);
        else if (step === 13 || step === 14 || step === 15) playSnare(0.9); // rapid fill
        if (step % 2 === 0) playHat(false, 0.8);
      }
      if (step % 4 === 0) triggerVisualBeat(Math.floor(step / 4));
    } else if (selectedStyleRef.current === 'reggae') {
      if (variant === 'A') {
        // V1: Classic One-Drop with guide click
        if (step === 8) { playKick(1.2); playSnare(1.05); }
        if (step === 4 || step === 12) playRimClick(0.9);
        if (step === 0) playRimClick(0.22); // pedagogical guide
        if (step % 2 === 0) playHat(false, (step === 2 || step === 6 || step === 10 || step === 14) ? 1.0 : 0.58);
      } else if (variant === 'B') {
        // V2: Groove+ (Steppers style - four on the floor kick)
        if (step === 0 || step === 4 || step === 8 || step === 12) playKick(1.15);
        if (step === 8) playSnare(1.05);
        if (step === 4 || step === 12) playRimClick(0.85);
        if (step % 2 === 0) playHat(false, 0.88);
      } else {
        // V3: Complex (Rocksteady with rimshot fill)
        if (step === 8) playKick(1.2);
        if (step === 8 || step === 14 || step === 15) playSnare(1.0);
        if (step === 4 || step === 12) playRimClick(0.9);
        if (step % 2 === 0) playHat(false, 0.8);
      }
      if (step % 4 === 0) triggerVisualBeat(Math.floor(step / 4));
    } else if (selectedStyleRef.current === 'walzer') {
      if (variant === 'A') {
        // V1: Classic Waltz boom-chick-chick
        if (step === 0) playKick(1.0);
        if (step === 4 || step === 8) { playRimClick(0.85); playSnare(0.22); }
        if (step % 2 === 0) playHat(false, step === 0 ? 0.95 : (step === 4 || step === 8 ? 0.72 : 0.45));
      } else if (variant === 'B') {
        // V2: Groove+ (Syncopated Jazz Waltz)
        if (step === 0 || step === 6) playKick(0.9);
        if (step === 4 || step === 8) playSnare(0.75);
        if (step === 0 || step === 3 || step === 4 || step === 7 || step === 8 || step === 11) playHat(false, 0.8);
      } else {
        // V3: Complex (Waltz snare fill)
        if (step === 0) playKick(1.0);
        if (step === 4) playSnare(0.7);
        if (step === 8 || step === 9 || step === 10 || step === 11) playSnare(0.8); // 3rd beat roll
        if (step % 2 === 0) playHat(false, 0.8);
      }
      if (step % 4 === 0) triggerVisualBeat(Math.floor(step / 4));
    } else if (selectedStyleRef.current === 'ballad68') {
      if (variant === 'A') {
        // V1: Slow 6/8 Triplet Ballad
        if (step === 0) playKick(1.2);
        else if (step === 5) playKick(0.6);
        if (step === 6) playSnare(1.1);
        if (step % 2 === 0) playHat(false, (step === 0 || step === 6) ? 1.0 : 0.6);
      } else if (variant === 'B') {
        // V2: Groove+ (Heartbeat Ballad)
        if (step === 0 || step === 4 || step === 5) playKick(1.1);
        if (step === 6) playSnare(1.15);
        else if (step === 11) playRimClick(0.5);
        if (step % 2 === 0) playHat(false, 0.82);
      } else {
        // V3: Complex (Ballad fill on 10/11)
        if (step === 0 || step === 5) playKick(1.2);
        if (step === 6) playSnare(1.1);
        else if (step === 10 || step === 11) playSnare(0.85); // roll
        if (step % 2 === 0) playHat(false, 0.8);
      }
      if (step % 2 === 0) triggerVisualBeat(Math.floor(step / 2));
    } else if (selectedStyleRef.current === 'disco') {
      if (variant === 'A') {
        // V1: Classic Four-on-the-Floor
        if (step === 0 || step === 4 || step === 8 || step === 12) playKick(1.15);
        if (step === 4 || step === 12) playSnare(1.0);
        if (step % 2 === 0) playHat(step === 2 || step === 6 || step === 10 || step === 14, (step === 2 || step === 6 || step === 10 || step === 14) ? 1.05 : 0.5);
      } else if (variant === 'B') {
        // V2: Groove+ (Syncopated Hi-hat opening)
        if (step === 0 || step === 4 || step === 8 || step === 12) playKick(1.15);
        if (step === 4 || step === 12) playSnare(1.0);
        // Hi-Hat bark on all offbeat eighths (2, 6, 10, 14 open, then closed on 3, 7, 11, 15)
        if (step === 2 || step === 6 || step === 10 || step === 14) {
          playHat(true, 1.1);
        } else if (step === 3 || step === 7 || step === 11 || step === 15) {
          playHat(false, 0.5);
        } else if (step % 4 === 0) {
          playHat(false, 0.85);
        }
      } else {
        // V3: Complex (Disco fill)
        if (step === 0 || step === 3 || step === 4 || step === 8 || step === 11 || step === 12) playKick(1.1);
        if (step === 4 || step === 12) playSnare(1.1);
        else if (step === 15) playSnare(0.8);
        if (step % 2 === 0) playHat(false, 0.8);
      }
      if (step % 4 === 0) triggerVisualBeat(Math.floor(step / 4));
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      flex: 1,
      background: 'linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%)',
      borderTop: '1px solid #e2e8f0',
      borderRadius: useNotebookLayout ? '0 0 24px 24px' : '24px',
      minHeight: '520px',
      color: '#1d1d1f',
      padding: '32px 28px',
      gap: '24px',
      width: '100%',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
    }}>
      
      <div style={{ display: 'flex', gap: '28px', flex: 1, width: '100%' }} className="flex-col lg:flex-row">
        {/* Left Column: Tempo / Tap / Visual Metronome */}
        <div style={{
          flex: '1 1 0%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          background: '#ffffff',
          borderRadius: '24px',
          border: '1px solid #f1f3f5',
          padding: '24px',
          justifyContent: 'space-between',
          gap: '20px'
        }}>
          <div style={{ width: '100%', textAlign: 'center' }}>
            <span style={{ fontSize: '0.62rem', color: '#86868b', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              ÜBE-METRONOM
            </span>
          </div>

          {/* Mechanical Metronome Container */}
          <div style={{ position: 'relative', width: '100%', display: 'flex', justifyContent: 'center', margin: '4px 0' }}>
            <style>{`
              @keyframes swing-anim {
                0% { transform: rotate(-12deg); }
                100% { transform: rotate(12deg); }
              }
              @keyframes rotate-key {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>

            <svg width="180" height="215" viewBox="0 0 180 215" style={{ overflow: 'visible' }}>
              <defs>
                {/* Walnut Wood Gradient */}
                <linearGradient id="walnutWood" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#6c472c" />
                  <stop offset="40%" stopColor="#53331b" />
                  <stop offset="85%" stopColor="#2f1d0f" />
                  <stop offset="100%" stopColor="#1c1109" />
                </linearGradient>
                {/* Wood Shadow Overlay */}
                <radialGradient id="woodGlow" cx="50%" cy="40%" r="60%">
                  <stop offset="0%" stopColor="#ffe5d9" stopOpacity="0.08" />
                  <stop offset="100%" stopColor="#000000" stopOpacity="0.65" />
                </radialGradient>
                {/* Hollow Interior Shadow */}
                <linearGradient id="interiorChamber" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#19110d" />
                  <stop offset="100%" stopColor="#060403" />
                </linearGradient>
                {/* Ivory scale Plate */}
                <linearGradient id="ivoryPlate" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#fbf9f4" />
                  <stop offset="100%" stopColor="#e5decb" />
                </linearGradient>
                {/* Steel Pendulum Rod */}
                <linearGradient id="steelRod" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#f3f4f6" />
                  <stop offset="50%" stopColor="#9ca3af" />
                  <stop offset="100%" stopColor="#d1d5db" />
                </linearGradient>
                {/* Brass Gold Gradient */}
                <linearGradient id="brassGold" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ffe066" />
                  <stop offset="35%" stopColor="#e5c142" />
                  <stop offset="75%" stopColor="#b58e17" />
                  <stop offset="100%" stopColor="#7a5b08" />
                </linearGradient>
                {/* Soft Casing Drop Shadow */}
                <filter id="casingShadow" x="-20%" y="-10%" width="140%" height="130%">
                  <feDropShadow dx="0" dy="8" stdDeviation="6" floodColor="#000000" floodOpacity="0.32" />
                </filter>
              </defs>

              {/* Side Winding Key (Connected cleanly to right casing edge at x=138, static 3D angle) */}
              <g style={{
                transformOrigin: '138px 145px',
                transform: 'rotate(25deg)',
                transition: 'transform 0.2s ease-out'
              }}>
                <rect x="136" y="142" width="8" height="6" fill="url(#brassGold)" stroke="#7a5b08" strokeWidth="0.8" rx="1" />
                <path d="M 144 145 C 144 138, 158 138, 158 145 C 158 152, 144 152, 144 145 Z" fill="none" stroke="url(#brassGold)" strokeWidth="2.5" />
                <circle cx="144" cy="145" r="1.8" fill="#5a3d00" />
              </g>

              {/* 3D Pyramid Casing (Walnut Wood) */}
              <path 
                d="M 90 12 L 24 195 C 24 201, 30 205, 38 205 L 142 205 C 150 205, 156 201, 156 195 Z" 
                fill="url(#walnutWood)" 
                stroke="#2f1d0f" 
                strokeWidth="2.5"
                filter="url(#casingShadow)"
              />
              <path 
                d="M 90 12 L 24 195 C 24 201, 30 205, 38 205 L 142 205 C 150 205, 156 201, 156 195 Z" 
                fill="url(#woodGlow)" 
                style={{ mixBlendMode: 'multiply' }}
              />

              {/* Golden Casing Trim Line */}
              <path 
                d="M 90 18 L 29 191 C 32 195, 36 197, 42 197 L 138 197 C 144 197, 148 195, 151 191 Z" 
                fill="none" 
                stroke="#e5c142" 
                strokeWidth="1.2" 
                opacity="0.32"
              />

              {/* Hollow Interior Chamber (Trapezoid for wider text space at top) */}
              <path 
                d="M 78 35 L 102 35 L 138 188 L 42 188 Z" 
                fill="url(#interiorChamber)" 
                stroke="#19110d" 
                strokeWidth="1.5"
              />

              {/* Ivory scale Plate (Trapezoid fitting scale markings perfectly) */}
              <path 
                d="M 80 40 L 100 40 L 134 184 L 46 184 Z" 
                fill="url(#ivoryPlate)" 
                stroke="#b5ad9e"
                strokeWidth="0.5"
              />

              {/* Detailed Scale Lines and Tempo Markings (Left Column: BPM, Right Column: Term) */}
              <g fill="#1d1d1f" opacity="0.65" fontFamily="Georgia, serif" fontSize="5.5" fontWeight="bold">
                {/* Center axis line */}
                <line x1="90" y1="45" x2="90" y2="175" stroke="#1d1d1f" strokeWidth="0.8" opacity="0.25" />

                {/* 40 Largo */}
                <line x1="82" y1="65" x2="98" y2="65" stroke="#1d1d1f" strokeWidth="0.6" opacity="0.3" />
                <text x="76" y="67" textAnchor="end">40</text>
                <text x="104" y="67" textAnchor="start">Largo</text>

                {/* 80 Adagio */}
                <line x1="80" y1="83" x2="100" y2="83" stroke="#1d1d1f" strokeWidth="0.6" opacity="0.3" />
                <text x="74" y="85" textAnchor="end">80</text>
                <text x="106" y="85" textAnchor="start">Adagio</text>

                {/* 120 Andante */}
                <line x1="78" y1="101" x2="102" y2="101" stroke="#1d1d1f" strokeWidth="0.6" opacity="0.3" />
                <text x="72" y="103" textAnchor="end">120</text>
                <text x="108" y="103" textAnchor="start">Andante</text>

                {/* 160 Allegro */}
                <line x1="76" y1="119" x2="104" y2="119" stroke="#1d1d1f" strokeWidth="0.6" opacity="0.3" />
                <text x="70" y="121" textAnchor="end">160</text>
                <text x="110" y="121" textAnchor="start">Allegro</text>

                {/* 200 Presto */}
                <line x1="74" y1="137" x2="106" y2="137" stroke="#1d1d1f" strokeWidth="0.6" opacity="0.3" />
                <text x="68" y="139" textAnchor="end">200</text>
                <text x="112" y="139" textAnchor="start">Presto</text>

                {/* 240 Prestissimo */}
                <line x1="72" y1="155" x2="108" y2="155" stroke="#1d1d1f" strokeWidth="0.6" opacity="0.3" />
                <text x="66" y="157" textAnchor="end">240</text>
                <text x="114" y="157" textAnchor="start">Prestiss</text>
              </g>

              {/* Pendulum Shadow Group (Swings behind the rod for massive 3D depth) */}
              <g style={{
                transformOrigin: '87px 180px',
                transform: isPlaying ? 'none' : 'rotate(0deg)',
                animation: isPlaying ? `swing-anim ${60 / bpm}s ease-in-out infinite alternate` : 'none',
                transition: isPlaying ? 'none' : 'transform 0.3s ease-out',
                opacity: 0.22
              }}>
                <line x1="87" y1="180" x2="87" y2="40" stroke="#000000" strokeWidth="3.5" strokeLinecap="round" />
                <rect 
                  x="77" 
                  y={40 + ((240 - bpm) / (240 - 40)) * 115} 
                  width="20" 
                  height="15" 
                  rx="2"
                  fill="#000000" 
                />
              </g>

              {/* Pendulum Group (rotating from pivot point) */}
              <g style={{
                transformOrigin: '90px 180px',
                transform: isPlaying ? 'none' : 'rotate(0deg)',
                animation: isPlaying ? `swing-anim ${60 / bpm}s ease-in-out infinite alternate` : 'none',
                transition: isPlaying ? 'none' : 'transform 0.3s ease-out'
              }}>
                {/* Steel Pendulum Rod */}
                <line x1="90" y1="180" x2="90" y2="40" stroke="url(#steelRod)" strokeWidth="3" strokeLinecap="round" />
                
                {/* 3D Brass weight */}
                <rect 
                  x="80" 
                  y={40 + ((240 - bpm) / (240 - 40)) * 115} 
                  width="20" 
                  height="15" 
                  rx="2"
                  fill="url(#brassGold)" 
                  stroke="#856404"
                  strokeWidth="1.2"
                  style={{ transition: 'y 0.25s cubic-bezier(0.25, 0.8, 0.25, 1)' }}
                />
                {/* Center screw detail on weight */}
                <circle 
                  cx="90" 
                  cy={40 + ((240 - bpm) / (240 - 40)) * 115 + 7.5} 
                  r="2.5" 
                  fill="url(#brassGold)" 
                  stroke="#5a3d00" 
                  strokeWidth="0.8"
                  style={{ transition: 'cy 0.25s cubic-bezier(0.25, 0.8, 0.25, 1)' }}
                />
              </g>

              {/* Brass Lager / Pivot Cap */}
              <circle cx="90" cy="180" r="7.5" fill="url(#brassGold)" stroke="#5a3d00" strokeWidth="1.5" />
              <circle cx="90" cy="180" r="2.5" fill="#423000" />
            </svg>
          </div>

          {/* Visual Beat Indicator Dots */}
          <div style={{ display: 'flex', gap: '14px', margin: '5px 0' }}>
            {Array.from({ length: getBeatsPerBar(selectedStyle) }).map((_, idx) => {
              const isActive = activeBeatIndex === idx;
              return (
                <div
                  key={idx}
                  style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    background: isActive 
                      ? (idx === 0 ? '#ea4335' : '#34a853') 
                      : '#e5e5e7',
                    boxShadow: isActive 
                      ? `0 0 8px ${idx === 0 ? 'rgba(234, 67, 53, 0.5)' : 'rgba(52, 168, 83, 0.5)'}` 
                      : 'none',
                    transition: 'all 0.08s ease'
                  }}
                />
              );
            })}
          </div>

          {/* Takt-Fortschritts-Sweep-Bar */}
          <div style={{
            width: '160px',
            height: '5px',
            background: '#e5e5e7',
            borderRadius: '10px',
            overflow: 'hidden',
            position: 'relative',
            marginTop: '-2px',
            marginBottom: '4px'
          }}>
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              height: '100%',
              width: `${barProgress}%`,
              background: 'linear-gradient(90deg, #34a853 0%, #2ecc71 100%)',
              boxShadow: '0 0 6px rgba(52, 168, 83, 0.3)',
              borderRadius: '10px',
              transition: isPlaying ? 'none' : 'width 0.1s ease-out'
            }} />
          </div>

          {/* Large Tempo Display */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ fontSize: '3.6rem', fontWeight: 900, color: '#1d1d1f', lineHeight: 1.1, fontFamily: 'SF Mono, monospace' }}>
              {bpm}
            </span>
            <span style={{ fontSize: '0.68rem', color: '#86868b', fontWeight: 700 }}>
              BEATS PER MINUTE
            </span>
          </div>

          {/* Plus / Minus Tempo Controls */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => setBpm(prev => Math.max(40, prev - 5))}
              className="tactile-btn"
              style={{
                width: '44px',
                height: '38px',
                borderRadius: '10px',
                background: '#f5f5f7',
                border: 'none',
                color: '#1d1d1f',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              -5
            </button>
            <button
              type="button"
              onClick={() => setBpm(prev => Math.max(40, prev - 1))}
              className="tactile-btn"
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: '#f5f5f7',
                border: 'none',
                color: '#1d1d1f',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              -1
            </button>
            <button
              type="button"
              onClick={() => setBpm(prev => Math.min(240, prev + 1))}
              className="tactile-btn"
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: '#f5f5f7',
                border: 'none',
                color: '#1d1d1f',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              +1
            </button>
            <button
              type="button"
              onClick={() => setBpm(prev => Math.min(240, prev + 5))}
              className="tactile-btn"
              style={{
                width: '44px',
                height: '38px',
                borderRadius: '10px',
                background: '#f5f5f7',
                border: 'none',
                color: '#1d1d1f',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              +5
            </button>
          </div>

          <button
            type="button"
            onClick={handleTapTempo}
            className="tactile-btn"
            style={{
              width: '100%',
              background: '#f5f5f7',
              color: '#1d1d1f',
              border: 'none',
              borderRadius: '12px',
              padding: '12px',
              fontSize: '0.74rem',
              fontWeight: 800,
              cursor: 'pointer',
              textTransform: 'uppercase',
              letterSpacing: '0.04em'
            }}
          >
            TAP TEMPO
          </button>

          {/* Play/Pause button */}
          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            className="tactile-btn"
            style={{
              width: '100%',
              background: isPlaying ? '#ea4335' : '#34a853',
              color: '#ffffff',
              border: 'none',
              borderRadius: '12px',
              padding: '12px',
              fontSize: '0.78rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.04em'
            }}
          >
            {isPlaying ? (
              <>
                <Square size={12} fill="currentColor" />
                <span>Stoppen</span>
              </>
            ) : (
              <>
                <Play size={12} fill="currentColor" />
                <span>Starten</span>
              </>
            )}
          </button>
        </div>

        {/* Right Column: Drum Beat Generator & Mixer */}
        <div style={{
          flex: '1.2 1 0%',
          display: 'flex',
          flexDirection: 'column',
          background: '#ffffff',
          borderRadius: '24px',
          border: '1px solid #f1f3f5',
          padding: '24px',
          gap: '20px'
        }}>
          <div>
            <span style={{ fontSize: '0.62rem', color: '#86868b', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              BEAT GENERATOR
            </span>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#1d1d1f', margin: '4px 0 0 0' }}>Begleit-Rhythmen</h3>
          </div>

          {/* Rhythms Selector Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '8px'
          }}>
            {[
              { id: 'metronome', label: 'Metronom Klick' },
              { id: 'rock', label: 'Rock & Pop Groove' },
              { id: 'hiphop', label: 'Hip-Hop Pocket' },
              { id: 'swing', label: 'Jazz Swing' },
              { id: 'latin', label: 'Latin Bossa' },
              { id: 'funk', label: 'Funk Break' },
              { id: 'reggae', label: 'Reggae One-Drop' },
              { id: 'walzer', label: 'Walzer (3/4 Takt)' },
              { id: 'ballad68', label: '6/8 Ballade' },
              { id: 'disco', label: 'Disco (4-on-the-Floor)' }
            ].map((styleOpt) => {
              const isSelected = selectedStyle === styleOpt.id;
              return (
                <button
                  key={styleOpt.id}
                  type="button"
                  onClick={() => setSelectedStyle(styleOpt.id as any)}
                  className="tactile-btn"
                  style={{
                    background: isSelected ? '#34a853' : '#f5f5f7',
                    color: isSelected ? '#ffffff' : '#1d1d1f',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '10px 14px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  {styleOpt.label}
                </button>
              );
            })}
          </div>

          {/* Beat Variations Selector */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            marginTop: '8px',
            borderTop: '1px solid #f1f3f5',
            paddingTop: '14px'
          }}>
            <span style={{ fontSize: '0.58rem', color: '#86868b', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Groove-Variationen
            </span>
            <div style={{
              display: 'flex',
              gap: '6px'
            }}>
              {[
                { id: 'A', label: 'Variante A: Standard' },
                { id: 'B', label: 'Variante B: Groove+' },
                { id: 'C', label: 'Variante C: Fill / Komplex' }
              ].map((varOpt) => {
                const isSelected = selectedVariation === varOpt.id;
                return (
                  <button
                    key={varOpt.id}
                    type="button"
                    onClick={() => setSelectedVariation(varOpt.id as any)}
                    className="tactile-btn"
                    style={{
                      flex: 1,
                      background: isSelected ? '#eab308' : '#f5f5f7',
                      color: isSelected ? '#ffffff' : '#1d1d1f',
                      border: 'none',
                      borderRadius: '10px',
                      padding: '8px 4px',
                      fontSize: '0.66rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.2s ease-in-out',
                      boxShadow: isSelected ? '0 2px 8px rgba(234, 179, 8, 0.3)' : 'none'
                    }}
                  >
                    {varOpt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mixer Channel Strips */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            marginTop: '10px',
            borderTop: '1px solid #f1f3f5',
            paddingTop: '16px'
          }}>
            <span style={{ fontSize: '0.58rem', color: '#86868b', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              INSTRUMENTEN MIXER
            </span>

            {selectedStyle === 'metronome' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#1d1d1f' }}>Klick-Lautstärke</span>
                  <span style={{ fontSize: '0.62rem', color: '#86868b', fontFamily: 'SF Mono, monospace' }}>{volMetronome}%</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      type="button"
                      onClick={() => toggleMute('click')}
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '6px',
                        border: 'none',
                        fontSize: '0.62rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        background: isMuted('click') ? '#ea4335' : '#f5f5f7',
                        color: isMuted('click') ? '#ffffff' : '#5f6368',
                        transition: 'all 0.15s ease-in-out'
                      }}
                    >
                      M
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleSolo('click')}
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '6px',
                        border: 'none',
                        fontSize: '0.62rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        background: isSolo('click') ? '#eab308' : '#f5f5f7',
                        color: isSolo('click') ? '#ffffff' : '#5f6368',
                        transition: 'all 0.15s ease-in-out'
                      }}
                    >
                      S
                    </button>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={volMetronome}
                    onChange={(e) => setVolMetronome(Number(e.target.value))}
                    className="groovelab-fader"
                    style={{ flex: 1 }}
                  />
                </div>
              </div>
            ) : (
              <>
                {/* Bass Drum (Kick) Channel */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#1d1d1f' }}>Bass Drum (Kick)</span>
                    <span style={{ fontSize: '0.62rem', color: '#86868b', fontFamily: 'SF Mono, monospace' }}>{volKick}%</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        type="button"
                        onClick={() => toggleMute('kick')}
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '6px',
                          border: 'none',
                          fontSize: '0.62rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          background: isMuted('kick') ? '#ea4335' : '#f5f5f7',
                          color: isMuted('kick') ? '#ffffff' : '#5f6368',
                          transition: 'all 0.15s ease-in-out'
                        }}
                      >
                        M
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleSolo('kick')}
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '6px',
                          border: 'none',
                          fontSize: '0.62rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          background: isSolo('kick') ? '#eab308' : '#f5f5f7',
                          color: isSolo('kick') ? '#ffffff' : '#5f6368',
                          transition: 'all 0.15s ease-in-out'
                        }}
                      >
                        S
                      </button>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={volKick}
                      onChange={(e) => setVolKick(Number(e.target.value))}
                      className="groovelab-fader"
                      style={{ flex: 1 }}
                    />
                  </div>
                </div>

                {/* Snare Drum Channel */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#1d1d1f' }}>Snare Drum</span>
                    <span style={{ fontSize: '0.62rem', color: '#86868b', fontFamily: 'SF Mono, monospace' }}>{volSnare}%</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        type="button"
                        onClick={() => toggleMute('snare')}
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '6px',
                          border: 'none',
                          fontSize: '0.62rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          background: isMuted('snare') ? '#ea4335' : '#f5f5f7',
                          color: isMuted('snare') ? '#ffffff' : '#5f6368',
                          transition: 'all 0.15s ease-in-out'
                        }}
                      >
                        M
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleSolo('snare')}
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '6px',
                          border: 'none',
                          fontSize: '0.62rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          background: isSolo('snare') ? '#eab308' : '#f5f5f7',
                          color: isSolo('snare') ? '#ffffff' : '#5f6368',
                          transition: 'all 0.15s ease-in-out'
                        }}
                      >
                        S
                      </button>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={volSnare}
                      onChange={(e) => setVolSnare(Number(e.target.value))}
                      className="groovelab-fader"
                      style={{ flex: 1 }}
                    />
                  </div>
                </div>

                {/* Hi-Hat Channel */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#1d1d1f' }}>Hi-Hat</span>
                    <span style={{ fontSize: '0.62rem', color: '#86868b', fontFamily: 'SF Mono, monospace' }}>{volHat}%</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        type="button"
                        onClick={() => toggleMute('hat')}
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '6px',
                          border: 'none',
                          fontSize: '0.62rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          background: isMuted('hat') ? '#ea4335' : '#f5f5f7',
                          color: isMuted('hat') ? '#ffffff' : '#5f6368',
                          transition: 'all 0.15s ease-in-out'
                        }}
                      >
                        M
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleSolo('hat')}
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '6px',
                          border: 'none',
                          fontSize: '0.62rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          background: isSolo('hat') ? '#eab308' : '#f5f5f7',
                          color: isSolo('hat') ? '#ffffff' : '#5f6368',
                          transition: 'all 0.15s ease-in-out'
                        }}
                      >
                        S
                      </button>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={volHat}
                      onChange={(e) => setVolHat(Number(e.target.value))}
                      className="groovelab-fader"
                      style={{ flex: 1 }}
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

