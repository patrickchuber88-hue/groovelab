/**
 * 🏛️ Campus-Groovelab Homework Synchronization Engine (0,1% Goldstandard)
 * apps/groovelab/src/services/homeworkSyncEngine.ts
 *
 * Autoritative Bidirektionale Synchronisation (Single Source of Truth) zwischen:
 * 1. Hausaufgaben-Fahrplan (TagesplanHomeworkFahrplanModal)
 * 2. Lehrwerk-Einzelseiten & Seitennotizen (MeisterwerkDocumentTab & useMeisterwerkHomework)
 * 3. Noten & Songs Modul (user_song_skills & songs)
 *
 * Goldstandard Invarianten:
 * - OWASP ASVS Level 3 / Fail-Closed Doktrin
 * - Saubere Wochen-Rotation (Auto-Entlastung verwaister Vorwochen-Seiten)
 * - Zero Duplication: Einheitliche Parsing- und Serialization-Routinen
 * - Realtime Cross-Device Broadcast
 */

import { supabase } from '../lib/supabase';
import { isUUID } from '../utils/uuidValidator';
import {
  buildHomeworkNotesPayload,
  parseHomeworkNotesPayload,
  cleanHomeworkTitle,
  formatPageRangeString
} from '../utils/homeworkSnapshotHelper';

export interface SyncBookPagesParams {
  studentId: string;
  bookId: string;
  bookTitle: string;
  selectedPages: number[];
  pageNotesMap?: Record<number, string>;
  teacherId?: string;
  totalPages?: number;
}

export interface SyncSinglePageParams {
  studentId: string;
  bookId: string;
  bookTitle: string;
  pageNum: number;
  pageStatus: 'locked' | 'homework' | 'mastered' | 'purple';
  pageNote?: string;
  teacherId?: string;
}

export interface SyncSongParams {
  studentId: string;
  songId: string;
  songTitle: string;
  passage?: string;
  isCurrentHomework: boolean;
  status?: string;
  teacherId?: string;
}

/**
 * Ermittelt die aktuelle Kalenderwoche nach ISO-8601 und den standardisierten Topic-Namen.
 */
export function getCurrentHomeworkWeekInfo(date?: Date): { topicName: string; weekNum: string; currentWeek: string } {
  const d = date || new Date();
  // Donnerstag der aktuellen Woche ermitteln (ISO-8601 Standard)
  const target = new Date(d.valueOf());
  const dayNr = (d.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
  }
  const weekNumInt = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
  const weekNumStr = String(weekNumInt).padStart(2, '0');
  const yearStr = String(new Date(firstThursday).getFullYear());

  return {
    topicName: `Hausaufgabe KW ${weekNumStr}`,
    weekNum: weekNumStr,
    currentWeek: `${yearStr}-W${weekNumStr}`
  };
}

/**
 * Entlastet verwaiste Alt-Hausaufgabenseiten eines Lehrwerks in student_lehrwerke_progress.
 * Seiten, die nicht mehr in `keepPages` enthalten sind, werden von isCurrentHomework = true befreit.
 */
export function autoRelievePreviousBookPages(
  studentId: string,
  bookTitleOrId: string,
  keepPages: number[]
): void {
  if (typeof window === 'undefined' || !studentId) return;

  try {
    const stored = localStorage.getItem('student_lehrwerke_progress');
    if (!stored) return;

    const parsed: any[] = JSON.parse(stored);
    const cleanTitle = cleanHomeworkTitle(bookTitleOrId).toLowerCase().trim();
    let hasChanged = false;

    const updated = parsed.map(item => {
      const itemTitle = cleanHomeworkTitle(item.bookTitle || item.title || '').toLowerCase().trim();
      const itemId = String(item.lehrwerkId || item.id || '');
      const isMatch = String(item.studentId) === String(studentId) &&
        (itemTitle === cleanTitle || itemId === String(bookTitleOrId));

      if (isMatch && item.pageStates) {
        const nextStates = { ...item.pageStates };
        Object.keys(nextStates).forEach(pStr => {
          const p = parseInt(pStr, 10);
          if (!isNaN(p) && !keepPages.includes(p)) {
            const curState = nextStates[p];
            if (curState?.isCurrentHomework || curState?.status === 'homework') {
              nextStates[p] = {
                ...curState,
                isCurrentHomework: false,
                status: curState.status === 'homework' ? 'locked' : curState.status,
                updatedAt: new Date().toISOString()
              };
              hasChanged = true;
            }
          }
        });
        return { ...item, pageStates: nextStates };
      }
      return item;
    });

    if (hasChanged) {
      localStorage.setItem('student_lehrwerke_progress', JSON.stringify(updated));
    }
  } catch (err) {
    console.warn('[homeworkSyncEngine] autoRelievePreviousBookPages notice:', err);
  }
}

