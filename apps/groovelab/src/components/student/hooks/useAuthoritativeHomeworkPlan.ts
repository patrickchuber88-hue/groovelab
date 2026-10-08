import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { getItemWeek } from '../studentDateUtils';
import {
  deriveJuniorHomeworkSummary,
  cleanTitle as baseCleanTitle,
  isDummyOrTestSong,
  isWeeklySnapshotContainer,
  cleanHomeworkNote,
  formatConsecutivePageRanges
} from '../tabs/briefing/homeworkSummaryHelper';

import { MicroScoreSnippet } from '../meisterwerk/microscore/microScore.types';

export interface AuthoritativeHomeworkBook { title: string; pages: number[]; formattedPages: string; notes?: string[]; book?: any; }
export interface AuthoritativeHomeworkSong { id: string; song_id?: string; title: string; artist?: string; cleanTitle: string; notes?: string; status?: string; is_current_homework?: boolean; }
export interface AuthoritativeAudioTrack { url: string; label?: string; duration?: number; author?: string; date?: string; }
export interface TaskReflectionItem { status: 'super' | 'wackelig' | 'hilfe'; timestamp: string; label?: string; }
export interface AuthoritativeHomeworkPlan {
  books: AuthoritativeHomeworkBook[];
  songs: AuthoritativeHomeworkSong[];
  generalNotes: string[];
  audioTracks: AuthoritativeAudioTrack[];
  microScores: MicroScoreSnippet[];
  studentQuestion: string | null;
  taskReflections: Record<string, TaskReflectionItem>;
  setTaskReflection: (taskId: string, status: 'super' | 'wackelig' | 'hilfe', label?: string) => void;
  hasActiveHomework: boolean;
  isCarriedOver: boolean;
  carriedOverWeek: string | null;
  refresh: () => void;
}
export interface UseAuthoritativeHomeworkPlanParams {
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
  } catch { return null; }
}

function parseSnapshotPayload(
  rawNotes: any,
  books: AuthoritativeHomeworkBook[],
  songs: AuthoritativeHomeworkSong[],
  audio: AuthoritativeAudioTrack[],
  notes: string[],
  microScores: MicroScoreSnippet[] = []
) {
  if (!rawNotes) return;
  let entries: any[] = [];
  try {
    const parsed = typeof rawNotes === 'string' ? JSON.parse(rawNotes) : rawNotes;
    entries = Array.isArray(parsed) ? parsed : [rawNotes];
  } catch { entries = [rawNotes]; }

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
        console.warn('[useAuthoritativeHomeworkPlan] Error parsing MICROSCORE:', err);
      }
      return;
    }
    if (entry.includes('SNAPSHOT_LEHRWERKE:')) {
      const parsedLw = parseDelimitedJson(entry, 'SNAPSHOT_LEHRWERKE:');
      if (Array.isArray(parsedLw)) {
        parsedLw.forEach((lw: any) => {
          const title = cleanAuthoritativeTitle(lw.title || '');
          const pages = Array.isArray(lw.pages) ? [...lw.pages].sort((a: number, b: number) => a - b) : [];
          if (title && pages.length > 0 && !books.some(b => b.title.toLowerCase() === title.toLowerCase())) {
            books.push({ title, pages, formattedPages: formatConsecutivePageRanges(pages), notes: Array.isArray(lw.notes) ? lw.notes : [] });
          }
        });
      }
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
            songs.push({ id: String(song.id || song.song_id || cTitle), song_id: song.song_id || song.id, title: cTitle, cleanTitle: cTitle, artist, notes: cleanHomeworkNote(song.homework_notes || song.notes), is_current_homework: true });
          }
        });
      }
    }
    if (entry.includes('AUDIO:')) {
      const match = entry.match(/AUDIO:\s*([^\s|\]}]+)/);
      if (match && match[1] && !audio.some(a => a.url === match[1])) {
        audio.push({ url: match[1], label: 'Aufnahme deiner Lehrkraft' });
      }
    }
    const cleanN = cleanHomeworkNote(entry);
    if (cleanN && !cleanN.startsWith('Seite ') && cleanN.length > 2 && !notes.includes(cleanN)) {
      notes.push(cleanN);
    }
  });
}

