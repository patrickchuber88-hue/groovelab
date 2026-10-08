/**
 * Enterprise+ Monolith Goldstandard SSOT Helper: Homework Snapshot Engine
 * 
 * Provides strict TypeScript types and canonical parsing/serialization routines
 * for SNAPSHOT_LEHRWERKE, SNAPSHOT_SONGS, AUDIO tokens, and didactic text notes.
 * Used by TeacherDashboard, TeacherHausaufgabenWidget, and StudentBriefing components.
 */

import { supabase } from '../lib/supabase';

export interface LehrwerkCoverColor {
  from: string;
  to: string;
  accent: string;
  border: string;
  badgeBg: string;
  badgeText: string;
}

export interface ParsedLehrwerkItem {
  id?: string;
  title: string;
  pages: number[];
  formattedPages: string;
  notes: string[];
  bookColor?: LehrwerkCoverColor;
  status: 'IN_PROGRESS' | 'MASTERED' | 'THEORY_DONE';
  isBook: true;
}

export interface ParsedSongItem {
  id?: string;
  song_id?: string;
  title: string;
  topic_name: string;
  status: string;
  level?: number;
  bpm?: number;
  recording_url?: string;
  notes?: string;
  isSong: true;
}

export interface ParsedAudioItem {
  url: string;
  duration: number;
  date?: string;
  label: string;
  author: 'teacher' | 'student';
  visibility?: string;
  songTag?: string;
  rawToken: string;
}

export interface ParsedLoopItem {
  url: string;
  duration: number;
  date?: string;
  label: string;
  author: 'teacher' | 'student';
  visibility?: string;
  rawToken: string;
}

export interface ParsedStudentQuestionItem {
  timestamp?: string;
  question: string;
  isArchived?: boolean;
  rawToken: string;
}

export interface ParsedMicroScoreItem {
  id: string;
  title: string;
  snippet: any;
  rawToken: string;
}

export interface ExtractedHomeworkPayload {
  lehrwerke: ParsedLehrwerkItem[];
  songs: ParsedSongItem[];
  audioItems: ParsedAudioItem[];
  loopItems: ParsedLoopItem[];
  microScores: ParsedMicroScoreItem[];
  didacticNotes: string[];
  studentQuestions: ParsedStudentQuestionItem[];
  rawSnapshotLwToken?: string;
  rawSnapshotSongsToken?: string;
}

/**
 * Formats an array of page numbers into a clean, human-readable range string:
 * e.g. [1, 2, 3] -> "S. 1–3", [4, 7] -> "S. 4 & 7", [12] -> "S. 12"
 */
export function formatPageRangeString(pages: number[]): string {
  if (!pages || pages.length === 0) return '';
  const sorted = [...pages].filter(p => typeof p === 'number' && !isNaN(p)).sort((a, b) => a - b);
  if (sorted.length === 0) return '';

  const ranges: string[] = [];
  let start = sorted[0];
  let end = start;

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === end + 1) {
      end = sorted[i];
    } else {
      ranges.push(start === end ? `${start}` : `${start}–${end}`);
      start = sorted[i];
      end = start;
    }
  }
  ranges.push(start === end ? `${start}` : `${start}–${end}`);

  if (ranges.length === 1) return `S. ${ranges[0]}`;
  const last = ranges.pop();
  return `S. ${ranges.join(', ')} & ${last}`;
}

/**
 * Removes instrument annotations like "(Gitarre)", "(Bass)" from titles for clean rendering
 */
export function cleanHomeworkTitle(title: string): string {
  if (!title) return '';
  return title
    .replace(/^campus[- ]song\s*[-–:]\s*/i, '')
    .replace(/^campus[- ]song\s+/i, '')
    .replace(/linken park/gi, 'Linkin Park')
    .replace(/\s*\((gitarre|guitar|e-gitarre|bass|e-bass|drums|schlagzeug|klavier|piano|keys|keyboard|vocals|gesang|stimme|allgemein)\)/i, '')
    .trim();
}