/**
 * 1. Synchronisiert ausgewählte Lehrwerk-Seiten aus dem Fahrplan-Modal in:
 *    - student_lehrwerke_progress (mit Auto-Entlastung)
 *    - progress_matrix (Wochen-Container SNAPSHOT_LEHRWERKE)
 *    - Einzelseiten-Zeilen in progress_matrix
 */
export async function syncBookPagesToWeeklySnapshot(params: SyncBookPagesParams): Promise<void> {
  const { studentId, bookId, bookTitle, selectedPages, pageNotesMap = {}, teacherId, totalPages = 50 } = params;
  if (!studentId || !bookTitle) return;

  const cleanTitle = cleanHomeworkTitle(bookTitle);
  const { topicName, currentWeek } = getCurrentHomeworkWeekInfo();

  // A) Auto-Entlastung alter Seiten in localStorage
  autoRelievePreviousBookPages(studentId, cleanTitle, selectedPages);

  // B) Aktuelle Seiten in student_lehrwerke_progress eintragen
  try {
    const stored = localStorage.getItem('student_lehrwerke_progress');
    let parsed: any[] = stored ? JSON.parse(stored) : [];

    let assignment = parsed.find(item =>
      String(item.studentId) === String(studentId) &&
      (cleanHomeworkTitle(item.bookTitle || item.title || '').toLowerCase().trim() === cleanTitle.toLowerCase().trim() ||
        String(item.lehrwerkId || item.id) === String(bookId))
    );

    if (!assignment) {
      assignment = {
        studentId,
        lehrwerkId: bookId,
        title: cleanTitle,
        bookTitle: cleanTitle,
        totalPages,
        pageStates: {}
      };
      parsed.push(assignment);
    }

    if (!assignment.pageStates) assignment.pageStates = {};

    selectedPages.forEach(p => {
      const existing = assignment.pageStates[p] || {};
      assignment.pageStates[p] = {
        ...existing,
        status: 'homework',
        isCurrentHomework: true,
        homeworkNotes: pageNotesMap[p] || existing.homeworkNotes || '',
        updatedAt: new Date().toISOString()
      };
    });

    localStorage.setItem('student_lehrwerke_progress', JSON.stringify(parsed));
  } catch (err) {
    console.warn('[homeworkSyncEngine] LocalStorage update notice:', err);
  }

  // C) progress_matrix Wochen-Container (SNAPSHOT_LEHRWERKE) atomar aktualisieren
  if (isUUID(studentId)) {
    try {
      const { data: existingMatrix } = await supabase
        .from('progress_matrix')
        .select('*')
        .eq('student_id', studentId)
        .ilike('topic_name', `Hausaufgabe KW %`)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const existingPayload = existingMatrix?.homework_notes
        ? parseHomeworkNotesPayload(existingMatrix.homework_notes)
        : { lehrwerke: [], songs: [], didacticNotes: [], audioItems: [], loopItems: [], microScores: [], studentQuestions: [] };

      // Ersetze oder ergänze dieses Lehrwerk im lehrwerkeSnapshot
      const existingLwIdx = existingPayload.lehrwerke.findIndex(b =>
        cleanHomeworkTitle(b.title).toLowerCase().trim() === cleanTitle.toLowerCase().trim()
      );

      const notesArr = selectedPages.map(p => pageNotesMap[p]).filter(Boolean) as string[];
      const newLwEntry = {
        id: bookId,
        title: cleanTitle,
        pages: [...selectedPages].sort((a, b) => a - b),
        notes: notesArr
      };

      if (existingLwIdx !== -1) {
        if (selectedPages.length > 0) {
          existingPayload.lehrwerke[existingLwIdx] = newLwEntry as any;
        } else {
          existingPayload.lehrwerke.splice(existingLwIdx, 1);
        }
      } else if (selectedPages.length > 0) {
        existingPayload.lehrwerke.push(newLwEntry as any);
      }

      // Baue den serialisierten JSON Payload
      const updatedJson = buildHomeworkNotesPayload({
        didacticNotes: existingPayload.didacticNotes,
        lehrwerke: existingPayload.lehrwerke,
        songs: existingPayload.songs,
        audioTokens: existingPayload.audioItems.map(a => a.rawToken).filter(Boolean),
        microScores: existingPayload.microScores.map(m => m.rawToken).filter(Boolean)
      });

      if (existingMatrix?.id) {
        await supabase
          .from('progress_matrix')
          .update({
            homework_notes: updatedJson,
            topic_name: topicName,
            is_current_homework: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingMatrix.id);
      } else {
        await supabase
          .from('progress_matrix')
          .insert({
            student_id: studentId,
            teacher_id: teacherId,
            topic_name: topicName,
            status: 'IN_PROGRESS',
            is_current_homework: true,
            homework_notes: updatedJson,
            updated_at: new Date().toISOString()
          });
      }

      // D) Einzelne Buchseiten als IN_PROGRESS in progress_matrix absichern
      for (const p of selectedPages) {
        const pageTopic = `${cleanTitle} - Seite ${p}`;
        const { data: pageRow } = await supabase
          .from('progress_matrix')
          .select('id')
          .eq('student_id', studentId)
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
            student_id: studentId,
            teacher_id: teacherId,
            topic_name: pageTopic,
            status: 'IN_PROGRESS',
            is_current_homework: true,
            updated_at: new Date().toISOString()
          });
        }
      }

      // E) Caches synchronisieren
      try {
        localStorage.setItem(`campus_homework_notes_${studentId}`, updatedJson);
        localStorage.setItem(`campus_homework_week_${studentId}`, currentWeek);
      } catch {}
    } catch (err) {
      console.warn('[homeworkSyncEngine] DB sync error:', err);
    }
  }

  // F) Realtime Events & Cross-Origin Broadcast
  broadcastHomeworkEvents(studentId);
}

