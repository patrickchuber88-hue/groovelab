import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { supabase } from '../../../lib/supabase';
import { getItemWeek, getISOWeek } from '../studentDateUtils';
import {
  deriveJuniorHomeworkSummary,
  cleanTitle as baseCleanTitle,
  isDummyOrTestSong,
  isWeeklySnapshotContainer,
  cleanHomeworkNote,
  formatConsecutivePageRanges,
  extractCanonicalAudioStoragePath,
  isMetadataOrSnapshotNote
} from '../tabs/briefing/homeworkSummaryHelper';
import { deduplicateAndMergeProgressMatrixRows } from '../../../utils/homeworkSnapshotHelper';
import { MicroScoreSnippet } from '../meisterwerk/microscore/microScore.types';

export type TaskReflectionStatus = 'super' | 'wackelig' | 'hilfe' | undefined;

export interface AuthoritativeHomeworkBook {
  title: string;
  pages: number[];
  formattedPages: string;
  notes?: string[];
  book?: any;
}

export interface AuthoritativeHomeworkSong {
  id: string;
  song_id?: string;
  title: string;
  artist?: string;
  cleanTitle: string;
  notes?: string;
  status?: string;
  is_current_homework?: boolean;
}

export interface AuthoritativeAudioTrack {
  url: string;
  label?: string;
  duration?: number;
  author?: string;
  date?: string;
}

export interface TaskReflectionItem {
  status: 'super' | 'wackelig' | 'hilfe';
  timestamp: string;
  label?: string;
}

export interface AuthoritativeHomeworkPlan {
  books: AuthoritativeHomeworkBook[];
  songs: AuthoritativeHomeworkSong[];
  generalNotes: string[];
  audioTracks: AuthoritativeAudioTrack[];
  microScores: MicroScoreSnippet[];
  studentQuestion: string | null;
  taskReflections: Record<string, TaskReflectionItem>;
  completedTasks: Record<string, boolean>;
  hasActiveHomework: boolean;
  isCarriedOver: boolean;
  carriedOverWeek: string | null;
  setTaskReflection: (taskId: string, status: TaskReflectionStatus, label?: string) => Promise<void>;
  setStudentQuestion: (question: string | null) => Promise<void>;
  toggleTaskCompleted: (taskId: string, completed?: boolean) => Promise<void>;
  refresh: () => void;
}

export interface AuthoritativeHomeworkProviderProps {
  children: React.ReactNode;
  studentId?: string | null;
  studentUser?: any;
  localProgress?: any[];
  lehrwerke?: any[];
  progressItems?: any[];
  activeSongSkills?: any[];
  assignedCampusSongs?: any[];
}

export function cleanAuthoritativeTitle(raw?: string | null): string {
  if (!raw || isWeeklySnapshotContainer(raw)) return '';
  const cleaned = baseCleanTitle(raw)
    .replace(/^campus[- ]?song\s*[-–:]\s*/i, '')
    .replace(/^campus[- ]?song\s+/i, '')
    .replace(/linken park/gi, 'Linkin Park')
    .replace(/\s*\((gitarre|guitar|e-gitarre|bass|e-bass|drums|schlagzeug|klavier|piano|keys|keyboard|vocals|gesang|stimme|allgemein)\)/i, '')
    .trim();
  if (isWeeklySnapshotContainer(cleaned)) return '';
  return cleaned;
}

function parseDelimitedJson(entry: string, prefix: string) {
  try {
    const s = entry.slice(entry.indexOf(prefix) + prefix.length);
    const end = s.search(/\n\n--- [A-Z_]+ ---|\n\nSNAPSHOT_/);
    return JSON.parse((end !== -1 ? s.slice(0, end) : s).trim());
  } catch {
    return null;
  }
}

