/**
 * 🏛️ Campus-Groovelab Tagesplan Homework Fahrplan Modal (0,1% Goldstandard)
 * TagesplanHomeworkFahrplanModal.tsx
 *
 * Pädagogischer Weltklasse-Goldstandard für die Hausaufgaben-Eintragung:
 * - Orientiert am Hausaufgaben-Fahrplan des Aufgabenhefts (Meisterwerk)
 * - 📚 Lehrwerke & Fortlaufende Seitenzahlen-Automatik (Intelligent Page Progression Engine)
 * - 🎵 Repertoire & Songs aus dem Modul „Noten & Songs“ (mit Passagen-Pills)
 * - 🎙️ Prominente Diktier-Funktion (Voice-to-Text mit DAW Pulse & Satzzeichen-Automatik)
 * - ✨ Didaktische Vorlagen & Schnelltexte (DidacticTextbausteineDock)
 * - 🎧 Akustik & Metronom (Optionales 4-Beat Count-in Audio-Memo & BPM Stepper)
 * - ⚡ Revisionssichere Speicherung (progress_matrix SSOT & Realtime Broadcast)
 * - Monolith Ceiling Schutz: Autarker Feature-Monolith (< 900 Zeilen)
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  X, Mic, Square, BookOpen, Music, Sparkles, Check, Plus, Search,
  Volume2, VolumeX, Layers, Zap, ChevronRight, RotateCcw, Loader2,
  Calendar, AlertCircle, Play, Pause, Clock, Trash2, FileText, Sliders
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { acquireAudioStream, releaseAudioStream, stabilizeAudioStream } from '../../../services/audioPermissionService';
import { AudioCaptureEngine } from '../../../services/audio/AudioCaptureEngine';
import { processPureRawBlob } from '../../../utils/audioMasteringEngine';
import { fixWebmDuration } from '../../../utils/webmDurationPatcher';
import { saveOfflineAudioRecord, removeOfflineAudioRecord } from '../../../utils/offlineAudioVault';
import { checkIsAudioTresorActive, isInternalMetadataNote } from '../../../domain/stickersAndTresor';
import { isUUID } from '../../../utils/uuidValidator';
import { getSecureAudioUrl } from '../../../utils/audioStorageHelper';
import { useDictationInput } from '../../../hooks/useVoiceToText';
import { getSimulatedNow, getISOWeekRaw } from '../utils/teacherDashboardUtils';
import {
  buildHomeworkNotesPayload,
  parseHomeworkNotesPayload,
  formatPageRangeString,
  cleanHomeworkTitle,
  deleteCurrentHomeworkAuthoritative,
  parsePageRangeString
} from '../../../utils/homeworkSnapshotHelper';
import { autoRelievePreviousBookPages, calculateAuthoritativeBookProgress, AuthoritativeBookProgress } from '../../../services/homeworkSyncEngine';
import { TagesplanSmartPageInput } from './TagesplanSmartPageInput';
import { TagesplanBookPageMiniGrid } from './TagesplanBookPageMiniGrid';
import { DidacticTextbausteineDock } from '../../student/meisterwerk/components/DidacticTextbausteineDock';
import { capitalizeFirstLetter, formatSingleStudentAnonymized } from '../../../utils/nameHelper';
import { MicroScoreSnippet } from '../../student/meisterwerk/microscore/microScore.types';
import { fetchTeacherScoreSnippets, saveTeacherScoreSnippet } from '../../../services/teacherScoreSnippetService';
import { MicroScoreStudioModal } from '../../student/meisterwerk/microscore/MicroScoreStudioModal';
import { TagesplanHomeworkScoreSnippetsTab } from './TagesplanHomeworkScoreSnippetsTab';

export interface TagesplanHomeworkFahrplanModalProps {
  isOpen: boolean;
  student: any;
  teacher: any;
  allStudents?: any[];
  dateStr?: string;
  hasTresorStorage?: boolean;
  onClose: () => void;
  onSaved?: (resultUrlOrText: string) => void;
  portalTarget?: HTMLElement | null;
  zIndex?: number;
  initialLehrwerkId?: string;
}

interface AssignedBookItem {
  id: string;
  lehrwerkId: string;
  title: string;
  totalPages: number;
  lastPracticedPage: number;
  lastMasteredPage?: number;
  highestConsecutiveMasteredPage?: number;
  masteredPages?: number[];
  pageStatesMap?: Record<number, any>;
  proposals?: {
    single: number;
    double: [number, number];
    repeatAndAdvance: [number, number];
    block3: [number, number, number];
  };
  selectedPages: number[];
  isSelected: boolean;
  pageNotes?: string;
  isGridOpen?: boolean;
}

interface StudentSongItem {
  id: string;
  songId: string;
  title: string;
  artist?: string;
  status: string;
  isSelected: boolean;
  selectedPassage: string;
}

const SONG_PASSAGE_PRESETS = [
  'Intro & Beginn',
  'Strophe / Formteil A',
  'Refrain & Akkorde',
  'Knifflige Stelle 5x',
  'Solo & Melodie',
  'Ganzes Stück im Zieltempo'
];
const METRONOME_PRESETS = [60, 80, 100, 120];

export const TagesplanHomeworkFahrplanModal: React.FC<TagesplanHomeworkFahrplanModalProps> = ({
  isOpen,
  student,
  teacher,
  allStudents,
  dateStr,
  hasTresorStorage,
  onClose,
  onSaved,
  portalTarget,
  zIndex,
  initialLehrwerkId
}) => {
  // 1. Identity Resolution
  const studentFirstName = student?.first_name || (student?.name ? student.name.split(' ')[0] : 'Schüler');
  const studentLastName = student?.last_name || (student?.name ? student.name.split(' ').slice(1).join(' ') : '');
  const studentDisplayName = formatSingleStudentAnonymized(studentFirstName, studentLastName);
  const studentInstrument = student?.instrument || student?.fach || 'Instrument';

  const effectiveStudentId = student?.id || student?.student_id || student?.studentId || '';
  const targetSchoolId = student?.school_id || teacher?.school_id || '';

  // 2. Navigation / Tabs
  const [activeTab, setActiveTab] = useState<'fahrplan' | 'books' | 'songs' | 'snippets' | 'audio'>('fahrplan');
  const [hasExistingHomework, setHasExistingHomework] = useState(false);

  // 3. Lehrwerke & Seiten-Progression
  const [assignedBooks, setAssignedBooks] = useState<AssignedBookItem[]>([]);
  const [allSchoolBooks, setAllSchoolBooks] = useState<any[]>([]);
  const [bookSearchQuery, setBookSearchQuery] = useState('');
  const [showAddBookDrawer, setShowAddBookDrawer] = useState(false);

  // 4. Songs aus Noten & Songs
  const [studentSongs, setStudentSongs] = useState<StudentSongItem[]>([]);
  const [allSchoolSongs, setAllSchoolSongs] = useState<any[]>([]);
  const [songSearchQuery, setSongSearchQuery] = useState('');
  const [showAddSongDrawer, setShowAddSongDrawer] = useState(false);

  // 4b. Notenschnipsel (MicroScores 1–4 Takte)
  const [selectedSnippets, setSelectedSnippets] = useState<MicroScoreSnippet[]>([]);
  const [allSchoolSnippets, setAllSchoolSnippets] = useState<MicroScoreSnippet[]>([]);
  const [isSnippetDrawerOpen, setIsSnippetDrawerOpen] = useState(false);
  const [isStudioModalOpen, setIsStudioModalOpen] = useState(false);

  // 5. Didaktischer Text & Diktat
  const [fahrplanText, setFahrplanText] = useState('');
  const fahrplanTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  // 6. Metronom & Audio Recording
  const [metronomeBpm, setMetronomeBpm] = useState(80);
  const [isMetronomeActive, setIsMetronomeActive] = useState(false);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [audioRecordSeconds, setAudioRecordSeconds] = useState(0);
  const [countInRemaining, setCountInRemaining] = useState<number | null>(null);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [recordedAudioBlob, setRecordedAudioBlob] = useState<Blob | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // 7. Status & Saving
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Audio References
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<any>(null);
  const countInTimerRef = useRef<any>(null);
  const metronomeTimerRef = useRef<any>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioElemRef = useRef<HTMLAudioElement | null>(null);

  // 🎙️ 0.1% Goldstandard Diktier-Integration (useDictationInput mit Silence Auto-Stop & Zero Duplication)
  const {
    isListening: isHeroListening,
    toggleListening: toggleHeroListening,
    stopListening: stopHeroListening
  } = useDictationInput({
    value: fahrplanText,
    onChange: setFahrplanText,
    autoStopOnSilence: true,
    silenceTimeoutMs: 2000
  });

  // ESC Key Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSaving) {
        if (isHeroListening) {
          stopHeroListening();
          return;
        }
        if (isRecordingAudio) {
          stopRecording();
          return;
        }
        onClose();
      }
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSaving, isHeroListening, isRecordingAudio, onClose, stopHeroListening]);

  // =========================================================================
  // 📚 1. DATEN-HYDRIERUNG (Lehrwerke, Songs, Bestehender Fahrplan)
  // =========================================================================
  useEffect(() => {
    if (!isOpen || !student) return;

    let isMounted = true;
    setIsLoadingData(true);
    setSaveSuccess(false);

    const loadStudentData = async () => {
      try {
        const sId = effectiveStudentId;

        // A) Schul-Katalog Lehrwerke laden
        let schoolBooks: any[] = [];
        const { data: dbBooks } = await supabase
          .from('lehrwerke')
          .select('*')
          .order('title');
        if (dbBooks) schoolBooks = dbBooks;
        try {
          const localBooksStr = localStorage.getItem('campus_lehrwerke');
          if (localBooksStr) {
            const localBooks = JSON.parse(localBooksStr);
            if (Array.isArray(localBooks)) {
              localBooks.forEach(lb => {
                if (!schoolBooks.some(b => b.id === lb.id || b.title === lb.title)) {
                  schoolBooks.push(lb);
                }
              });
            }
          }
        } catch {}
        if (isMounted) setAllSchoolBooks(schoolBooks);

        // B) Schul-Katalog Songs laden
        let schoolSongs: any[] = [];
        let songQuery = supabase.from('songs').select('*');
        if (targetSchoolId) {
          songQuery = songQuery.or(`school_id.eq.${targetSchoolId},school_id.is.null`);
        }
        const { data: dbSongs } = await songQuery.order('title');
        if (dbSongs) schoolSongs = dbSongs;
        if (isMounted) setAllSchoolSongs(schoolSongs);

        // B2) Notenschnipsel-Katalog (VdM + Schule) laden
        try {
          const snippets = await fetchTeacherScoreSnippets(teacher?.id || '', targetSchoolId);
          if (isMounted) setAllSchoolSnippets(snippets);
        } catch (snipErr) {
          console.warn('[TagesplanHomeworkFahrplanModal] Snippet load notice:', snipErr);
        }

        // C) Zugewiesene Lehrwerke & didaktische Übestände ermitteln (DB progress_matrix + Local SSOT)
        let assignedList: AssignedBookItem[] = [];
        let pmRows: any[] = [];
        if (isUUID(sId)) {
          const { data } = await supabase
            .from('progress_matrix')
            .select('*')
            .eq('student_id', sId)
            .order('updated_at', { ascending: false });
          if (data) pmRows = data;
        }

        let localLwItems: any[] = [];
        try {
          const storedProgStr = localStorage.getItem('student_lehrwerke_progress');
          if (storedProgStr) {
            const allProg = JSON.parse(storedProgStr);
            if (Array.isArray(allProg)) {
              localLwItems = allProg.filter((item: any) => String(item.studentId) === String(sId));
            }
          }
        } catch {}

        // Sammle alle eindeutigen Lehrwerke des Schülers
        const bookMap = new Map<string, { title: string; lehrwerkId: string; totalPages: number; localAssignment?: any }>();

        // 1. Aus lokalem Fortschritt (student_lehrwerke_progress)
        localLwItems.forEach((lw: any) => {
          const rawTitle = lw.bookTitle || lw.title || lw.lehrwerkTitle || 'Lehrwerk';
          const cleanTitle = cleanHomeworkTitle(rawTitle);
          if (cleanTitle) {
            const key = cleanTitle.toLowerCase();
            if (!bookMap.has(key)) {
              bookMap.set(key, {
                title: cleanTitle,
                lehrwerkId: lw.lehrwerkId || lw.id || `book-${key.replace(/\s+/g, '-')}`,
                totalPages: lw.totalPages || lw.total_pages || 50,
                localAssignment: lw
              });
            }
          }
        });

        // 2. Aus progress_matrix (DB)
        pmRows.forEach((row: any) => {
          if (row.topic_name && row.topic_name.includes(' - Seite ')) {
            const [rawTitle] = row.topic_name.split(' - Seite ');
            const cleanTitle = cleanHomeworkTitle(rawTitle);
            if (cleanTitle) {
              const key = cleanTitle.toLowerCase();
              if (!bookMap.has(key)) {
                const matchInSchool = schoolBooks.find(b => cleanHomeworkTitle(b.title).toLowerCase() === key);
                bookMap.set(key, {
                  title: cleanTitle,
                  lehrwerkId: matchInSchool?.id || `book-${key.replace(/\s+/g, '-')}`,
                  totalPages: matchInSchool?.totalPages || matchInSchool?.total_pages || 50
                });
              }
            }
          }
        });

        // 3. 0,1% Goldstandard: Berechne für jedes Lehrwerk den autoritativen didaktischen Fortschritt
        bookMap.forEach((bookInfo) => {
          const progress = calculateAuthoritativeBookProgress({
            bookTitle: bookInfo.title,
            totalPages: bookInfo.totalPages,
            pmRows,
            localAssignment: bookInfo.localAssignment
          });

          assignedList.push({
            id: `book-${bookInfo.title.toLowerCase().replace(/\s+/g, '-')}`,
            lehrwerkId: bookInfo.lehrwerkId,
            title: bookInfo.title,
            totalPages: bookInfo.totalPages,
            lastPracticedPage: progress.lastPracticedPage,
            lastMasteredPage: progress.lastMasteredPage,
            highestConsecutiveMasteredPage: progress.highestConsecutiveMasteredPage,
            masteredPages: progress.masteredPages,
            pageStatesMap: progress.pageStatesMap,
            proposals: progress.proposals,
            selectedPages: progress.defaultSelectedPages,
            isSelected: true,
            isGridOpen: false
          });
        });

        if (isMounted) setAssignedBooks(assignedList);

        // D) Songs des Schülers laden (user_song_skills)
        let loadedSongs: StudentSongItem[] = [];
        if (isUUID(sId)) {
          const { data: songSkills } = await supabase
            .from('user_song_skills')
            .select('*, songs(*)')
            .eq('user_id', sId);

          if (songSkills && songSkills.length > 0) {
            songSkills.forEach((sk: any) => {
              const songObj = sk.songs || {};
              const title = cleanHomeworkTitle(songObj.title || sk.title || 'Song');
              if (title && !loadedSongs.some(s => s.title.toLowerCase() === title.toLowerCase())) {
                loadedSongs.push({
                  id: sk.id,
                  songId: sk.song_id || songObj.id,
                  title,
                  artist: songObj.artist || '',
                  status: sk.status || 'IN_PROGRESS',
                  isSelected: Boolean(sk.is_current_homework),
                  selectedPassage: 'Intro & Strophe'
                });
              }
            });
          }
        }

        try {
          const localSkillsStr = localStorage.getItem('campus_user_song_skills');
          if (localSkillsStr) {
            const localSkills = JSON.parse(localSkillsStr);
            if (Array.isArray(localSkills)) {
              localSkills.filter((ls: any) => String(ls.user_id) === String(sId)).forEach((ls: any) => {
                const title = cleanHomeworkTitle(ls.title || 'Song');
                if (title && !loadedSongs.some(s => s.title.toLowerCase() === title.toLowerCase())) {
                  loadedSongs.push({
                    id: ls.id,
                    songId: ls.song_id || ls.id,
                    title,
                    artist: ls.artist || '',
                    status: ls.status || 'IN_PROGRESS',
                    isSelected: true,
                    selectedPassage: 'Intro & Strophe'
                  });
                }
              });
            }
          }
        } catch {}

        if (isMounted) setStudentSongs(loadedSongs);

        // E) Bisherigen Wochen-Fahrplan Text laden (DB progress_matrix = SSOT)
        let initialText = '';
        let foundExisting = false;

        if (isUUID(sId)) {
          const { data: latestHw } = await supabase
            .from('progress_matrix')
            .select('homework_notes, is_current_homework')
            .eq('student_id', sId)
            .eq('is_current_homework', true)
            .ilike('topic_name', 'Hausaufgabe KW %')
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (latestHw?.homework_notes) {
            const parsedPayload = parseHomeworkNotesPayload(latestHw.homework_notes);
            if (parsedPayload.didacticNotes.length > 0) {
              initialText = parsedPayload.didacticNotes.join('\n\n');
              foundExisting = true;
            } else if (
              parsedPayload.lehrwerke.length > 0 ||
              parsedPayload.songs.length > 0 ||
              parsedPayload.audioItems.length > 0 ||
              parsedPayload.microScores.length > 0
            ) {
              foundExisting = true;
            }

            if (parsedPayload.microScores.length > 0) {
              const loadedSnippets: MicroScoreSnippet[] = parsedPayload.microScores
                .map(m => m.snippet)
                .filter(Boolean);
              if (isMounted && loadedSnippets.length > 0) {
                setSelectedSnippets(loadedSnippets);
              }
            }
          }
        }

        // Fallback auf localStorage nur wenn in DB noch nichts existiert
        if (!initialText) {
          try {
            const rawNotes = localStorage.getItem(`campus_homework_notes_${sId}`);
            if (rawNotes) {
              const parsedLocal = parseHomeworkNotesPayload(rawNotes);
              if (parsedLocal.didacticNotes.length > 0) {
                initialText = parsedLocal.didacticNotes.join('\n\n');
                foundExisting = true;
              }
              if (parsedLocal.microScores.length > 0) {
                const loadedSnippets: MicroScoreSnippet[] = parsedLocal.microScores
                  .map(m => m.snippet)
                  .filter(Boolean);
                if (isMounted && loadedSnippets.length > 0) {
                  setSelectedSnippets(loadedSnippets);
                }
              }
            }
          } catch {}
        }

        if (isMounted) {
          setFahrplanText(initialText);
          setHasExistingHomework(foundExisting);
        }
      } catch (err) {
        console.warn('[TagesplanHomeworkFahrplanModal] Error loading data:', err);
      } finally {
        if (isMounted) setIsLoadingData(false);
      }
    };

    loadStudentData();

    return () => {
      isMounted = false;
      stopAllHardware();
    };
  }, [isOpen, student, effectiveStudentId, targetSchoolId, studentInstrument]);

  // 🎯 Automatische Fokussierung des initialen Lehrwerks aus Aufgabenheft-Aufruf
  useEffect(() => {
    if (initialLehrwerkId && assignedBooks.length > 0) {
      setAssignedBooks(prev => prev.map(b => ({
        ...b,
        isSelected: b.lehrwerkId === initialLehrwerkId ? true : b.isSelected,
        isGridOpen: b.lehrwerkId === initialLehrwerkId ? true : b.isGridOpen
      })));
    }
  }, [initialLehrwerkId, assignedBooks.length]);

  // =========================================================================
  // 🔄 2. SEITEN-PROGRESION & FAHRPLAN-SYNCHRONISATION
  // =========================================================================
  const handleSelectBookPages = (bookId: string, pages: number[]) => {
    const cleanPages = [...pages].filter(p => !isNaN(p) && p >= 1).sort((a, b) => a - b);
    setAssignedBooks(prev => {
      return prev.map(book => {
        if (book.id === bookId) {
          return { ...book, selectedPages: cleanPages, isSelected: cleanPages.length > 0 };
        }
        return book;
      });
    });

    // Fahrplan-Text aktualisieren
    const targetBook = assignedBooks.find(b => b.id === bookId);
    if (targetBook) {
      const pageStr = formatPageRangeString(cleanPages);
      const bookLine = cleanPages.length > 0 ? `${targetBook.title}: ${pageStr}` : '';

      setFahrplanText(prev => {
        const lines = prev.split('\n');
        const existingIdx = lines.findIndex(l => l.includes(targetBook.title));
        if (existingIdx !== -1) {
          if (bookLine) {
            lines[existingIdx] = bookLine;
          } else {
            lines.splice(existingIdx, 1);
          }
          return lines.join('\n');
        } else if (bookLine) {
          return `${bookLine}\n${prev}`.trim();
        }
        return prev;
      });
    }
  };

  const handleToggleMiniGridPage = (bookId: string, pageNum: number) => {
    const target = assignedBooks.find(b => b.id === bookId);
    if (!target) return;
    const currentPages = target.selectedPages || [];
    let nextPages: number[];
    if (currentPages.includes(pageNum)) {
      nextPages = currentPages.filter(p => p !== pageNum);
    } else {
      nextPages = [...currentPages, pageNum].sort((a, b) => a - b);
    }
    handleSelectBookPages(bookId, nextPages);
  };

  const handleToggleBookGridOpen = (bookId: string) => {
    setAssignedBooks(prev => prev.map(b => b.id === bookId ? { ...b, isGridOpen: !b.isGridOpen } : b));
  };

  const handleStepBookPage = (bookId: string, delta: number) => {
    const targetBook = assignedBooks.find(b => b.id === bookId);
    if (!targetBook) return;

    const pages = targetBook.selectedPages || [];
    const maxPage = targetBook.totalPages || 100;
    // Zusammenhängende Doppelseite intelligent weiterschalten
    if (pages.length === 2 && pages[1] === pages[0] + 1) {
      const newStart = Math.max(1, Math.min(maxPage - 1, pages[0] + (delta * 2)));
      handleSelectBookPages(bookId, [newStart, newStart + 1]);
    } else {
      const currentPrimary = pages[0] || targetBook.lastPracticedPage || 1;
      const newPage = Math.max(1, Math.min(maxPage, currentPrimary + delta));
      handleSelectBookPages(bookId, [newPage]);
    }
  };

  const handleSelectSongPassage = (songId: string, passage: string) => {
    setStudentSongs(prev => {
      return prev.map(s => {
        if (s.id === songId) {
          return { ...s, selectedPassage: passage, isSelected: true };
        }
        return s;
      });
    });

    const targetSong = studentSongs.find(s => s.id === songId);
    if (targetSong) {
      const songLine = `${targetSong.title}: ${passage}`;
      setFahrplanText(prev => {
        const lines = prev.split('\n');
        const existingIdx = lines.findIndex(l => l.includes(targetSong.title));
        if (existingIdx !== -1) {
          lines[existingIdx] = songLine;
          return lines.join('\n');
        } else {
          return `${prev}\n${songLine}`.trim();
        }
      });
    }
  };

  const previewMetronomeClicks = () => {
    let count = 4;
    playMetronomeBeep(true);
    count -= 1;
    const interval = setInterval(() => {
      if (count > 0) {
        playMetronomeBeep(false);
        count -= 1;
      } else {
        clearInterval(interval);
      }
    }, (60 / metronomeBpm) * 1000);
  };

  const handleToggleTextbaustein = (chip: { label: string; text: string; isBpm?: boolean }) => {
    if (!chip.text) return;
    setFahrplanText(prev => {
      const trimmed = prev.trim();
      if (trimmed.includes(chip.text)) {
        return trimmed.replace(chip.text, '').replace(/\n\n\n+/g, '\n\n').trim();
      }
      return trimmed ? `${trimmed}\n\n${chip.text}` : chip.text;
    });
  };

  const handleSelectSnippet = (snippet: MicroScoreSnippet) => {
    setSelectedSnippets(prev => {
      if (prev.some(s => s.id === snippet.id)) return prev;
      return [...prev, snippet];
    });
    setIsSnippetDrawerOpen(false);

    setFahrplanText(prev => {
      const snippetLine = `🎼 Notenschnipsel: ${snippet.title} (${snippet.tempoBpm || 80} BPM)`;
      if (!prev.includes(snippet.title)) {
        return prev ? `${prev}\n${snippetLine}` : snippetLine;
      }
      return prev;
    });
  };

  const handleSaveStudioSnippet = async (snippet: MicroScoreSnippet) => {
    setSelectedSnippets(prev => {
      if (prev.some(s => s.id === snippet.id)) return prev;
      return [...prev, snippet];
    });
    setIsStudioModalOpen(false);

    try {
      await saveTeacherScoreSnippet(teacher?.id || '', targetSchoolId, snippet);
      setAllSchoolSnippets(prev => [snippet, ...prev.filter(s => s.id !== snippet.id)]);
    } catch {}

    setFahrplanText(prev => {
      const snippetLine = `🎼 Notenschnipsel: ${snippet.title} (${snippet.tempoBpm || 80} BPM)`;
      if (!prev.includes(snippet.title)) {
        return prev ? `${prev}\n${snippetLine}` : snippetLine;
      }
      return prev;
    });
  };

  const handleUpdateSnippetBpm = (snippetId: string, delta: number) => {
    setSelectedSnippets(prev => prev.map(s => {
      if (s.id === snippetId) {
        const newBpm = Math.max(40, Math.min(240, (s.tempoBpm || 80) + delta));
        return { ...s, tempoBpm: newBpm };
      }
      return s;
    }));
  };

  // =========================================================================
  // 🎙️ 3. AUDIO-MEMO & HARDWARE CONTROLS
  // =========================================================================
  const stopAllHardware = useCallback(() => {
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    if (countInTimerRef.current) clearInterval(countInTimerRef.current);
    if (metronomeTimerRef.current) clearInterval(metronomeTimerRef.current);
    if (streamRef.current) releaseAudioStream(streamRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop(); } catch {}
    }
    if (audioElemRef.current) {
      audioElemRef.current.pause();
      audioElemRef.current = null;
    }
    setIsRecordingAudio(false);
    setIsMetronomeActive(false);
    setIsPlayingAudio(false);
    setCountInRemaining(null);
  }, []);

  const startRecording = async () => {
    if (isRecordingAudio || countInRemaining !== null) return;
    try {
      const stream = await acquireAudioStream();
      await stabilizeAudioStream(stream, 400);
      streamRef.current = stream;
      audioChunksRef.current = [];

      // 4-Beat Count In
      let count = 4;
      setCountInRemaining(count);
      playMetronomeBeep(true);

      countInTimerRef.current = setInterval(() => {
        count -= 1;
        if (count > 0) {
          setCountInRemaining(count);
          playMetronomeBeep(false);
        } else {
          clearInterval(countInTimerRef.current);
          setCountInRemaining(null);
          executeMediaRecorderStart(stream);
        }
      }, (60 / metronomeBpm) * 1000);
    } catch (err) {
      console.warn('[TagesplanHomeworkFahrplanModal] Mic access notice:', err);
      alert('Mikrofon-Zugriff nicht möglich. Bitte Berechtigung erteilen.');
    }
  };

  const executeMediaRecorderStart = (stream: MediaStream) => {
    const { recorder: rec, mimeType } = AudioCaptureEngine.createHighResMediaRecorder(stream, 256000);
    mediaRecorderRef.current = rec;

    rec.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data);
    };

    rec.onstop = async () => {
      const rawBlob = new Blob(audioChunksRef.current, { type: mimeType });
      let finalBlob: Blob = rawBlob;
      try {
        const durationFixed = await fixWebmDuration(rawBlob, audioRecordSeconds || 1);
        const mastered = await processPureRawBlob(durationFixed);
        if (mastered?.processedBlob) finalBlob = mastered.processedBlob;
      } catch {}

      const localUrl = URL.createObjectURL(finalBlob);
      setRecordedAudioBlob(finalBlob);
      setRecordedAudioUrl(localUrl);
      setIsRecordingAudio(false);
      setAudioRecordSeconds(0);
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    };

    rec.start(100);
    setIsRecordingAudio(true);
    setAudioRecordSeconds(0);
    recordTimerRef.current = setInterval(() => {
      setAudioRecordSeconds(prev => prev + 1);
    }, 1000);
  };

  const stopRecording = () => {
    if (countInTimerRef.current) clearInterval(countInTimerRef.current);
    setCountInRemaining(null);
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    const rec = mediaRecorderRef.current;
    if (rec && rec.state !== 'inactive') {
      AudioCaptureEngine.stopRecorderWithTail(rec, 800, () => {
        if (streamRef.current) {
          releaseAudioStream(streamRef.current);
          streamRef.current = null;
        }
      });
    } else if (streamRef.current) {
      releaseAudioStream(streamRef.current);
      streamRef.current = null;
    }
  };

  const playMetronomeBeep = (accent: boolean) => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      // 0.1% Studio Klopfgeist Hybrid Metronome: transient snap + resonant wooden body
      const now = ctx.currentTime;
      const oscBody = ctx.createOscillator();
      const oscSnap = ctx.createOscillator();
      const gainBody = ctx.createGain();
      const gainSnap = ctx.createGain();
      oscBody.type = 'sine';
      oscBody.frequency.setValueAtTime(accent ? 880 : 440, now);
      gainBody.gain.setValueAtTime(0.35, now);
      gainBody.gain.exponentialRampToValueAtTime(0.0001, now + (accent ? 0.08 : 0.05));
      oscSnap.type = 'triangle';
      oscSnap.frequency.setValueAtTime(accent ? 1760 : 880, now);
      gainSnap.gain.setValueAtTime(0.2, now);
      gainSnap.gain.exponentialRampToValueAtTime(0.0001, now + 0.015);
      oscBody.connect(gainBody);
      gainBody.connect(ctx.destination);
      oscSnap.connect(gainSnap);
      gainSnap.connect(ctx.destination);
      oscBody.start(now);
      oscSnap.start(now);
      oscBody.stop(now + 0.09);
      oscSnap.stop(now + 0.09);
    } catch {}
  };

  const handleDeleteFahrplan = async () => {
    if (!window.confirm('Möchtest du diese Hausaufgabe für heute wirklich unwiderruflich löschen?')) return;
    setIsSaving(true);
    try {
      const simNow = getSimulatedNow();
      const currentWeek = getISOWeekRaw(simNow, 1);
      const weekNum = currentWeek.split('-W')[1] || '01';
      await deleteCurrentHomeworkAuthoritative(effectiveStudentId, weekNum);
      setFahrplanText('');
      setHasExistingHomework(false);
      onClose();
    } catch (err: any) {
      alert('Fehler beim Löschen: ' + (err?.message || err));
    } finally {
      setIsSaving(false);
    }
  };

  // =========================================================================
  // 💾 4. AUTORITATIVES SPEICHERN & REALTIME BROADCAST
  // =========================================================================
  const handleSaveHomeworkFahrplan = async () => {
    if (isSaving) return;
    setIsSaving(true);

    try {
      const sId = effectiveStudentId;
      const simNow = getSimulatedNow();
      const currentWeek = getISOWeekRaw(simNow, 1);
      const weekNum = currentWeek.split('-W')[1] || '01';
      const topicName = `Hausaufgabe KW ${weekNum}`;

      // A) Snapshot Lehrwerke aufbereiten
      const lehrwerkeSnapshot = assignedBooks
        .filter(b => b.isSelected && b.selectedPages.length > 0)
        .map(b => ({
          id: b.id,
          title: b.title,
          pages: b.selectedPages,
          notes: b.pageNotes ? [b.pageNotes] : []
        }));

      // B) Snapshot Songs aufbereiten
      const songsSnapshot = studentSongs
        .filter(s => s.isSelected)
        .map(s => ({
          id: s.id,
          songId: s.songId,
          title: s.title,
          passage: s.selectedPassage
        }));

      // C) Audio Take hochladen (falls aufgenommen)
      const audioTokens: string[] = [];
      let finalAudioPublicUrl = '';
      if (recordedAudioBlob) {
        try {
          const fileExt = AudioCaptureEngine.resolveAudioFileExtension(recordedAudioBlob);
          const filePath = `${sId}/voice-hw-${Date.now()}.${fileExt}`;
          const { error: upErr } = await supabase.storage
            .from('campus-assets')
            .upload(filePath, recordedAudioBlob, { contentType: recordedAudioBlob.type, upsert: true });

          if (!upErr) {
            finalAudioPublicUrl = await getSecureAudioUrl(filePath, 'campus-assets', 1800);
            audioTokens.push(`AUDIO:${finalAudioPublicUrl}|${audioRecordSeconds || 10}|${new Date().toISOString()}|Play-Along Take|teacher|shared_with_teacher||||BPM:${metronomeBpm}`);
          }
        } catch (e) {
          console.warn('[TagesplanHomeworkFahrplanModal] Audio upload notice:', e);
        }
      }

      // D) Didaktische Notizen zerlegen
      const rawText = fahrplanText.trim();
      const didacticNotesList = rawText.split('\n\n').map(s => s.trim()).filter(Boolean);

      // E) Ausgewählte Notenschnipsel (MicroScores 1–4 Takte) serialisieren & kanonisches homework_notes JSON schnüren
      const microScoresPayload = selectedSnippets.map(snip => ({
        id: snip.id,
        title: snip.title,
        snippet: snip,
        rawToken: `MICROSCORE:${JSON.stringify(snip)}`
      }));

      let existingMatrixRow: { id: string; homework_notes?: any } | null = null;
      if (isUUID(sId)) {
        const { data: existingMatrix } = await supabase
          .from('progress_matrix')
          .select('id, homework_notes')
          .eq('student_id', sId)
          .ilike('topic_name', `Hausaufgabe KW %`)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        existingMatrixRow = existingMatrix || null;
      }

      const jsonPayload = buildHomeworkNotesPayload({
        didacticNotes: didacticNotesList,
        lehrwerke: lehrwerkeSnapshot,
        songs: songsSnapshot,
        audioTokens: audioTokens,
        microScores: microScoresPayload
      });

      // F) In progress_matrix upserten (SSOT)
      if (isUUID(sId)) {
        if (existingMatrixRow?.id) {
          await supabase.from('progress_matrix').update({
            homework_notes: jsonPayload,
            topic_name: topicName,
            is_current_homework: true,
            updated_at: new Date().toISOString()
          }).eq('id', existingMatrixRow.id);
        } else {
          await supabase.from('progress_matrix').insert({
            student_id: sId,
            teacher_id: teacher?.id,
            topic_name: topicName,
            status: 'IN_PROGRESS',
            is_current_homework: true,
            homework_notes: jsonPayload,
            updated_at: new Date().toISOString()
          });
        }

        // Auch einzelne Buchseiten als IN_PROGRESS in progress_matrix festhalten
        for (const lw of lehrwerkeSnapshot) {
          for (const p of lw.pages) {
            const pageTopic = `${lw.title} - Seite ${p}`;
            const { data: pageRow } = await supabase
              .from('progress_matrix')
              .select('id')
              .eq('student_id', sId)
              .eq('topic_name', pageTopic)
              .maybeSingle();

            if (pageRow?.id) {
              await supabase.from('progress_matrix').update({
                status: 'IN_PROGRESS',
                is_current_homework: true,
                updated_at: new Date().toISOString()
              }).eq('id', pageRow.id);
            } else {
              await supabase.from('progress_matrix').insert({
                student_id: sId,
                teacher_id: teacher?.id,
                topic_name: pageTopic,
                status: 'IN_PROGRESS',
                is_current_homework: true,
                updated_at: new Date().toISOString()
              });
            }
          }
        }
      }

      // G) LocalStorage & Instant Cache updaten
      try {
        const fullNotesArr = JSON.parse(jsonPayload);
        localStorage.setItem(`campus_homework_notes_${sId}`, JSON.stringify(fullNotesArr));
        localStorage.setItem(`campus_homework_week_${sId}`, currentWeek);

        // student_lehrwerke_progress mit Auto-Entlastung aktualisieren
        const storedProgStr = localStorage.getItem('student_lehrwerke_progress');
        let fullProg: any[] = storedProgStr ? JSON.parse(storedProgStr) : [];
        lehrwerkeSnapshot.forEach(lw => {
          autoRelievePreviousBookPages(sId, lw.title, lw.pages);
          let asgn = fullProg.find(p => String(p.studentId) === String(sId) && (p.title === lw.title || p.bookTitle === lw.title));
          if (!asgn) { asgn = { studentId: sId, title: lw.title, bookTitle: lw.title, totalPages: 50, pageStates: {} }; fullProg.push(asgn); }
          if (!asgn.pageStates) asgn.pageStates = {};
          Object.keys(asgn.pageStates).forEach(pStr => {
            const p = parseInt(pStr, 10);
            if (!isNaN(p) && !lw.pages.includes(p) && (asgn.pageStates[p]?.status === 'homework' || asgn.pageStates[p]?.isCurrentHomework)) {
              asgn.pageStates[p] = { ...asgn.pageStates[p], isCurrentHomework: false, status: asgn.pageStates[p].status === 'homework' ? 'locked' : asgn.pageStates[p].status, updatedAt: new Date().toISOString() };
            }
          });
          lw.pages.forEach(p => {
            const exP = asgn.pageStates[p] || {};
            asgn.pageStates[p] = { ...exP, status: 'homework', isCurrentHomework: true, homeworkNotes: (lw.notes && lw.notes[0]) || exP.homeworkNotes || '', updatedAt: new Date().toISOString() };
          });
        });
        localStorage.setItem('student_lehrwerke_progress', JSON.stringify(fullProg));

        if (isUUID(sId) && studentSongs.length > 0) {
          studentSongs.forEach(async (s) => {
            if (s.songId) {
              await supabase.from('user_song_skills').update({ is_current_homework: s.isSelected, status: s.isSelected ? (s.status || 'IN_PROGRESS') : s.status, homework_notes: s.selectedPassage || '', updated_at: new Date().toISOString() }).eq('user_id', sId).eq('song_id', s.songId);
            }
          });
        }

        // groovelab_student_prep
        const prepPayload = {
          studentId: sId,
          currentWeekNum: weekNum,
          currentWeekNotes: fullNotesArr
        };
        localStorage.setItem(`groovelab_student_prep_${sId}_${currentWeek}`, JSON.stringify(prepPayload));
        localStorage.setItem(`groovelab_student_prep_${sId}_latest`, JSON.stringify(prepPayload));
      } catch {}

      // H) Supabase Realtime Broadcast & Window Events
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('campus_homework_updated', { detail: { studentId: sId } }));
        window.dispatchEvent(new CustomEvent('campus_homework_notes_updated', { detail: { studentId: sId } }));
        window.dispatchEvent(new CustomEvent('groovelab_student_prep_updated', { detail: { studentId: sId } }));
        window.dispatchEvent(new CustomEvent('homework-updated', { detail: { studentId: sId } }));

        try {
          const topic = `realtime_student_progress_${sId}`;
          const channel = supabase.channel(topic);
          channel.subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
              await channel.send({
                type: 'broadcast',
                event: 'homework-changed',
                payload: { studentId: sId }
              });
              setTimeout(() => supabase.removeChannel(channel), 1000);
            }
          });
        } catch {}
      }

      setSaveSuccess(true);
      if (onSaved) onSaved(finalAudioPublicUrl || rawText);
      setTimeout(() => {
        stopAllHardware();
        onClose();
      }, 700);
    } catch (err) {
      console.error('[TagesplanHomeworkFahrplanModal] Error saving homework:', err);
      alert('Speichern fehlgeschlagen. Bitte Verbindung prüfen.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen || !student) return null;

  const effectivePortalTarget = portalTarget ?? (typeof document !== 'undefined'
    ? ((document.querySelector('.sim-viewport-mobile, .sim-viewport-portrait, .sim-viewport-tablet') as HTMLElement) || document.body)
    : null);

  const effectiveZIndex = zIndex ?? 100005;

  const modalMarkup = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Hausaufgaben-Fahrplan eintragen"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: effectiveZIndex,
        background: 'rgba(15, 23, 42, 0.78)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.18s ease'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '820px',
          maxHeight: '92vh',
          background: '#ffffff',
          borderRadius: '24px',
          boxShadow: '0 24px 60px -12px rgba(0, 0, 0, 0.35)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid rgba(226, 232, 240, 0.8)',
          boxSizing: 'border-box'
        }}
      >
        {/* ========================================================================= */}
        {/* 🌟 1. KOPFZEILE / BRANDING HEADER                                          */}
        {/* ========================================================================= */}
        <div
          style={{
            padding: '18px 24px',
            background: 'linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.12)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '14px',
                background: 'rgba(255, 255, 255, 0.18)',
                backdropFilter: 'blur(8px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
              }}
            >
              <BookOpen size={22} color="#ffffff" strokeWidth={2.4} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {hasExistingHomework && (
                  <span
                    style={{
                      fontSize: '0.66rem',
                      fontWeight: 800,
                      background: '#10b981',
                      padding: '2px 8px',
                      borderRadius: '100px',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Check size={10} strokeWidth={3} />
                    Bereits hinterlegt
                  </span>
                )}
              </div>

              <h2
                style={{
                  margin: '3px 0 0',
                  fontSize: '1.25rem',
                  fontWeight: 900,
                  letterSpacing: '-0.02em',
                  color: '#ffffff'
                }}
              >
                Hausaufgaben-Fahrplan für {studentDisplayName}
              </h2>
              <span style={{ fontSize: '0.78rem', color: '#a7f3d0', fontWeight: 600 }}>
                {studentInstrument} • Verbindlicher Wochen-Fahrplan für Schüler & Eltern
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.15)',
              border: 'none',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
              transition: 'background 0.15s ease'
            }}
            className="hover-scale-mini"
            title="Schließen (ESC)"
            aria-label="Dialog schließen"
          >
            <X size={18} strokeWidth={2.4} />
          </button>
        </div>

        {/* ========================================================================= */}
        {/* 🎛️ 2. NAVIGATION BAR                                                      */}
        {/* ========================================================================= */}
        <div
          style={{
            padding: '8px 24px',
            background: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            overflowX: 'auto'
          }}
          className="hide-scrollbar"
        >
          <div style={{ display: 'flex', gap: '6px' }}>
            {[
              { id: 'fahrplan', label: 'Wochen-Fahrplan', icon: FileText, badge: fahrplanText.trim() ? 'Aktiv' : undefined },
              { id: 'books', label: `Lehrwerke (${assignedBooks.filter(b => b.isSelected).length})`, icon: BookOpen, badge: undefined },
              { id: 'songs', label: `Songs (${studentSongs.filter(s => s.isSelected).length})`, icon: Music, badge: undefined },
              { id: 'snippets', label: `Notenschnipsel (${selectedSnippets.length})`, icon: Sparkles, badge: selectedSnippets.length > 0 ? `${selectedSnippets.length}` : undefined },
              { id: 'audio', label: 'Zieltempo & Audio', icon: Sliders, badge: recordedAudioUrl ? 'Take da' : undefined }
            ].map(tab => {
              const isActive = activeTab === tab.id;
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '10px',
                    border: 'none',
                    background: isActive ? '#4f46e5' : 'transparent',
                    color: isActive ? '#ffffff' : '#475569',
                    fontSize: '0.80rem',
                    fontWeight: isActive ? 850 : 650,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <TabIcon size={14} strokeWidth={2.2} />
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span
                      style={{
                        fontSize: '0.62rem',
                        fontWeight: 900,
                        padding: '1px 6px',
                        borderRadius: '999px',
                        background: isActive ? '#10b981' : '#e2e8f0',
                        color: isActive ? '#ffffff' : '#0f172a'
                      }}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick-Stats Badge */}
          <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 700, whiteSpace: 'nowrap' }}>
            KW {getISOWeekRaw(getSimulatedNow(), 1).split('-W')[1] || '01'}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 📜 3. SCROLLBARER INHALTSBEREICH NACH TABS                                */}
        {/* ========================================================================= */}
        <div
          style={{
            padding: '20px 24px',
            overflowY: 'auto',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '18px'
          }}
        >
          {isLoadingData ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '260px', gap: '10px', color: '#64748b' }}>
              <Loader2 size={24} className="animate-spin" color="#10b981" />
              <span style={{ fontSize: '0.90rem', fontWeight: 700 }}>Lade Lehrwerke & Repertoire aus Noten & Songs...</span>
            </div>
          ) : (
            <>
              {/* ========================================================================= */}
              {/* TAB 1: WOCHEN-FAHRPLAN & DIKTIEREN                                        */}
              {/* ========================================================================= */}
              {activeTab === 'fahrplan' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  
                  {/* 🎛️ Schlanke 0,1% Goldstandard Editor-Leiste */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      {assignedBooks.filter(b => b.isSelected).map(book => (
                        <button
                          key={book.id}
                          type="button"
                          onClick={() => setActiveTab('books')}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '4px 10px',
                            borderRadius: '100px',
                            background: '#eff6ff',
                            border: 'none',
                            color: '#1d4ed8',
                            fontSize: '0.74rem',
                            fontWeight: 800,
                            cursor: 'pointer'
                          }}
                        >
                          <BookOpen size={12} />
                          <span>{book.title}: {formatPageRangeString(book.selectedPages)}</span>
                          <ChevronRight size={12} />
                        </button>
                      ))}

                      {studentSongs.filter(s => s.isSelected).map(song => (
                        <button
                          key={song.id}
                          type="button"
                          onClick={() => setActiveTab('songs')}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '4px 10px',
                            borderRadius: '100px',
                            background: '#faf5ff',
                            border: 'none',
                            color: '#7e22ce',
                            fontSize: '0.74rem',
                            fontWeight: 800,
                            cursor: 'pointer'
                          }}
                        >
                          <Music size={12} />
                          <span>{song.title} ({song.selectedPassage})</span>
                          <ChevronRight size={12} />
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={toggleHeroListening}
                      style={{
                        padding: '7px 14px',
                        borderRadius: '10px',
                        border: isHeroListening ? '1.5px solid #dc2626' : '1px solid #cbd5e1',
                        background: isHeroListening ? '#fef2f2' : '#ffffff',
                        color: isHeroListening ? '#dc2626' : '#0f172a',
                        fontSize: '0.78rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: isHeroListening ? '0 0 10px rgba(220, 38, 38, 0.25)' : 'none',
                        transition: 'all 0.15s ease'
                      }}
                      className="hover-scale-mini"
                    >
                      {isHeroListening ? (
                        <>
                          <Square size={13} fill="#dc2626" />
                          <span>Diktat beenden</span>
                        </>
                      ) : (
                        <>
                          <Mic size={14} className="text-emerald-600" />
                          <span>Per Sprache diktieren</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* 📝 HAUPT-TEXTAREA FAHRPLAN */}
                  <div
                    style={{
                      background: '#ffffff',
                      border: '1.5px solid #cbd5e1',
                      borderRadius: '16px',
                      padding: '14px 16px',
                      boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.03)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}
                  >
                    <textarea
                      ref={fahrplanTextareaRef}
                      value={fahrplanText}
                      onChange={e => setFahrplanText(e.target.value)}
                      placeholder="Notiere hier den verbindlichen Hausaufgaben-Fahrplan für diese Woche (oder per Sprache diktieren)..."
                      rows={7}
                      style={{
                        width: '100%',
                        border: 'none',
                        outline: 'none',
                        fontSize: '0.96rem',
                        fontWeight: 550,
                        lineHeight: 1.6,
                        color: '#0f172a',
                        background: 'transparent',
                        resize: 'vertical',
                        fontFamily: 'inherit'
                      }}
                    />
                  </div>

                  {/* 🎼 QUICK NOTENSCHNIPSEL STRIP */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '8px',
                      padding: '8px 12px',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#334155', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Music size={13} className="text-emerald-600" />
                        <span>Notenschnipsel ({selectedSnippets.length}):</span>
                      </span>
                      {selectedSnippets.length === 0 ? (
                        <span style={{ fontSize: '0.72rem', color: '#64748b', fontStyle: 'italic' }}>
                          Noch kein Schnipsel angehängt
                        </span>
                      ) : (
                        selectedSnippets.map(snip => (
                          <span
                            key={snip.id}
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              color: '#065f46',
                              background: '#d1fae5',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <span>{snip.title}</span>
                          </span>
                        ))
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveTab('snippets')}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '8px',
                        border: 'none',
                        background: '#ecfdf5',
                        color: '#047857',
                        fontSize: '0.74rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px'
                      }}
                      className="hover-scale-mini"
                    >
                      <Plus size={13} />
                      <span>{selectedSnippets.length === 0 ? 'Notenschnipsel anhängen' : 'Schnipsel verwalten'}</span>
                    </button>
                  </div>

                  {/* DIDAKTISCHE SCHNELLTEXTE DOCK */}
                  <div>
                    <div style={{ fontSize: '0.76rem', fontWeight: 800, color: '#64748b', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Sparkles size={13} color="#059669" />
                      <span>Didaktische Vorlagen & Schnelltexte der Musikschule:</span>
                    </div>
                    <DidacticTextbausteineDock
                      schoolId={targetSchoolId}
                      activeViewingStudentNotes={fahrplanText}
                      onTogglePresetChip={handleToggleTextbaustein}
                    />
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* TAB 2: LEHRWERKE & INTELLIGENTE SEITEN-PROGRESION                        */}
              {/* ========================================================================= */}
              {activeTab === 'books' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 900, color: '#0f172a' }}>
                        Zugewiesene Lehrwerke & Buch-Seiten
                      </h4>
                      <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
                        Auswahl der zu übenden Buchseiten für diese Woche.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowAddBookDrawer(prev => !prev)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '10px',
                        border: '1px solid #cbd5e1',
                        background: '#ffffff',
                        fontSize: '0.76rem',
                        fontWeight: 800,
                        color: '#0f172a',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                      className="hover-scale-mini"
                    >
                      <Plus size={14} />
                      <span>Weiteres Lehrwerk zuweisen</span>
                    </button>
                  </div>

                  {/* Add Book Selector Drawer */}
                  {showAddBookDrawer && (
                    <div
                      style={{
                        padding: '12px 14px',
                        borderRadius: '14px',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '6px 10px' }}>
                        <Search size={14} color="#64748b" />
                        <input
                          type="text"
                          value={bookSearchQuery}
                          onChange={e => setBookSearchQuery(e.target.value)}
                          placeholder="Lehrwerk in Schulbibliothek suchen..."
                          style={{ border: 'none', outline: 'none', fontSize: '0.82rem', flex: 1 }}
                        />
                      </div>

                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', maxHeight: '140px', overflowY: 'auto' }}>
                        {allSchoolBooks
                          .filter(b => !bookSearchQuery || b.title.toLowerCase().includes(bookSearchQuery.toLowerCase()))
                          .map(b => (
                            <button
                              key={b.id}
                              type="button"
                              onClick={() => {
                                if (!assignedBooks.some(ab => ab.title.toLowerCase() === b.title.toLowerCase())) {
                                  const totalP = b.totalPages || b.total_pages || 50;
                                  const progress = calculateAuthoritativeBookProgress({
                                    bookTitle: b.title,
                                    totalPages: totalP,
                                    pmRows: []
                                  });
                                  const newBook: AssignedBookItem = {
                                    id: b.id,
                                    lehrwerkId: b.id,
                                    title: b.title,
                                    totalPages: totalP,
                                    lastPracticedPage: progress.lastPracticedPage,
                                    lastMasteredPage: progress.lastMasteredPage,
                                    highestConsecutiveMasteredPage: progress.highestConsecutiveMasteredPage,
                                    masteredPages: progress.masteredPages,
                                    pageStatesMap: progress.pageStatesMap,
                                    proposals: progress.proposals,
                                    selectedPages: progress.defaultSelectedPages,
                                    isSelected: true,
                                    isGridOpen: false
                                  };
                                  setAssignedBooks(prev => [...prev, newBook]);
                                  handleSelectBookPages(newBook.id, progress.defaultSelectedPages);
                                }
                                setShowAddBookDrawer(false);
                              }}
                              style={{
                                padding: '5px 12px',
                                borderRadius: '100px',
                                border: '1px solid #cbd5e1',
                                background: '#ffffff',
                                fontSize: '0.74rem',
                                fontWeight: 700,
                                color: '#0f172a',
                                cursor: 'pointer'
                              }}
                              className="hover-scale-mini"
                            >
                              + {b.title}
                            </button>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Liste der zugewiesenen Lehrwerke mit intelligenter Progression */}
                  {assignedBooks.length === 0 ? (
                    <div style={{ padding: '24px', textAlign: 'center', background: '#f8fafc', borderRadius: '16px', color: '#64748b' }}>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: '0.86rem' }}>Noch kein Lehrwerk zugewiesen.</p>
                      <p style={{ margin: '4px 0 0', fontSize: '0.76rem' }}>Wähle oben über den Button ein Buch aus der Schulbibliothek aus.</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {assignedBooks.map(book => {
                        const maxP = book.totalPages || 50;
                        const lastP = book.lastPracticedPage || 1;
                        const singleProp = book.proposals?.single || Math.min(maxP, lastP + 1);
                        const doubleProp = book.proposals?.double || [Math.min(maxP, lastP + 1), Math.min(maxP, lastP + 2)];
                        const repeatProp = book.proposals?.repeatAndAdvance || [Math.max(1, lastP), Math.min(maxP, lastP + 1)];
                        const blockProp = book.proposals?.block3 || [Math.min(maxP, lastP + 1), Math.min(maxP, lastP + 2), Math.min(maxP, lastP + 3)];

                        const isSingleActive = book.selectedPages.length === 1 && book.selectedPages[0] === singleProp;
                        const isDoubleActive = book.selectedPages.length === 2 && book.selectedPages[0] === doubleProp[0] && book.selectedPages[1] === doubleProp[1];
                        const isRepeatActive = book.selectedPages.length === 2 && book.selectedPages[0] === repeatProp[0] && book.selectedPages[1] === repeatProp[1];
                        const isBlockActive = book.selectedPages.length === 3 && book.selectedPages[0] === blockProp[0] && book.selectedPages[1] === blockProp[1] && book.selectedPages[2] === blockProp[2];

                        const statusLabel = book.lastMasteredPage && book.lastMasteredPage > 0
                          ? `Seite ${book.lastMasteredPage} gemeistert`
                          : `Seite ${lastP}`;

                        return (
                          <div
                            key={book.id}
                            style={{
                              padding: '14px 16px',
                              borderRadius: '16px',
                              background: '#ffffff',
                              border: book.isSelected ? '1.5px solid #3b82f6' : '1px solid #e2e8f0',
                              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '12px'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div
                                  style={{
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '10px',
                                    background: '#eff6ff',
                                    color: '#2563eb',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 900
                                  }}
                                >
                                  <BookOpen size={18} />
                                </div>
                                <div>
                                  <h5 style={{ margin: 0, fontSize: '0.94rem', fontWeight: 900, color: '#0f172a' }}>
                                    {book.title}
                                  </h5>
                                  <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>
                                    Bisheriger Übestand: <strong style={{ color: book.lastMasteredPage && book.lastMasteredPage > 0 ? '#15803d' : '#0f172a' }}>{statusLabel}</strong> (Gesamt: {book.totalPages} Seiten)
                                  </span>
                                </div>
                              </div>

                              {/* 0,1% Goldstandard Smart Page Range Input & Stepper */}
                              <TagesplanSmartPageInput
                                selectedPages={book.selectedPages}
                                onChange={(pages) => handleSelectBookPages(book.id, pages)}
                                totalPages={book.totalPages}
                                lastMasteredPage={book.lastMasteredPage || book.lastPracticedPage}
                                isGridOpen={book.isGridOpen}
                                onToggleGrid={() => handleToggleBookGridOpen(book.id)}
                              />
                            </div>

                            {/* FORTSCHRITTS-VORSCHLÄGE CHIPS */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', paddingTop: '4px', borderTop: '1px solid #f1f5f9' }}>
                              <span style={{ fontSize: '0.70rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <Sparkles size={11} className="text-slate-400" />
                                <span>Fortlauf-Vorschläge:</span>
                              </span>

                              {/* Vorschlag 1: Nächste Einzelseite */}
                              <button
                                type="button"
                                onClick={() => handleSelectBookPages(book.id, [singleProp])}
                                style={{
                                  padding: '4px 10px',
                                  borderRadius: '8px',
                                  border: isSingleActive ? '1.5px solid #2563eb' : '1px solid #cbd5e1',
                                  background: isSingleActive ? '#eff6ff' : '#ffffff',
                                  color: isSingleActive ? '#1d4ed8' : '#334155',
                                  fontSize: '0.74rem',
                                  fontWeight: 800,
                                  cursor: 'pointer'
                                }}
                                className="hover-scale-mini"
                              >
                                S. {singleProp} (Nächste Einzelseite)
                              </button>

                              {/* Vorschlag 2: Doppelseite */}
                              <button
                                type="button"
                                onClick={() => handleSelectBookPages(book.id, [doubleProp[0], doubleProp[1]])}
                                style={{
                                  padding: '4px 10px',
                                  borderRadius: '8px',
                                  border: isDoubleActive ? '1.5px solid #2563eb' : '1px solid #cbd5e1',
                                  background: isDoubleActive ? '#eff6ff' : '#ffffff',
                                  color: isDoubleActive ? '#1d4ed8' : '#334155',
                                  fontSize: '0.74rem',
                                  fontWeight: 800,
                                  cursor: 'pointer'
                                }}
                                className="hover-scale-mini"
                              >
                                S. {doubleProp[0]}–{doubleProp[1]} (Doppelseite)
                              </button>

                              {/* Vorschlag 3: Wiederholen & Weiter */}
                              <button
                                type="button"
                                onClick={() => handleSelectBookPages(book.id, [repeatProp[0], repeatProp[1]])}
                                style={{
                                  padding: '4px 10px',
                                  borderRadius: '8px',
                                  border: isRepeatActive ? '1.5px solid #2563eb' : '1px solid #cbd5e1',
                                  background: isRepeatActive ? '#eff6ff' : '#ffffff',
                                  color: isRepeatActive ? '#1d4ed8' : '#334155',
                                  fontSize: '0.74rem',
                                  fontWeight: 800,
                                  cursor: 'pointer'
                                }}
                                className="hover-scale-mini"
                              >
                                S. {repeatProp[0]}–{repeatProp[1]} (Wiederholen & Weiter)
                              </button>

                              {/* Vorschlag 4: 3 Seiten Block */}
                              <button
                                type="button"
                                onClick={() => handleSelectBookPages(book.id, [blockProp[0], blockProp[1], blockProp[2]])}
                                style={{
                                  padding: '4px 10px',
                                  borderRadius: '8px',
                                  border: isBlockActive ? '1.5px solid #2563eb' : '1px solid #cbd5e1',
                                  background: isBlockActive ? '#eff6ff' : '#ffffff',
                                  color: isBlockActive ? '#1d4ed8' : '#334155',
                                  fontSize: '0.74rem',
                                  fontWeight: 800,
                                  cursor: 'pointer'
                                }}
                                className="hover-scale-mini"
                              >
                                S. {blockProp[0]}–{blockProp[2]} (3 Seiten Block)
                              </button>
                            </div>

                            {/* ▾ AUFKLAPPBARES MINI-SEITENRASTER */}
                            {book.isGridOpen && (
                              <TagesplanBookPageMiniGrid
                                totalPages={book.totalPages}
                                selectedPages={book.selectedPages}
                                masteredPages={book.masteredPages || []}
                                pageStatesMap={book.pageStatesMap || {}}
                                onTogglePage={(p) => handleToggleMiniGridPage(book.id, p)}
                                onSelectPages={(pages) => handleSelectBookPages(book.id, pages)}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ========================================================================= */}
              {/* TAB 3: SONGS AUS NOTEN & SONGS                                            */}
              {/* ========================================================================= */}
              {activeTab === 'songs' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 900, color: '#0f172a' }}>
                        Repertoire & Songs des Schülers
                      </h4>
                      <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
                        Auswahl der zu übenden Repertoire-Stücke und Passagen.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowAddSongDrawer(prev => !prev)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '10px',
                        border: '1px solid #cbd5e1',
                        background: '#ffffff',
                        fontSize: '0.76rem',
                        fontWeight: 800,
                        color: '#0f172a',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                      className="hover-scale-mini"
                    >
                      <Plus size={14} />
                      <span>Weiteren Song zuweisen</span>
                    </button>
                  </div>

                  {/* Add Song Drawer */}
                  {showAddSongDrawer && (
                    <div
                      style={{
                        padding: '12px 14px',
                        borderRadius: '14px',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '6px 10px' }}>
                        <Search size={14} color="#64748b" />
                        <input
                          type="text"
                          value={songSearchQuery}
                          onChange={e => setSongSearchQuery(e.target.value)}
                          placeholder="Song in Schul-Repertoire suchen..."
                          style={{ border: 'none', outline: 'none', fontSize: '0.82rem', flex: 1 }}
                        />
                      </div>

                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', maxHeight: '140px', overflowY: 'auto' }}>
                        {allSchoolSongs
                          .filter(s => !songSearchQuery || s.title.toLowerCase().includes(songSearchQuery.toLowerCase()))
                          .map(s => (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => {
                                if (!studentSongs.some(ss => ss.title.toLowerCase() === s.title.toLowerCase())) {
                                  const newSong: StudentSongItem = {
                                    id: `song-${Date.now()}`,
                                    songId: s.id,
                                    title: s.title,
                                    artist: s.artist || '',
                                    status: 'IN_PROGRESS',
                                    isSelected: true,
                                    selectedPassage: 'Intro & Strophe'
                                  };
                                  setStudentSongs(prev => [...prev, newSong]);
                                  handleSelectSongPassage(newSong.id, 'Intro & Strophe');
                                }
                                setShowAddSongDrawer(false);
                              }}
                              style={{
                                padding: '5px 12px',
                                borderRadius: '100px',
                                border: '1px solid #cbd5e1',
                                background: '#ffffff',
                                fontSize: '0.74rem',
                                fontWeight: 700,
                                color: '#0f172a',
                                cursor: 'pointer'
                              }}
                              className="hover-scale-mini"
                            >
                              + {s.artist ? `${s.artist} - ${s.title}` : s.title}
                            </button>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Song Cards mit Passagen-Pills */}
                  {studentSongs.length === 0 ? (
                    <div style={{ padding: '24px', textAlign: 'center', background: '#f8fafc', borderRadius: '16px', color: '#64748b' }}>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: '0.86rem' }}>Keine Songs im aktiven Repertoire.</p>
                      <p style={{ margin: '4px 0 0', fontSize: '0.76rem' }}>Füge oben über den Button einen Song aus dem Schulkatalog hinzu.</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {studentSongs.map(song => (
                        <div
                          key={song.id}
                          style={{
                            padding: '14px 16px',
                            borderRadius: '16px',
                            background: '#ffffff',
                            border: song.isSelected ? '1.5px solid #a855f7' : '1px solid #e2e8f0',
                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div
                                style={{
                                  width: '36px',
                                  height: '36px',
                                  borderRadius: '10px',
                                  background: '#faf5ff',
                                  color: '#9333ea',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}
                              >
                                <Music size={18} />
                              </div>
                              <div>
                                <h5 style={{ margin: 0, fontSize: '0.94rem', fontWeight: 900, color: '#0f172a' }}>
                                  {song.title}
                                </h5>
                                <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>
                                  {song.artist ? `${song.artist} • ` : ''}Status: {song.status === 'MASTERED' ? 'Meisterwerk' : 'In Erarbeitung'}
                                </span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                setStudentSongs(prev => prev.map(s => s.id === song.id ? { ...s, isSelected: !s.isSelected } : s));
                              }}
                              style={{
                                padding: '5px 12px',
                                borderRadius: '100px',
                                border: 'none',
                                background: song.isSelected ? '#a855f7' : '#f1f5f9',
                                color: song.isSelected ? '#ffffff' : '#64748b',
                                fontSize: '0.74rem',
                                fontWeight: 800,
                                cursor: 'pointer'
                              }}
                            >
                              {song.isSelected ? '✓ Im Fahrplan aktiv' : '+ Zum Fahrplan hinzufügen'}
                            </button>
                          </div>

                          {/* Passagen-Auswahl Chips */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', paddingTop: '4px', borderTop: '1px solid #f1f5f9' }}>
                            <span style={{ fontSize: '0.70rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                              Passage:
                            </span>
                            {SONG_PASSAGE_PRESETS.map(preset => {
                              const isPresActive = song.isSelected && song.selectedPassage === preset;
                              return (
                                <button
                                  key={preset}
                                  type="button"
                                  onClick={() => handleSelectSongPassage(song.id, preset)}
                                  style={{
                                    padding: '4px 10px',
                                    borderRadius: '8px',
                                    border: isPresActive ? '1.5px solid #9333ea' : '1px solid #cbd5e1',
                                    background: isPresActive ? '#faf5ff' : '#ffffff',
                                    color: isPresActive ? '#7e22ce' : '#334155',
                                    fontSize: '0.74rem',
                                    fontWeight: 800,
                                    cursor: 'pointer'
                                  }}
                                  className="hover-scale-mini"
                                >
                                  {preset}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ========================================================================= */}
              {/* TAB 4: NOTENSCHNIPSEL (MICROSCORES 1–4 TAKTE)                            */}
              {/* ========================================================================= */}
              {activeTab === 'snippets' && (
                <TagesplanHomeworkScoreSnippetsTab
                  selectedSnippets={selectedSnippets}
                  availableSnippets={allSchoolSnippets}
                  studentInstrument={studentInstrument}
                  onAddSnippet={handleSelectSnippet}
                  onRemoveSnippet={(snippetId) => {
                    setSelectedSnippets(prev => prev.filter(s => s.id !== snippetId));
                  }}
                  onUpdateSnippetBpm={handleUpdateSnippetBpm}
                  onOpenStudioModal={() => setIsStudioModalOpen(true)}
                  onAppendNoteToFahrplan={(line) => {
                    setFahrplanText(prev => prev ? `${prev}\n${line}` : line);
                  }}
                />
              )}

              {/* ========================================================================= */}
              {/* TAB 5: AKUSTIK, METRONOM & AUDIO-MEMO                                     */}
              {/* ========================================================================= */}
              {activeTab === 'audio' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Metronom-Sektion */}
                  <div
                    style={{
                      padding: '16px',
                      borderRadius: '16px',
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '12px'
                    }}
                  >
                    <div>
                      <h5 style={{ margin: 0, fontSize: '0.94rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Clock size={16} color="#059669" />
                        <span>Empfohlenes Zieltempo (BPM)</span>
                      </h5>
                      <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>
                        Zieltempo für das häusliche Üben mit Metronom
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={previewMetronomeClicks}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '8px',
                          border: 'none',
                          background: '#f0fdf4',
                          color: '#047857',
                          fontSize: '0.74rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px'
                        }}
                        className="hover-scale-mini"
                        title="4 Klicks im gewählten Tempo abspielen"
                      >
                        <Volume2 size={13} />
                        <span>Tempo anhören</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setMetronomeBpm(b => Math.max(40, b - 5))}
                        style={{ width: '32px', height: '32px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', fontWeight: 900, cursor: 'pointer' }}
                      >
                        -
                      </button>
                      <span style={{ fontSize: '1.1rem', fontWeight: 900, minWidth: '70px', textAlign: 'center', color: '#065f46' }}>
                        {metronomeBpm} BPM
                      </span>
                      <button
                        type="button"
                        onClick={() => setMetronomeBpm(b => Math.min(240, b + 5))}
                        style={{ width: '32px', height: '32px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', fontWeight: 900, cursor: 'pointer' }}
                      >
                        +
                      </button>

                      <div style={{ display: 'flex', gap: '4px', marginLeft: '6px' }}>
                        {METRONOME_PRESETS.map(preset => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setMetronomeBpm(preset)}
                            style={{
                              padding: '4px 8px',
                              borderRadius: '6px',
                              border: metronomeBpm === preset ? '1.5px solid #059669' : '1px solid #cbd5e1',
                              background: metronomeBpm === preset ? '#ecfdf5' : '#ffffff',
                              color: metronomeBpm === preset ? '#047857' : '#64748b',
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              cursor: 'pointer'
                            }}
                          >
                            {preset}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Audio-Recorder Studio-Karte */}
                  <div
                    style={{
                      padding: '16px',
                      borderRadius: '16px',
                      background: isRecordingAudio ? '#fef2f2' : '#ffffff',
                      border: isRecordingAudio ? '1.5px solid #ef4444' : '1px solid #e2e8f0',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <h5 style={{ margin: 0, fontSize: '0.94rem', fontWeight: 900, color: isRecordingAudio ? '#991b1b' : '#0f172a' }}>
                          Play-Along Audio-Take (Lehrer-Hörbeispiel)
                        </h5>
                        <span style={{ fontSize: '0.74rem', color: isRecordingAudio ? '#b91c1c' : '#64748b', fontWeight: 600 }}>
                          Nimm 1 Klick ein kurzes Audio-Beispiel mit 4-Beat Einzähler für den Schüler auf.
                        </span>
                      </div>

                      {countInRemaining !== null ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#dc2626', fontWeight: 900, fontSize: '1.1rem' }}>
                          <span>Einzähler: {countInRemaining}</span>
                        </div>
                      ) : isRecordingAudio ? (
                        <button
                          type="button"
                          onClick={stopRecording}
                          style={{
                            padding: '8px 16px',
                            borderRadius: '10px',
                            border: 'none',
                            background: '#dc2626',
                            color: '#ffffff',
                            fontWeight: 850,
                            fontSize: '0.82rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            cursor: 'pointer'
                          }}
                        >
                          <Square size={13} fill="#ffffff" />
                          <span>Aufnahme stoppen ({audioRecordSeconds}s)</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={startRecording}
                          style={{
                            padding: '8px 16px',
                            borderRadius: '10px',
                            border: 'none',
                            background: '#15803d',
                            color: '#ffffff',
                            fontWeight: 850,
                            fontSize: '0.82rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            cursor: 'pointer'
                          }}
                        >
                          <Mic size={14} />
                          <span>Hörbeispiel aufnehmen</span>
                        </button>
                      )}
                    </div>

                    {recordedAudioUrl && !isRecordingAudio && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                        <audio
                          ref={audioElemRef}
                          src={recordedAudioUrl}
                          onPlay={() => setIsPlayingAudio(true)}
                          onPause={() => setIsPlayingAudio(false)}
                          onEnded={() => setIsPlayingAudio(false)}
                          controls
                          style={{ height: '36px', flex: 1 }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setRecordedAudioUrl(null);
                            setRecordedAudioBlob(null);
                          }}
                          style={{
                            padding: '6px 10px',
                            borderRadius: '8px',
                            border: '1px solid #cbd5e1',
                            background: '#ffffff',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          Neu aufnehmen
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* ========================================================================= */}
        {/* 🚀 4. FOOTER & SPEICHER-AKTION                                            */}
        {/* ========================================================================= */}
        <div
          style={{
            padding: '16px 24px',
            background: '#ffffff',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap'
          }}
        >
          {/* Summary Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#64748b' }}>
              Zusammenfassung:
            </span>
            <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#0f172a', background: '#f1f5f9', padding: '3px 8px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <BookOpen size={12} className="text-slate-600" />
              <span>{assignedBooks.filter(b => b.isSelected).length === 1 ? '1 Lehrwerk' : `${assignedBooks.filter(b => b.isSelected).length} Lehrwerke`}</span>
            </span>
            <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#0f172a', background: '#f1f5f9', padding: '3px 8px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Music size={12} className="text-slate-600" />
              <span>{studentSongs.filter(s => s.isSelected).length} Songs</span>
            </span>
            <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#0f172a', background: '#f1f5f9', padding: '3px 8px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Sparkles size={12} className="text-emerald-600" />
              <span>{selectedSnippets.length} {selectedSnippets.length === 1 ? 'Schnipsel' : 'Schnipsel'}</span>
            </span>
            <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#0f172a', background: '#f1f5f9', padding: '3px 8px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Clock size={12} className="text-slate-600" />
              <span>{metronomeBpm} BPM</span>
            </span>
            {recordedAudioBlob && (
              <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#15803d', background: '#dcfce7', padding: '3px 8px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Mic size={12} className="text-emerald-700" />
                <span>Audio-Take bereit</span>
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {hasExistingHomework && (
              <button
                type="button"
                onClick={handleDeleteFahrplan}
                disabled={isSaving}
                aria-label="Hausaufgabe für heute löschen"
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px',
                  borderRadius: '12px', border: 'none', background: '#fef2f2', color: '#b91c1c',
                  fontSize: '0.84rem', fontWeight: 800, cursor: isSaving ? 'not-allowed' : 'pointer'
                }}
              >
                <Trash2 size={14} />
                <span>Löschen</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              style={{
                padding: '10px 18px',
                borderRadius: '12px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#475569',
                fontSize: '0.86rem',
                fontWeight: 800,
                cursor: isSaving ? 'not-allowed' : 'pointer'
              }}
            >
              Abbrechen
            </button>

            <button
              type="button"
              onClick={handleSaveHomeworkFahrplan}
              disabled={isSaving || saveSuccess}
              style={{
                padding: '10px 24px',
                borderRadius: '12px',
                border: 'none',
                background: saveSuccess ? '#059669' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#ffffff',
                fontSize: '0.88rem',
                fontWeight: 900,
                cursor: (isSaving || saveSuccess) ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: 'none',
                transition: 'all 0.15s ease'
              }}
              className="hover-scale"
            >
              {saveSuccess ? (
                <>
                  <Check size={16} strokeWidth={3} />
                  <span>Fahrplan erfolgreich zugewiesen!</span>
                </>
              ) : isSaving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Wird autoritativ gespeichert...</span>
                </>
              ) : (
                <>
                  <Check size={16} strokeWidth={3} />
                  <span>Hausaufgaben-Fahrplan verbindlich zuweisen →</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 1–4 Takt Notenschnipsel Studio Modal */}
      {isStudioModalOpen && (
        <MicroScoreStudioModal
          isOpen={isStudioModalOpen}
          onClose={() => setIsStudioModalOpen(false)}
          studentId={effectiveStudentId}
          defaultInstrument={studentInstrument}
          onSaveSnippet={handleSaveStudioSnippet}
        />
      )}
    </div>
  );

  if (effectivePortalTarget && typeof document !== 'undefined') {
    return createPortal(modalMarkup, effectivePortalTarget);
  }

  return modalMarkup;
};

export default TagesplanHomeworkFahrplanModal;
