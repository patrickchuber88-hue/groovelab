/**
 * Enterprise+ Monolith Goldstandard SSOT Helper: Homework Snapshot Engine
 * 
 * Provides strict TypeScript types and canonical parsing/serialization routines
 * for SNAPSHOT_LEHRWERKE, SNAPSHOT_SONGS, AUDIO tokens, and didactic text notes.
 * Used by TeacherDashboard, TeacherHausaufgabenWidget, and StudentBriefing components.
 */

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

export interface ExtractedHomeworkPayload {
  lehrwerke: ParsedLehrwerkItem[];
  songs: ParsedSongItem[];
  audioItems: ParsedAudioItem[];
  loopItems: ParsedLoopItem[];
  didacticNotes: string[];
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
    'STICKER:',
    'LATENCY:',
    'LATENCY_CALIBRATION:',
    'SYSTEM:',
    'FEEDBACK:',
    'STUDENT_NOTE_PUBLIC:',
    'STUDENT_NOTE_PRIVATE:',
    'STUDENT_QUESTION:',
    '❓ Frage für den Unterricht:'
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
    didacticNotes: []
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
      result.audioItems.push({
        url: parts[0] || '',
        duration: parseFloat(parts[1]) || 60,
        date: parts[2],
        label: parts[3] || 'Aufnahme',
        author: parts[4] === 'student' ? 'student' : 'teacher',
        visibility: parts[5] || 'shared_with_teacher',
        songTag: parts[7] || undefined,
        rawToken: str
      });
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

    // 5. Pure Didactic Notes
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
 * safely combining didactic notes with serialized snapshots and media tokens.
 */
export function buildHomeworkNotesPayload(params: {
  didacticNotes?: string[];
  lehrwerke?: any[];
  songs?: any[];
  rawSnapshotLwToken?: string;
  rawSnapshotSongsToken?: string;
  audioTokens?: string[];
  loopTokens?: string[];
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
    params.audioTokens.forEach(tok => {
      if (tok && !finalNotesList.includes(tok)) finalNotesList.push(tok);
    });
  }
  if (params.loopTokens) {
    params.loopTokens.forEach(tok => {
      if (tok && !finalNotesList.includes(tok)) finalNotesList.push(tok);
    });
  }

  // 3. Lehrwerke Snapshot
  if (params.lehrwerke && params.lehrwerke.length > 0) {
    finalNotesList.push(`SNAPSHOT_LEHRWERKE:${JSON.stringify(params.lehrwerke)}`);
  } else if (params.rawSnapshotLwToken) {
    finalNotesList.push(params.rawSnapshotLwToken);
  }

  // 4. Songs Snapshot
  if (params.songs && params.songs.length > 0) {
    finalNotesList.push(`SNAPSHOT_SONGS:${JSON.stringify(params.songs)}`);
  } else if (params.rawSnapshotSongsToken) {
    finalNotesList.push(params.rawSnapshotSongsToken);
  }

  return JSON.stringify(finalNotesList);
}