export function useAuthoritativeHomeworkPlan(
  params: UseAuthoritativeHomeworkPlanParams = {}
): AuthoritativeHomeworkPlan {
  const {
    studentId,
    studentUser,
    localProgress = [],
    lehrwerke = [],
    progressItems = [],
    activeSongSkills = [],
    assignedCampusSongs = []
  } = params;

  const effectiveStudentId = studentId || studentUser?.id || 'default';
  const [syncTrigger, setSyncTrigger] = useState(0);

  const [taskReflections, setTaskReflections] = useState<Record<string, TaskReflectionItem>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const raw = localStorage.getItem(`campus_student_task_reflections_${effectiveStudentId}`);
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  });

  const [studentQuestion, setStudentQuestion] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      return localStorage.getItem(`campus_student_question_${effectiveStudentId}`) || null;
    } catch { return null; }
  });

  useEffect(() => {
    const handleSync = () => {
      setSyncTrigger(prev => prev + 1);
      try {
        const rawRefl = localStorage.getItem(`campus_student_task_reflections_${effectiveStudentId}`);
        if (rawRefl) setTaskReflections(JSON.parse(rawRefl));
        const rawQ = localStorage.getItem(`campus_student_question_${effectiveStudentId}`);
        setStudentQuestion(rawQ || null);
      } catch {}
    };

    const evs = ['campus_homework_updated', 'campus_homework_notes_updated', 'campus_student_question_updated', 'campus_homework_reflection_updated', 'storage'];
    evs.forEach(ev => window.addEventListener(ev, handleSync));
    return () => evs.forEach(ev => window.removeEventListener(ev, handleSync));
  }, [effectiveStudentId]);

  const setTaskReflection = useCallback((taskId: string, status: 'super' | 'wackelig' | 'hilfe', label?: string) => {
    let nextStatus: 'super' | 'wackelig' | 'hilfe' | undefined;
    setTaskReflections(prev => {
      const current = prev[taskId]?.status;
      nextStatus = current === status ? undefined : status;
      const next = nextStatus ? { status: nextStatus, timestamp: new Date().toISOString(), label } : undefined;
      const updated = { ...prev };
      if (!next) delete updated[taskId];
      else updated[taskId] = next;
      try {
        localStorage.setItem(`campus_student_task_reflections_${effectiveStudentId}`, JSON.stringify(updated));
      } catch {}
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('campus_homework_reflection_updated', {
          detail: { studentId: effectiveStudentId, taskId, status: next?.status, label }
        }));
      }
      return updated;
    });

    if (effectiveStudentId && effectiveStudentId !== 'default') {
      Promise.resolve(supabase.rpc('save_student_task_reflection', {
        p_student_id: effectiveStudentId,
        p_task_id: taskId,
        p_status: nextStatus || '',
        p_label: label || ''
      })).catch(err => console.warn('[save_student_task_reflection] notice:', err));
    }
  }, [effectiveStudentId]);

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

    const books: AuthoritativeHomeworkBook[] = [...(baseResult.activeJuniorBooks || [])];
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
      if (typeof raw === 'string' && raw.includes('AUDIO:')) {
        const match = raw.match(/AUDIO:\s*([^\s|\]}]+)/);
        if (match && match[1] && !audioTracks.some(a => a.url === match[1])) {
          audioTracks.push({ url: match[1], label: item.topic_name ? `Aufnahme: ${item.topic_name}` : 'Aufnahme deiner Lehrkraft' });
        }
      }
      const cleaned = cleanHomeworkNote(raw);
      if (cleaned && !isWeeklySnapshotContainer(item.topic_name) && !item.topic_name?.startsWith('Hausaufgabe KW ') && !generalNotes.includes(cleaned)) {
        if (!cleaned.startsWith('Seite ') && cleaned.length > 2) generalNotes.push(cleaned);
      }
    });

    if (books.length === 0 || songs.length === 0) {
      const candidates = (progressItems || []).filter((item: any) => item.topic_name?.startsWith('Hausaufgabe KW '));
      candidates.sort((a: any, b: any) => {
        const wA = getItemWeek(a), wB = getItemWeek(b);
        if (wA && wB && wA !== wB) return wB.localeCompare(wA);
        return new Date(b.updated_at || b.created_at || 0).getTime() - new Date(a.updated_at || a.created_at || 0).getTime();
      });

      for (const snapItem of candidates) {
        const rawNotes = snapItem.homework_notes || snapItem.teacher_notes;
        if (!rawNotes) continue;
        const bCount = books.length, sCount = songs.length;
        parseSnapshotPayload(rawNotes, books, songs, audioTracks, generalNotes, microScores);
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
          parseSnapshotPayload(cachedNotes, books, songs, audioTracks, generalNotes, microScores);
          const cachedW = localStorage.getItem(`campus_homework_week_${effectiveStudentId}`);
          if (cachedW) carriedOverWeek = cachedW;
        }
      }
    }

    return { books, songs, generalNotes, audioTracks, microScores, isCarriedOver, carriedOverWeek };
  }, [effectiveStudentId, localProgress, lehrwerke, progressItems, activeSongSkills, assignedCampusSongs, syncTrigger]);

  return {
    books: planData.books,
    songs: planData.songs,
    generalNotes: planData.generalNotes,
    audioTracks: planData.audioTracks,
    microScores: planData.microScores,
    studentQuestion,
    taskReflections,
    setTaskReflection,
    hasActiveHomework: planData.books.length > 0 || planData.songs.length > 0 || planData.generalNotes.length > 0 || planData.microScores.length > 0,
    isCarriedOver: planData.isCarriedOver,
    carriedOverWeek: planData.carriedOverWeek,
    refresh: () => setSyncTrigger(prev => prev + 1)
  };
}