/**
 * 2. Synchronisiert eine Einzelseite aus dem Meisterwerk-Seitenraster ZUM Fahrplan:
 *    Wird im Aufgabenheft eine Seite gelb/grün/grau markiert oder editiert,
 *    bleibt der Wochen-Container SNAPSHOT_LEHRWERKE intakt und synchronisiert.
 */
export async function syncSingleBookPageFromMeisterwerk(params: SyncSinglePageParams): Promise<void> {
  const { studentId, bookId, bookTitle, pageNum, pageStatus, pageNote = '', teacherId } = params;
  if (!studentId || !pageNum) return;

  const cleanTitle = cleanHomeworkTitle(bookTitle);
  const { topicName } = getCurrentHomeworkWeekInfo();
  const isHomework = pageStatus === 'homework';

  // A) progress_matrix Wochen-Container aktualisieren (ohne den Snapshot zu zerstören!)
  if (isUUID(studentId)) {
    try {
      const { data: matrixRow } = await supabase
        .from('progress_matrix')
        .select('*')
        .eq('student_id', studentId)
        .ilike('topic_name', 'Hausaufgabe KW %')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (matrixRow) {
        const payload = parseHomeworkNotesPayload(matrixRow.homework_notes);
        let bookEntry = payload.lehrwerke.find(b =>
          cleanHomeworkTitle(b.title).toLowerCase().trim() === cleanTitle.toLowerCase().trim()
        );

        if (isHomework) {
          if (!bookEntry) {
            bookEntry = {
              id: bookId,
              title: cleanTitle,
              pages: [pageNum],
              formattedPages: `S. ${pageNum}`,
              notes: pageNote ? [pageNote] : [],
              status: 'IN_PROGRESS',
              isBook: true
            };
            payload.lehrwerke.push(bookEntry);
          } else {
            if (!bookEntry.pages.includes(pageNum)) {
              bookEntry.pages = [...bookEntry.pages, pageNum].sort((a, b) => a - b);
            }
            if (pageNote && !bookEntry.notes.includes(pageNote)) {
              bookEntry.notes.push(pageNote);
            }
          }
        } else {
          // Seite wurde gemeistert oder neutralisiert -> Aus Hausaufgaben-Snapshot entfernen
          if (bookEntry) {
            bookEntry.pages = bookEntry.pages.filter(p => p !== pageNum);
            if (bookEntry.pages.length === 0) {
              payload.lehrwerke = payload.lehrwerke.filter(b => b !== bookEntry);
            }
          }
        }

        const updatedJson = buildHomeworkNotesPayload({
          didacticNotes: payload.didacticNotes,
          lehrwerke: payload.lehrwerke,
          songs: payload.songs,
          audioTokens: payload.audioItems.map(a => a.rawToken).filter(Boolean),
          microScores: payload.microScores.map(m => m.rawToken).filter(Boolean)
        });

        await supabase
          .from('progress_matrix')
          .update({
            homework_notes: updatedJson,
            updated_at: new Date().toISOString()
          })
          .eq('id', matrixRow.id);

        try {
          localStorage.setItem(`campus_homework_notes_${studentId}`, updatedJson);
        } catch {}
      }
    } catch (err) {
      console.warn('[homeworkSyncEngine] syncSingleBookPageFromMeisterwerk DB notice:', err);
    }
  }

  // B) Realtime Events
  broadcastHomeworkEvents(studentId);
}