/**
 * Checks if a note string is purely didactic (teacher/student text)
 * and not an internal protocol token like SNAPSHOT_, AUDIO:, STICKER:, etc.
 */
export function isPureDidacticNote(entry: unknown): entry is string {
  if (typeof entry !== 'string') return false;
  const trimmed = entry.trim();
  if (!trimmed) return false;

  const forbiddenPrefixes = [
    'SNAPSHOT_',
    'AUDIO:',
    'LOOP:',
    'MICROSCORE:',
    'STICKER:',
    'LATENCY:',
    'LATENCY_CALIBRATION:',
    'SYSTEM:',
    'FEEDBACK:',
    'STUDENT_NOTE_PUBLIC:',
    'STUDENT_NOTE_PRIVATE:',
    'STUDENT_QUESTION:',
    '❓ Frage für den Unterricht:',
    'EARLAB_SCORE:',
    'EARLAB:',
    'WORLDTOUR_MASTERY:',
    'RHYTHM_SCORE:'
  ];

  return !forbiddenPrefixes.some(pfx => trimmed.startsWith(pfx));
}

/**
 * Cleans a didactic note from potential JSON artifacts or residual tokens
 */
export function sanitizeDidacticText(text: string): string {
  if (!text) return '';
  let clean = text.trim();

  // If accidentally wrapped in JSON
  if (clean.startsWith('[') || clean.startsWith('{') || (clean.startsWith('"') && clean.endsWith('"'))) {
    try {
      const parsed = JSON.parse(clean);
      if (Array.isArray(parsed)) {
        clean = parsed.filter(isPureDidacticNote).join(' ');
      } else if (typeof parsed === 'string') {
        clean = parsed;
      }
    } catch {
      // Keep as-is if parsing fails
    }
  }

  return clean
    .replace(/\["AUDIO:[^"]*"\]/g, '')
    .replace(/AUDIO:[^\s,|]+/g, '')
    .replace(/.*(STUDENT_NOTE_PUBLIC|STUDENT_NOTE_PRIVATE|STUDENT_QUESTION):[^|]*\|/, '')
    .replace(/^STUDENT_QUESTION:[^|]*\|?/i, '')
    .replace(/^❓\s*Frage für den Unterricht:\s*/i, '')
    .trim();
}

/**
 * Parses a homework_notes payload (string or array) into its constituent
 * Lehrwerke, Songs, Audio tracks, and human Didactic Notes.
 */
export function parseHomeworkNotesPayload(rawNotes: unknown): ExtractedHomeworkPayload {
  const result: ExtractedHomeworkPayload = {
    lehrwerke: [],
    songs: [],
    audioItems: [],
    loopItems: [],
    microScores: [],
    didacticNotes: [],
    studentQuestions: []
  };

  if (!rawNotes) return result;

  let rawList: unknown[] = [];
  if (Array.isArray(rawNotes)) {
    rawList = rawNotes;
  } else if (typeof rawNotes === 'string') {
    const trimmed = rawNotes.trim();
    if (!trimmed) return result;
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          rawList = parsed;
        } else {
          rawList = [trimmed];
        }
      } catch {
        rawList = trimmed.split('\n\n').filter(Boolean);
      }
    } else {
      rawList = trimmed.split('\n\n').filter(Boolean);
    }
  }

  rawList.forEach(entry => {
    if (typeof entry !== 'string') return;
    const str = entry.trim();
    if (!str) return;

    // 1. SNAPSHOT_LEHRWERKE
    if (str.includes('SNAPSHOT_LEHRWERKE:')) {
      result.rawSnapshotLwToken = str;
      try {
        const sIdx = str.indexOf('SNAPSHOT_LEHRWERKE:');
        const after = str.slice(sIdx + 'SNAPSHOT_LEHRWERKE:'.length);
        const endIdx = after.search(/\n\n--- [A-Z_]+ ---|\n\nSNAPSHOT_/);
        const jsonStr = (endIdx !== -1 ? after.slice(0, endIdx) : after).trim();
        const parsedLw = JSON.parse(jsonStr);

        if (Array.isArray(parsedLw)) {
          parsedLw.forEach((lw: any) => {
            const title = cleanHomeworkTitle(lw.title || lw.bookTitle || '');
            if (!title) return;
            const pages: number[] = Array.isArray(lw.pages)
              ? lw.pages.filter((p: any) => typeof p === 'number' && !isNaN(p)).sort((a: number, b: number) => a - b)
              : [];
            
            // Avoid duplicates
            if (!result.lehrwerke.some(b => b.title.toLowerCase() === title.toLowerCase())) {
              result.lehrwerke.push({
                id: lw.id,
                title,
                pages,
                formattedPages: formatPageRangeString(pages),
                notes: Array.isArray(lw.notes) ? lw.notes : [],
                bookColor: lw.bookColor || undefined,
                status: lw.status === 'MASTERED' || lw.status === 'THEORY_DONE' ? lw.status : 'IN_PROGRESS',
                isBook: true
              });
            }
          });
        }
      } catch (err) {
        console.warn('[homeworkSnapshotHelper] Error parsing SNAPSHOT_LEHRWERKE:', err);
      }
      return;
    }

    // 2. SNAPSHOT_SONGS
    if (str.includes('SNAPSHOT_SONGS:')) {
      result.rawSnapshotSongsToken = str;
      try {
        const sIdx = str.indexOf('SNAPSHOT_SONGS:');
        const after = str.slice(sIdx + 'SNAPSHOT_SONGS:'.length);
        const endIdx = after.search(/\n\n--- [A-Z_]+ ---|\n\nSNAPSHOT_/);
        const jsonStr = (endIdx !== -1 ? after.slice(0, endIdx) : after).trim();
        const parsedSongs = JSON.parse(jsonStr);

        if (Array.isArray(parsedSongs)) {
          parsedSongs.forEach((song: any) => {
            const rawTitle = song.topic_name || song.title || '';
            const cleanTitle = cleanHomeworkTitle(rawTitle);
            if (!cleanTitle) return;

            if (!result.songs.some(s => s.title.toLowerCase() === cleanTitle.toLowerCase())) {
              result.songs.push({
                id: song.id,
                title: cleanTitle,
                topic_name: rawTitle,
                status: song.status || 'IN_PROGRESS',
                level: song.level || 1,
                bpm: song.bpm,
                recording_url: song.recording_url,
                notes: song.notes,
                isSong: true
              });
            }
          });
        }
      } catch (err) {
        console.warn('[homeworkSnapshotHelper] Error parsing SNAPSHOT_SONGS:', err);
      }
      return;
    }

    // 3. AUDIO Tokens (AUDIO:url|duration|date|label|author|visibility|songTag)
    if (str.startsWith('AUDIO:')) {
      const parts = str.substring(6).split('|');
      const cleanUrl = parts[0]?.replace(/^["']|["']$/g, '').trim() || '';
      if (cleanUrl) {
        const existingIdx = result.audioItems.findIndex(a => a.url === cleanUrl);
        const newItem = {
          url: cleanUrl,
          duration: parseFloat(parts[1]) || 60,
          date: parts[2],
          label: parts[3] || 'Aufnahme',
          author: (parts[4] === 'student' ? 'student' : 'teacher') as 'student' | 'teacher',
          visibility: parts[5] || 'shared_with_teacher',
          songTag: parts[7] || undefined,
          rawToken: str
        };
        if (existingIdx >= 0) {
          // If duplicate URL found, prefer the richer token with metadata
          if (str.includes('|') && !result.audioItems[existingIdx].rawToken.includes('|')) {
            result.audioItems[existingIdx] = newItem;
          }
        } else {
          result.audioItems.push(newItem);
        }
      }
      return;
    }

    // 4. LOOP Tokens (LOOP:url|duration|date|label|author|visibility)
    if (str.startsWith('LOOP:')) {
      const parts = str.substring(5).split('|');
      result.loopItems.push({
        url: parts[0] || '',
        duration: parseFloat(parts[1]) || 8,
        date: parts[2],
        label: parts[3] || 'Loop-Mix',
        author: parts[4] === 'teacher' ? 'teacher' : 'student',
        visibility: parts[5] || 'shared_with_teacher',
        rawToken: str
      });
      return;
    }

    // 5. MICROSCORE Tokens (MICROSCORE:{...})
    if (str.startsWith('MICROSCORE:')) {
      try {
        const jsonStr = str.substring('MICROSCORE:'.length).trim();
        const snippet = JSON.parse(jsonStr);
        if (snippet && typeof snippet === 'object') {
          result.microScores.push({
            id: snippet.id || `snippet-${Date.now()}`,
            title: snippet.title || 'Übungs-Schnipsel',
            snippet,
            rawToken: str
          });
        }
      } catch (err) {
        console.warn('[homeworkSnapshotHelper] Error parsing MICROSCORE token:', err);
      }
      return;
    }

    // 6. STUDENT_QUESTION Tokens (STUDENT_QUESTION:timestamp|question or ❓ Frage für den Unterricht: ...)
    if (str.startsWith('STUDENT_QUESTION:') || str.startsWith('❓ Frage für den Unterricht:')) {
      let timestamp: string | undefined = undefined;
      let question = '';
      if (str.startsWith('STUDENT_QUESTION:')) {
        const withoutPrefix = str.substring('STUDENT_QUESTION:'.length).trim();
        const pipeIdx = withoutPrefix.indexOf('|');
        if (pipeIdx !== -1) {
          timestamp = withoutPrefix.slice(0, pipeIdx).trim();
          question = withoutPrefix.slice(pipeIdx + 1).trim();
        } else {
          question = withoutPrefix;
        }
      } else {
        question = str.replace(/^❓\s*Frage für den Unterricht:\s*/i, '').trim();
      }
      if (question && !result.studentQuestions.some(q => q.question.toLowerCase() === question.toLowerCase())) {
        result.studentQuestions.push({
          timestamp,
          question,
          isArchived: true,
          rawToken: str
        });
      }
      return;
    }

    // 7. Pure Didactic Notes
    if (isPureDidacticNote(str)) {
      const sanitized = sanitizeDidacticText(str);
      if (sanitized && !result.didacticNotes.includes(sanitized)) {
        result.didacticNotes.push(sanitized);
      }
    }
  });

  return result;
}

/**
 * Builds a canonical homework_notes JSON payload for progress_matrix upserts,
 * safely combining didactic notes with serialized snapshots, media tokens, and archived questions.
 */
export function buildHomeworkNotesPayload(params: {
  didacticNotes?: string[];
  lehrwerke?: any[];
  songs?: any[];
  rawSnapshotLwToken?: string;
  rawSnapshotSongsToken?: string;
  audioTokens?: string[];
  loopTokens?: string[];
  microScores?: Array<any | string>;
  studentQuestions?: Array<{ question: string; timestamp?: string } | string>;
}): string {
  const finalNotesList: string[] = [];

  // 1. Text notes
  if (params.didacticNotes && params.didacticNotes.length > 0) {
    params.didacticNotes.forEach(note => {
      const sanitized = sanitizeDidacticText(note);
      if (sanitized && !finalNotesList.includes(sanitized)) {
        finalNotesList.push(sanitized);
      }
    });
  }

  // 2. Audio & Loop tokens
  if (params.audioTokens) {
    const seenAudioUrls = new Set<string>();
    params.audioTokens.forEach(tok => {
      if (!tok) return;
      if (tok.startsWith('AUDIO:')) {
        const cleanUrl = tok.substring(6).split('|')[0]?.replace(/^["']|["']$/g, '').trim();
        if (cleanUrl) {
          if (seenAudioUrls.has(cleanUrl)) return;
          seenAudioUrls.add(cleanUrl);
        }
      }
      if (!finalNotesList.includes(tok)) finalNotesList.push(tok);
    });
  }
  if (params.loopTokens) {
    params.loopTokens.forEach(tok => {
      if (tok && !finalNotesList.includes(tok)) finalNotesList.push(tok);
    });
  }

  // 3. MicroScore tokens
  if (params.microScores) {
    params.microScores.forEach(ms => {
      if (typeof ms === 'string') {
        if (ms && !finalNotesList.includes(ms)) finalNotesList.push(ms);
      } else if (ms && typeof ms === 'object') {
        const rawTok = ms.rawToken || `MICROSCORE:${JSON.stringify(ms.snippet || ms)}`;
        if (!finalNotesList.includes(rawTok)) finalNotesList.push(rawTok);
      }
    });
  }

  // 4. Lehrwerke Snapshot
  if (params.lehrwerke && params.lehrwerke.length > 0) {
    finalNotesList.push(`SNAPSHOT_LEHRWERKE:${JSON.stringify(params.lehrwerke)}`);
  } else if (params.rawSnapshotLwToken) {
    finalNotesList.push(params.rawSnapshotLwToken);
  }

  // 5. Songs Snapshot
  if (params.songs && params.songs.length > 0) {
    finalNotesList.push(`SNAPSHOT_SONGS:${JSON.stringify(params.songs)}`);
  } else if (params.rawSnapshotSongsToken) {
    finalNotesList.push(params.rawSnapshotSongsToken);
  }

  // 6. Student Questions (Archived with timestamp)
  if (params.studentQuestions && params.studentQuestions.length > 0) {
    params.studentQuestions.forEach(q => {
      if (typeof q === 'string') {
        if (q && !finalNotesList.includes(q)) finalNotesList.push(q);
      } else if (q && q.question) {
        const ts = q.timestamp || new Date().toISOString();
        const tok = `STUDENT_QUESTION:${ts}|${q.question.trim()}`;
        if (!finalNotesList.includes(tok)) finalNotesList.push(tok);
      }
    });
  }

  return JSON.stringify(finalNotesList);
}

/**
 * 🏛️ SSOT: Autoritatives Löschen der laufenden Hausaufgabe
 * Bereinigt progress_matrix, deaktiviert Standalone-Hausaufgaben,
 * leert L1/L2 Caches und sendet Realtime-Broadcasts.
 */
export async function deleteCurrentHomeworkAuthoritative(
  studentId: string, 
  currentWeekNum?: string | number
): Promise<void> {
  if (!studentId) return;

  // 1. progress_matrix der aktuellen Woche bereinigen
  if (currentWeekNum) {
    await supabase
      .from('progress_matrix')
      .update({
        is_current_homework: false,
        homework_notes: null,
        updated_at: new Date().toISOString()
      })
      .eq('student_id', studentId)
      .ilike('topic_name', `Hausaufgabe KW ${currentWeekNum}`);
  }

  // 2. Alle aktuell aktiven Hausaufgabenzeilen des Schülers deaktivieren
  await supabase
    .from('progress_matrix')
    .update({
      is_current_homework: false,
      updated_at: new Date().toISOString()
    })
    .eq('student_id', studentId)
    .eq('is_current_homework', true);

  // 3. L1/L2 Caches bereinigen
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(`campus_homework_notes_${studentId}`);
      localStorage.removeItem(`campus_homework_week_${studentId}`);
      const latestKey = `groovelab_student_prep_${studentId}_latest`;
      const latestRaw = localStorage.getItem(latestKey);
      if (latestRaw) {
        const parsed = JSON.parse(latestRaw);
        parsed.currentWeekNotes = [];
        parsed.currentWeekItems = [];
        parsed.parsedCurrentLehrwerke = [];
        parsed.parsedCurrentSongs = [];
        localStorage.setItem(latestKey, JSON.stringify(parsed));
      }
    } catch {}

    window.dispatchEvent(new CustomEvent('campus_homework_updated', { detail: { studentId } }));
    window.dispatchEvent(new CustomEvent('campus_homework_notes_updated', { detail: { studentId } }));
    window.dispatchEvent(new CustomEvent('groovelab_student_prep_updated', { detail: { studentId } }));
    window.dispatchEvent(new CustomEvent('homework-updated', { detail: { studentId } }));
  }
}