function parseSnapshotPayload(
  rawNotes: any,
  books: AuthoritativeHomeworkBook[],
  songs: AuthoritativeHomeworkSong[],
  audio: AuthoritativeAudioTrack[],
  notes: string[],
  microScores: MicroScoreSnippet[] = [],
  onExtractedQuestion?: (q: string) => void
) {
  if (!rawNotes) return;
  let entries: any[] = [];
  try {
    const parsed = typeof rawNotes === 'string' ? JSON.parse(rawNotes) : rawNotes;
    entries = Array.isArray(parsed) ? parsed : [rawNotes];
  } catch {
    entries = [rawNotes];
  }

  entries.forEach((entry: any) => {
    if (typeof entry !== 'string') return;
    if (entry.includes('MICROSCORE:')) {
      try {
        const jsonIdx = entry.indexOf('MICROSCORE:') + 'MICROSCORE:'.length;
        const parsedMs = JSON.parse(entry.substring(jsonIdx).trim());
        if (parsedMs && !microScores.some(m => m.id === parsedMs.id)) {
          microScores.push(parsedMs);
        }
      } catch (err) {
        console.warn('[AuthoritativeHomeworkContext] Error parsing MICROSCORE:', err);
      }
      return;
    }
    if (entry.includes('SNAPSHOT_LEHRWERKE:')) {
      const parsedLw = parseDelimitedJson(entry, 'SNAPSHOT_LEHRWERKE:');
      if (Array.isArray(parsedLw)) {
        parsedLw.forEach((lw: any) => {
          const rawTitle = lw.title || lw.bookTitle || lw.lehrwerkTitle || '';
          const title = cleanAuthoritativeTitle(rawTitle);
          const pages = Array.isArray(lw.pages) ? [...lw.pages].sort((a: number, b: number) => a - b) : [];
          if (!title || pages.length === 0) return;

          // 🛡️ Zero-Phantom Sanitizer: Kollabiere generisches 'Lehrwerk' in das reale Buch
          if (title.toLowerCase() === 'lehrwerk' && books.some(b => b.title.toLowerCase() !== 'lehrwerk')) {
            const realBook = books.find(b => b.title.toLowerCase() !== 'lehrwerk')!;
            pages.forEach(p => {
              if (!realBook.pages.includes(p)) realBook.pages.push(p);
            });
            realBook.pages.sort((a, b) => a - b);
            realBook.formattedPages = formatConsecutivePageRanges(realBook.pages);
            return;
          }

          const existing = books.find(b => b.title.toLowerCase() === title.toLowerCase());
          if (existing) {
            pages.forEach(p => {
              if (!existing.pages.includes(p)) existing.pages.push(p);
            });
            existing.pages.sort((a, b) => a - b);
            existing.formattedPages = formatConsecutivePageRanges(existing.pages);
          } else {
            books.push({
              title,
              pages,
              formattedPages: formatConsecutivePageRanges(pages),
              notes: Array.isArray(lw.notes) ? lw.notes : []
            });
          }
        });
      }
      return;
    }
    if (entry.includes('SNAPSHOT_SONGS:')) {
      const parsedSongs = parseDelimitedJson(entry, 'SNAPSHOT_SONGS:');
      if (Array.isArray(parsedSongs)) {
        parsedSongs.forEach((song: any) => {
          if (song.is_campus_active === false || isDummyOrTestSong(song)) return;
          const rawSongTitle = song.topic_name || song.title || '';
          if (isWeeklySnapshotContainer(rawSongTitle)) return;
          const cTitle = cleanAuthoritativeTitle(rawSongTitle);
          if (!cTitle || isWeeklySnapshotContainer(cTitle)) return;
          let artist = (song.artist || song.songs?.artist || '').trim();
          if (/^campus[- ]?song$/i.test(artist)) artist = '';
          if (isWeeklySnapshotContainer(artist)) return;
          if (!songs.some(s => s.cleanTitle.toLowerCase() === cTitle.toLowerCase())) {
            songs.push({
              id: String(song.id || song.song_id || cTitle),
              song_id: song.song_id || song.id,
              title: cTitle,
              cleanTitle: cTitle,
              artist,
              notes: cleanHomeworkNote(song.homework_notes || song.notes),
              is_current_homework: true
            });
          }
        });
      }
      return;
    }
    if (entry.includes('AUDIO:')) {
      const cleanStr = entry.startsWith('[') ? entry.replace(/[\[\]"]/g, '') : entry;
      const parts = cleanStr.substring(cleanStr.indexOf('AUDIO:') + 6).split('|');
      const url = (parts[0] || '').replace(/^["']|["']$/g, '').trim();
      const dur = parseInt(parts[1] || '0', 10);
      const date = parts[2]?.trim();
      const label = parts[3]?.trim() || 'Aufnahme deiner Lehrkraft';
      const author = parts[4]?.trim() || 'teacher';
      const canonUrl = extractCanonicalAudioStoragePath(url);
      if (url && !audio.some(a => a.url === url || (canonUrl && extractCanonicalAudioStoragePath(a.url) === canonUrl))) {
        audio.push({ url, label, duration: dur, date, author });
      }
      return;
    }
    if (entry.includes('STUDENT_QUESTION:') || entry.includes('❓ Frage für den Unterricht:')) {
      let qText = '';
      if (entry.includes('STUDENT_QUESTION:')) {
        const withoutPfx = entry.substring(entry.indexOf('STUDENT_QUESTION:') + 'STUDENT_QUESTION:'.length).trim();
        const pipeIdx = withoutPfx.indexOf('|');
        qText = (pipeIdx !== -1 ? withoutPfx.slice(pipeIdx + 1) : withoutPfx).trim();
      } else {
        qText = entry.replace(/^❓\s*Frage für den Unterricht:\s*/i, '').trim();
      }
      if (qText && onExtractedQuestion) {
        onExtractedQuestion(qText);
      }
      return;
    }
    if (isMetadataOrSnapshotNote(entry)) return;
    const cleanN = cleanHomeworkNote(entry);
    if (cleanN && !cleanN.startsWith('Seite ') && cleanN.length > 2 && !notes.includes(cleanN)) {
      notes.push(cleanN);
    }
  });
}

const AuthoritativeHomeworkContext = createContext<AuthoritativeHomeworkPlan | null>(null);

/**
 * 🏛️ 0,1% Enterprise Goldstandard: AuthoritativeHomeworkProvider
 * 
 * Single Source of Truth (SSOT) & Tri-Layer Realtime Synchronization für alle Hausaufgaben:
 * - Layer 1 (In-Memory Context): Single Frame (< 1ms) Parität zwischen allen gemounteten Tabs/Widgets
 * - Layer 2 (Cross-Tab Broadcast): BroadcastChannel('campus_homework_bus') (< 10ms)
 * - Layer 3 (Cross-Device Realtime): Supabase Realtime Broadcast ('campus:homework:STUDENT_ID') (< 100ms)
 * - Autoritative DB-RPCs: save_student_task_reflection & save_student_homework_question
 */
export const AuthoritativeHomeworkProvider: React.FC<AuthoritativeHomeworkProviderProps> = ({
  children,
  studentId,
  studentUser,
  localProgress = [],
  lehrwerke = [],
  progressItems = [],
  activeSongSkills = [],
  assignedCampusSongs = []
}) => {
  const effectiveStudentId = studentId || studentUser?.id || 'default';
  const [syncTrigger, setSyncTrigger] = useState(0);

  // 1. Task-Reflexionen (🟢 Super / 🟡 Wackelig / 🔴 Hilfe)
  const [taskReflections, setTaskReflections] = useState<Record<string, TaskReflectionItem>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const raw = localStorage.getItem(`campus_student_task_reflections_${effectiveStudentId}`);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  // 2. Schüler-Frage für die nächste Stunde
  const [studentQuestion, setStudentQuestionState] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const direct = localStorage.getItem(`campus_student_question_${effectiveStudentId}`);
      if (direct && direct.trim()) return direct.trim();
      const rawNotes = localStorage.getItem(`campus_homework_notes_${effectiveStudentId}`);
      if (rawNotes) {
        const parsed = JSON.parse(rawNotes);
        if (Array.isArray(parsed)) {
          const qEntry = parsed.find((n: any) => typeof n === 'string' && (n.startsWith('STUDENT_QUESTION:') || n.startsWith('❓ Frage für den Unterricht:')));
          if (qEntry) {
            if (qEntry.startsWith('STUDENT_QUESTION:')) {
              const withoutPfx = qEntry.substring(17);
              const pIdx = withoutPfx.indexOf('|');
              return (pIdx !== -1 ? withoutPfx.slice(pIdx + 1) : withoutPfx).trim();
            }
            return qEntry.replace(/^❓\s*Frage für den Unterricht:\s*/i, '').trim();
          }
        }
      }
      return null;
    } catch {
      return null;
    }
  });

  // 3. Erledigte Aufgaben (Checkboxes)
  const [completedTasks, setCompletedTasks] = useState<Record<string, boolean>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const raw = localStorage.getItem(`campus_student_completed_tasks_${effectiveStudentId}`);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  // 🌐 Layer 2 & 3: BroadcastChannel & Supabase Realtime
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    // 1. BroadcastChannel initialisieren (Cross-Tab)
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        const bc = new BroadcastChannel('campus_homework_bus');
        broadcastChannelRef.current = bc;
        bc.onmessage = (event) => {
          const data = event.data;
          if (!data || data.studentId !== effectiveStudentId) return;

          if (data.type === 'TASK_REFLECTION_UPDATED') {
            setTaskReflections(prev => {
              const updated = { ...prev };
              if (data.status) {
                updated[data.taskId] = { status: data.status, timestamp: data.timestamp || new Date().toISOString(), label: data.label };
              } else {
                delete updated[data.taskId];
              }
              return updated;
            });
          } else if (data.type === 'STUDENT_QUESTION_UPDATED') {
            setStudentQuestionState(data.question || null);
          } else if (data.type === 'TASK_COMPLETED_UPDATED') {
            setCompletedTasks(prev => ({
              ...prev,
              [data.taskId]: Boolean(data.completed)
            }));
          } else if (data.type === 'HOMEWORK_REFRESH') {
            setSyncTrigger(prev => prev + 1);
          }
        };
      } catch (err) {
        console.warn('[AuthoritativeHomeworkProvider] BroadcastChannel setup notice:', err);
      }
    }

    // 2. Supabase Realtime Broadcast (Cross-Device)
    let channel: any = null;
    if (effectiveStudentId && effectiveStudentId !== 'default') {
      try {
        channel = supabase.channel(`campus:homework:${effectiveStudentId}`)
          .on('broadcast', { event: 'homework_updated' }, () => {
            setSyncTrigger(prev => prev + 1);
          })
          .subscribe();
      } catch (err) {
        console.warn('[AuthoritativeHomeworkProvider] Supabase Realtime subscription notice:', err);
      }
    }

    // 3. Fallback Window- & Storage-Events
    const handleSync = () => {
      setSyncTrigger(prev => prev + 1);
      try {
        const rawRefl = localStorage.getItem(`campus_student_task_reflections_${effectiveStudentId}`);
        if (rawRefl) setTaskReflections(JSON.parse(rawRefl));
        const rawQ = localStorage.getItem(`campus_student_question_${effectiveStudentId}`);
        if (rawQ && rawQ.trim()) {
          setStudentQuestionState(rawQ.trim());
        } else {
          const rawNotes = localStorage.getItem(`campus_homework_notes_${effectiveStudentId}`);
          if (rawNotes) {
            const parsed = JSON.parse(rawNotes);
            if (Array.isArray(parsed)) {
              const qEntry = parsed.find((n: any) => typeof n === 'string' && (n.startsWith('STUDENT_QUESTION:') || n.startsWith('❓ Frage für den Unterricht:')));
              if (qEntry) {
                if (qEntry.startsWith('STUDENT_QUESTION:')) {
                  const withoutPfx = qEntry.substring(17);
                  const pIdx = withoutPfx.indexOf('|');
                  setStudentQuestionState((pIdx !== -1 ? withoutPfx.slice(pIdx + 1) : withoutPfx).trim());
                  return;
                }
                setStudentQuestionState(qEntry.replace(/^❓\s*Frage für den Unterricht:\s*/i, '').trim());
                return;
              }
            }
          }
          setStudentQuestionState(null);
        }
        const rawComp = localStorage.getItem(`campus_student_completed_tasks_${effectiveStudentId}`);
        if (rawComp) setCompletedTasks(JSON.parse(rawComp));
      } catch {}
    };

    const evs = [
      'campus_homework_updated',
      'campus_homework_notes_updated',
      'campus_student_question_updated',
      'campus_student_question_draft_updated',
      'campus_homework_reflection_updated',
      'storage'
    ];
    evs.forEach(ev => window.addEventListener(ev, handleSync));

    return () => {
      if (broadcastChannelRef.current) {
        try {
          broadcastChannelRef.current.close();
        } catch {}
        broadcastChannelRef.current = null;
      }
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch {}
      }
      evs.forEach(ev => window.removeEventListener(ev, handleSync));
    };
  }, [effectiveStudentId]);

  // ⚡ Mutation: Task Reflection (🟢 Super / 🟡 Wackelig / 🔴 Hilfe)
  const setTaskReflection = useCallback(async (taskId: string, status: TaskReflectionStatus, label?: string) => {
    const timestamp = new Date().toISOString();
    
    // 1. In-Memory Optimistic Update (< 1ms)
    setTaskReflections(prev => {
      const updated = { ...prev };
      if (!status) {
        delete updated[taskId];
      } else {
        updated[taskId] = { status, timestamp, label };
      }
      try {
        localStorage.setItem(`campus_student_task_reflections_${effectiveStudentId}`, JSON.stringify(updated));
      } catch {}
      return updated;
    });

    // 2. Layer 2: BroadcastChannel (Cross-Tab)
    if (broadcastChannelRef.current) {
      try {
        broadcastChannelRef.current.postMessage({
          type: 'TASK_REFLECTION_UPDATED',
          studentId: effectiveStudentId,
          taskId,
          status,
          timestamp,
          label
        });
      } catch {}
    }

    // 3. Lokale Window Events für Abwärtskompatibilität
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('campus_homework_reflection_updated', {
        detail: { studentId: effectiveStudentId, taskId, status, label }
      }));
    }

    // 4. Layer 3 & DB: Revisionssicherer Supabase-RPC
    if (effectiveStudentId && effectiveStudentId !== 'default') {
      try {
        await supabase.rpc('save_student_task_reflection', {
          p_student_id: effectiveStudentId,
          p_task_id: taskId,
          p_status: status || '',
          p_label: label || ''
        });
      } catch (err) {
        console.warn('[save_student_task_reflection] notice:', err);
      }
    }
  }, [effectiveStudentId]);

  // ⚡ Mutation: Schüler-Frage für die nächste Stunde
  const setStudentQuestion = useCallback(async (question: string | null) => {
    const cleanQ = question ? question.trim() : null;

    // 1. In-Memory Optimistic Update
    setStudentQuestionState(cleanQ);
    try {
      if (cleanQ) {
        localStorage.setItem(`campus_student_question_${effectiveStudentId}`, cleanQ);
      } else {
        localStorage.removeItem(`campus_student_question_${effectiveStudentId}`);
      }
    } catch {}

    // 2. Layer 2: BroadcastChannel
    if (broadcastChannelRef.current) {
      try {
        broadcastChannelRef.current.postMessage({
          type: 'STUDENT_QUESTION_UPDATED',
          studentId: effectiveStudentId,
          question: cleanQ
        });
      } catch {}
    }

    // 3. Lokale Window Events
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('campus_student_question_updated', {
        detail: { studentId: effectiveStudentId, question: cleanQ }
      }));
    }

    // 4. Layer 3 & DB: Revisionssicherer Supabase-RPC
    if (effectiveStudentId && effectiveStudentId !== 'default' && cleanQ) {
      try {
        await supabase.rpc('save_student_homework_question', {
          p_student_id: effectiveStudentId,
          p_question_text: cleanQ
        });
      } catch (err) {
        console.warn('[save_student_homework_question] notice:', err);
      }
    }
  }, [effectiveStudentId]);

  // ⚡ Mutation: Erledigungs-Status (Checkbox)
  const toggleTaskCompleted = useCallback(async (taskId: string, completed?: boolean) => {
    let nextVal = false;
    setCompletedTasks(prev => {
      nextVal = completed !== undefined ? completed : !prev[taskId];
      const updated = { ...prev, [taskId]: nextVal };
      try {
        localStorage.setItem(`campus_student_completed_tasks_${effectiveStudentId}`, JSON.stringify(updated));
      } catch {}
      return updated;
    });

    if (broadcastChannelRef.current) {
      try {
        broadcastChannelRef.current.postMessage({
          type: 'TASK_COMPLETED_UPDATED',
          studentId: effectiveStudentId,
          taskId,
          completed: nextVal
        });
      } catch {}
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('campus_homework_updated', {
        detail: { studentId: effectiveStudentId, taskId, completed: nextVal }
      }));
    }
  }, [effectiveStudentId]);

  const refresh = useCallback(() => {
    setSyncTrigger(prev => prev + 1);
    if (broadcastChannelRef.current) {
      try {
        broadcastChannelRef.current.postMessage({
          type: 'HOMEWORK_REFRESH',
          studentId: effectiveStudentId
        });
      } catch {}
    }
  }, [effectiveStudentId]);

  // 🏛️ Kanonische Daten-Ableitung (Pure Aggregation Engine)
  const planData = useMemo(() => {
    void syncTrigger;

    const baseResult = deriveJuniorHomeworkSummary({
      studentId: effectiveStudentId,
      localProgress,
      lehrwerke,
      progressItems,
      activeSongSkills,
      assignedCampusSongs
    });

    // 1. Lehrwerke (Reine Seitenzahlen, z.B. S. 1-3)
    const books: AuthoritativeHomeworkBook[] = (baseResult.activeJuniorBooks || []).map((b: any) => ({
      title: b.title,
      pages: Array.isArray(b.pages) ? [...b.pages].sort((x: number, y: number) => x - y) : [],
      formattedPages: formatConsecutivePageRanges(b.pages),
      notes: b.notes,
      book: b.book
    }));

    // 2. Songs / Repertoire
    const rawSongs = (baseResult.activeJuniorSongs || []).filter(s =>
      !isDummyOrTestSong(s) &&
      !isWeeklySnapshotContainer(s.topic_name) &&
      !isWeeklySnapshotContainer(s.title)
    );

    const songs: AuthoritativeHomeworkSong[] = rawSongs
      .map(s => {
        const cTitle = cleanAuthoritativeTitle(s.topic_name || s.title || 'Song');
        let artist = (s.artist || s.songs?.artist || '').trim();
        if (/^campus[- ]?song$/i.test(artist)) artist = '';
        return {
          id: String(s.id || s.song_id || cTitle),
          song_id: s.song_id || s.songs?.id,
          title: cTitle,
          artist,
          cleanTitle: cTitle,
          notes: cleanHomeworkNote(s.homework_notes || s.teacher_notes),
          status: s.status,
          is_current_homework: true
        };
      })
      .filter(s => s.cleanTitle && !isWeeklySnapshotContainer(s.cleanTitle));

    let isCarriedOver = false;
    let carriedOverWeek: string | null = null;
    const audioTracks: AuthoritativeAudioTrack[] = [];
    const generalNotes: string[] = [];
    const microScores: MicroScoreSnippet[] = [];

    const addAudioTrack = (track: AuthoritativeAudioTrack) => {
      const cleanUrl = (track.url || '').replace(/^["']|["']$/g, '').trim();
      if (!cleanUrl) return;
      const canon = extractCanonicalAudioStoragePath(cleanUrl);
      if (!audioTracks.some(a => a.url === cleanUrl || (canon && extractCanonicalAudioStoragePath(a.url) === canon))) {
        audioTracks.push({ ...track, url: cleanUrl });
      }
    };

    // 1. Identify weekly snapshot containers (sorted newest first, deduplicated verlustfrei)
    const consolidatedItems = deduplicateAndMergeProgressMatrixRows(progressItems || []);
    const candidates = consolidatedItems.filter((item: any) =>
      item.topic_name?.startsWith('Hausaufgabe KW ') &&
      item.is_current_homework !== false &&
      Boolean(item.homework_notes || item.teacher_notes)
    );
    candidates.sort((a: any, b: any) => {
      const wA = getItemWeek(a), wB = getItemWeek(b);
      if (wA && wB && wA !== wB) return wB.localeCompare(wA);
      return new Date(b.updated_at || b.created_at || 0).getTime() - new Date(a.updated_at || a.created_at || 0).getTime();
    });
    const latestSnapshot = candidates[0];

    // 2. 🛡️ 0.1% Goldstandard Audio Scoping: Extract audio strictly from active week snapshot
    if (latestSnapshot) {
      const rawNotes = latestSnapshot.homework_notes || latestSnapshot.teacher_notes;
      if (rawNotes) {
        let entries: any[] = [];
        try {
          const parsed = typeof rawNotes === 'string' ? JSON.parse(rawNotes) : rawNotes;
          entries = Array.isArray(parsed) ? parsed : [rawNotes];
        } catch { entries = [rawNotes]; }

        entries.forEach((ent: any) => {
          if (typeof ent === 'string' && ent.includes('AUDIO:')) {
            const cleanStr = ent.startsWith('[') ? ent.replace(/[\[\]"]/g, '') : ent;
            const parts = cleanStr.substring(cleanStr.indexOf('AUDIO:') + 6).split('|');
            const url = (parts[0] || '').replace(/^["']|["']$/g, '').trim();
            const dur = parseInt(parts[1] || '0', 10);
            const date = parts[2]?.trim();
            const defaultLabel = latestSnapshot.topic_name ? `Aufnahme: ${latestSnapshot.topic_name}` : 'Aufnahme deiner Lehrkraft';
            const label = parts[3]?.trim() || defaultLabel;
            const author = parts[4]?.trim() || 'teacher';
            if (url) addAudioTrack({ url, label, duration: dur, date, author });
          }
        });
      }
    }

    // 3. Fallback: only if no snapshot audio exists, inspect current week items (never historical items!)
    if (audioTracks.length === 0) {
      const currentWeekIso = getISOWeek(new Date());
      (progressItems || []).forEach((item: any) => {
        const itemWk = getItemWeek(item);
        const isThisWeek = (itemWk && itemWk === currentWeekIso) || Boolean(item.is_current_homework && !item.topic_name?.startsWith('Hausaufgabe KW '));
        if (!isThisWeek) return;

        const raw = item.homework_notes || item.teacher_notes;
        if (!raw) return;
        let entries: any[] = [];
        try {
          const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
          entries = Array.isArray(parsed) ? parsed : [raw];
        } catch { entries = [raw]; }

        entries.forEach((ent: any) => {
          if (typeof ent === 'string' && ent.includes('AUDIO:')) {
            const cleanStr = ent.startsWith('[') ? ent.replace(/[\[\]"]/g, '') : ent;
            const parts = cleanStr.substring(cleanStr.indexOf('AUDIO:') + 6).split('|');
            const url = (parts[0] || '').replace(/^["']|["']$/g, '').trim();
            const dur = parseInt(parts[1] || '0', 10);
            const date = parts[2]?.trim();
            const defaultLabel = item.topic_name ? `Aufnahme: ${item.topic_name}` : 'Aufnahme deiner Lehrkraft';
            const label = parts[3]?.trim() || defaultLabel;
            const author = parts[4]?.trim() || 'teacher';
            if (url) addAudioTrack({ url, label, duration: dur, date, author });
          }
        });
      });
    }

    // 4. MicroScores & general didactic notes (strictly without metadata or snapshot tokens)
    (progressItems || []).forEach((item: any) => {
      const raw = item.homework_notes || item.teacher_notes;
      if (!raw) return;
      if (typeof raw === 'string' && raw.includes('MICROSCORE:')) {
        try {
          const jsonIdx = raw.indexOf('MICROSCORE:') + 'MICROSCORE:'.length;
          const parsedMs = JSON.parse(raw.substring(jsonIdx).trim());
          if (parsedMs && !microScores.some(m => m.id === parsedMs.id)) {
            microScores.push(parsedMs);
          }
        } catch {}
      }
      const cleaned = cleanHomeworkNote(raw);
      if (
        cleaned &&
        !isWeeklySnapshotContainer(item.topic_name) &&
        !item.topic_name?.startsWith('Hausaufgabe KW ') &&
        !generalNotes.includes(cleaned)
      ) {
        if (!cleaned.startsWith('Seite ') && cleaned.length > 2 && !isMetadataOrSnapshotNote(cleaned)) {
          generalNotes.push(cleaned);
        }
      }
    });

    // 5. Autoritatives Unpacking des aktiven Wochen-Snapshots (Notes, MicroScores, Audios, Questions)
    let extractedSnapshotQuestion: string | null = null;
    const handleSnapshotQuestion = (q: string) => {
      if (!extractedSnapshotQuestion && q) {
        extractedSnapshotQuestion = q;
      }
    };

    if (latestSnapshot) {
      const rawNotes = latestSnapshot.homework_notes || latestSnapshot.teacher_notes;
      if (rawNotes) {
        parseSnapshotPayload(rawNotes, books, songs, audioTracks, generalNotes, microScores, handleSnapshotQuestion);
      }
    }

    // 5.1 Falls noch keine Bücher oder Songs vorhanden sind, Vorwochen-Kandidaten durchsuchen (Pädagogischer Übertrag)
    if (books.length === 0 || songs.length === 0) {
      for (const snapItem of candidates) {
        if (snapItem === latestSnapshot) continue;
        const rawNotes = snapItem.homework_notes || snapItem.teacher_notes;
        if (!rawNotes) continue;
        const bCount = books.length, sCount = songs.length;
        parseSnapshotPayload(rawNotes, books, songs, audioTracks, generalNotes, microScores, handleSnapshotQuestion);
        if (books.length > bCount || songs.length > sCount) {
          isCarriedOver = true;
          if (!carriedOverWeek) {
            const kwMatch = snapItem.topic_name?.match(/Hausaufgabe KW\s*(\d+)/i);
            if (kwMatch) carriedOverWeek = `KW ${kwMatch[1]}`;
          }
        }
        if (books.length > 0 && songs.length > 0) break;
      }

      if (books.length === 0 && songs.length === 0 && typeof window !== 'undefined') {
        const cachedNotes = localStorage.getItem(`campus_homework_notes_${effectiveStudentId}`);
        if (cachedNotes) {
          parseSnapshotPayload(cachedNotes, books, songs, audioTracks, generalNotes, microScores, handleSnapshotQuestion);
          const cachedW = localStorage.getItem(`campus_homework_week_${effectiveStudentId}`);
          if (cachedW) carriedOverWeek = cachedW;
        }
      }
    }

    // 🛡️ Zero-Phantom Sanitizer: Wenn reale Bücher existieren, kollabiere generisches 'Lehrwerk' restlos
    const hasRealBooks = books.some(b => b.title.toLowerCase() !== 'lehrwerk');
    if (hasRealBooks) {
      const phantomIdx = books.findIndex(b => b.title.toLowerCase() === 'lehrwerk');
      if (phantomIdx !== -1) {
        const phantom = books[phantomIdx];
        const realBook = books.find(b => b.title.toLowerCase() !== 'lehrwerk')!;
        phantom.pages.forEach(p => {
          if (!realBook.pages.includes(p)) realBook.pages.push(p);
        });
        realBook.pages.sort((a, b) => a - b);
        realBook.formattedPages = formatConsecutivePageRanges(realBook.pages);
        books.splice(phantomIdx, 1);
      }
    }

    // Auto-Sync extractedSnapshotQuestion in LocalStorage
    if (extractedSnapshotQuestion && typeof window !== 'undefined') {
      try {
        const currentStored = localStorage.getItem(`campus_student_question_${effectiveStudentId}`);
        if (!currentStored || !currentStored.trim()) {
          localStorage.setItem(`campus_student_question_${effectiveStudentId}`, extractedSnapshotQuestion);
        }
      } catch {}
    }

    return {
      books,
      songs,
      generalNotes,
      audioTracks,
      microScores,
      isCarriedOver,
      carriedOverWeek,
      snapshotQuestion: extractedSnapshotQuestion
    };
  }, [
    effectiveStudentId,
    localProgress,
    lehrwerke,
    progressItems,
    activeSongSkills,
    assignedCampusSongs,
    syncTrigger
  ]);

  const value: AuthoritativeHomeworkPlan = useMemo(() => ({
    books: planData.books,
    songs: planData.songs,
    generalNotes: planData.generalNotes,
    audioTracks: planData.audioTracks,
    microScores: planData.microScores,
    studentQuestion: studentQuestion || planData.snapshotQuestion || null,
    taskReflections,
    completedTasks,
    hasActiveHomework: planData.books.length > 0 || planData.songs.length > 0 || planData.generalNotes.length > 0 || planData.microScores.length > 0,
    isCarriedOver: planData.isCarriedOver,
    carriedOverWeek: planData.carriedOverWeek,
    setTaskReflection,
    setStudentQuestion,
    toggleTaskCompleted,
    refresh
  }), [
    planData,
    studentQuestion,
    taskReflections,
    completedTasks,
    setTaskReflection,
    setStudentQuestion,
    toggleTaskCompleted,
    refresh
  ]);

  return (
    <AuthoritativeHomeworkContext.Provider value={value}>
      {children}
    </AuthoritativeHomeworkContext.Provider>
  );
};

/**
 * ⚡ Hook zum Konsumieren des autoritativen Hausaufgaben-Plans in jedem beliebig verschachtelten Widget.
 */
export function useAuthoritativeHomework(): AuthoritativeHomeworkPlan {
  const context = useContext(AuthoritativeHomeworkContext);
  if (!context) {
    throw new Error('useAuthoritativeHomework must be used within an AuthoritativeHomeworkProvider');
  }
  return context;
}

/**
 * ⚡ Optionaler Hook, der null zurückgibt, falls kein Provider existiert (Fallback-Friendly).
 */
export function useAuthoritativeHomeworkOptional(): AuthoritativeHomeworkPlan | null {
  return useContext(AuthoritativeHomeworkContext);
}