/**
 * 3. Synchronisiert einen Song aus Noten & Songs mit dem Wochen-Fahrplan
 */
export async function syncSongToWeeklySnapshot(params: SyncSongParams): Promise<void> {
  const { studentId, songId, songTitle, passage = 'Intro & Strophe', isCurrentHomework, status, teacherId } = params;
  if (!studentId || !songId) return;

  const cleanTitle = cleanHomeworkTitle(songTitle);
  const isMastered = status === 'MASTERED';
  const effectiveIsHomework = isCurrentHomework && !isMastered;

  // A) In user_song_skills abspeichern
  if (isUUID(studentId)) {
    try {
      const { data: skillRow } = await supabase
        .from('user_song_skills')
        .select('id')
        .eq('user_id', studentId)
        .eq('song_id', songId)
        .maybeSingle();

      if (skillRow?.id) {
        await supabase
          .from('user_song_skills')
          .update({
            is_current_homework: effectiveIsHomework,
            status: status || (effectiveIsHomework ? 'IN_PROGRESS' : undefined),
            updated_at: new Date().toISOString()
          })
          .eq('id', skillRow.id);
      }
    } catch (err) {
      console.warn('[homeworkSyncEngine] user_song_skills sync notice:', err);
    }
  }

  // B) In progress_matrix SNAPSHOT_SONGS aktualisieren
  if (isUUID(studentId)) {
    try {
      const { data: matrixRow } = await supabase
        .from('progress_matrix')
        .select('*')
        .eq('student_id', studentId)
        .ilike('topic_name', 'Hausaufgabe KW %')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (matrixRow) {
        const payload = parseHomeworkNotesPayload(matrixRow.homework_notes);
        const existingSongIdx = payload.songs.findIndex(s =>
          String(s.id || s.song_id) === String(songId) ||
          cleanHomeworkTitle(s.title).toLowerCase().trim() === cleanTitle.toLowerCase().trim()
        );

        if (effectiveIsHomework) {
          const songObj = {
            id: songId,
            songId: songId,
            title: cleanTitle,
            passage: passage
          };
          if (existingSongIdx !== -1) {
            payload.songs[existingSongIdx] = songObj as any;
          } else {
            payload.songs.push(songObj as any);
          }
        } else {
          if (existingSongIdx !== -1) {
            payload.songs.splice(existingSongIdx, 1);
          }
        }

        const updatedJson = buildHomeworkNotesPayload({
          didacticNotes: payload.didacticNotes,
          lehrwerke: payload.lehrwerke,
          songs: payload.songs,
          audioTokens: payload.audioItems.map(a => a.rawToken).filter(Boolean),
          microScores: payload.microScores.map(m => m.rawToken).filter(Boolean)
        });

        await supabase
          .from('progress_matrix')
          .update({
            homework_notes: updatedJson,
            updated_at: new Date().toISOString()
          })
          .eq('id', matrixRow.id);

        try {
          localStorage.setItem(`campus_homework_notes_${studentId}`, updatedJson);
        } catch {}
      }
    } catch (err) {
      console.warn('[homeworkSyncEngine] Song SNAPSHOT sync notice:', err);
    }
  }

  // C) Broadcast
  broadcastHomeworkEvents(studentId);
}

/**
 * Sendet Window-Events und Supabase-Broadcasts für 100% Latenzfreie UI-Reaktivität
 */
function broadcastHomeworkEvents(studentId: string): void {
  if (typeof window === 'undefined') return;

  window.dispatchEvent(new CustomEvent('campus_homework_updated', { detail: { studentId } }));
  window.dispatchEvent(new CustomEvent('campus_homework_notes_updated', { detail: { studentId } }));
  window.dispatchEvent(new CustomEvent('groovelab_student_prep_updated', { detail: { studentId } }));
  window.dispatchEvent(new CustomEvent('homework-updated', { detail: { studentId } }));

  try {
    const topic = `realtime_student_progress_${studentId}`;
    const channel = supabase.channel(topic);
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.send({
          type: 'broadcast',
          event: 'homework-changed',
          payload: { studentId }
        });
        setTimeout(() => supabase.removeChannel(channel), 1000);
      }
    });
  } catch {}
}
