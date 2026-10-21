/**
 * 🏛️ Campus-Groovelab Homework Lifecycle Helper (0,1% Goldstandard)
 * apps/groovelab/src/utils/homeworkLifecycleHelper.ts
 *
 * Deterministischer Wächter für den didaktischen Lebenszyklus von Hausaufgaben:
 * 1. Lehrer-Profil: Neue Unterrichtsstunde = Tabula Rasa (Leerer Canvas) + Vorwochen-Dock.
 * 2. Schüler-Profil: Bisherige Hausaufgabe bleibt aktiv bis zum neuen Eintrag (mit Vorwochen-Badge).
 */

import { parseHomeworkNotesPayload, formatPageRangeString, cleanHomeworkTitle } from './homeworkSnapshotHelper';

export interface PastWeekHomeworkItem {
  id: string;
  title: string;
  detail?: string;
  type: 'book' | 'song' | 'note' | 'audio';
  bookData?: { title: string; pages: number[]; notes?: string[] };
  songData?: { id?: string; title: string; artist?: string; notes?: string };
  noteData?: string;
  audioData?: { url: string; label: string; duration?: number; date?: string };
}

export interface PastWeekSnapshotInfo {
  weekLabel: string;
  weekIso?: string;
  items: PastWeekHomeworkItem[];
  hasItems: boolean;
}

/**
 * Ermittelt die ISO-8601 Kalenderwoche (z.B. '2026-W42')
 */
export function getIsoWeekString(dateInput?: Date | string | null): string {
  const d = dateInput ? new Date(dateInput) : new Date();
  if (isNaN(d.getTime())) return '';
  const target = new Date(d.valueOf());
  const dayNr = (d.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
  }
  const weekNum = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
  const year = new Date(firstThursday).getFullYear();
  return `${year}-W${String(weekNum).padStart(2, '0')}`;
}

/**
 * Prüft, ob für die aktuelle Kalenderwoche bereits ein neuer, autoritativer Eintrag
 * der Lehrkraft in progress_matrix vorliegt.
 */
export function hasCommittedCurrentWeekEntry(
  progressItems: any[] | undefined,
  currentWeekIso: string,
  currentWeekNum?: string
): boolean {
  if (!progressItems || !Array.isArray(progressItems) || progressItems.length === 0) {
    return false;
  }

  const cleanIso = currentWeekIso || getIsoWeekString();
  const kwNum = currentWeekNum || (cleanIso.includes('-W') ? cleanIso.split('-W')[1] : '');

  // 1. Suche nach dem Wochen-Container für diese KW
  const currentSnapItem = progressItems.find(item => {
    if (!item || !item.topic_name) return false;
    const name = item.topic_name.trim();
    if (kwNum && (name === `Hausaufgabe KW ${kwNum}` || name === `Hausaufgabe KW ${parseInt(kwNum, 10)}`)) {
      return true;
    }
    const itWeek = (item.created_at && getIsoWeekString(item.created_at)) ||
                   (item.updated_at && getIsoWeekString(item.updated_at));
    return Boolean(itWeek && itWeek === cleanIso && name.startsWith('Hausaufgabe KW '));
  });

  if (currentSnapItem) {
    const raw = currentSnapItem.homework_notes || currentSnapItem.teacher_notes;
    if (raw && raw !== '[]' && raw !== '""') {
      const parsed = parseHomeworkNotesPayload(raw);
      if (
        parsed.lehrwerke.length > 0 ||
        parsed.songs.length > 0 ||
        parsed.didacticNotes.length > 0 ||
        parsed.audioItems.length > 0
      ) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Extrahiert sauber die Inhalte der vorherigen Unterrichtsstunde (jüngster vergangener Snapshot)
 * für das interaktive Vorwochen-Dock der Lehrkraft.
 */
export function extractPastWeekSnapshot(
  progressItems: any[] | undefined,
  currentWeekIso?: string,
  currentWeekNum?: string
): PastWeekSnapshotInfo {
  const result: PastWeekSnapshotInfo = {
    weekLabel: 'Vorwoche',
    items: [],
    hasItems: false
  };

  if (!progressItems || !Array.isArray(progressItems) || progressItems.length === 0) {
    return result;
  }

  const cleanCurIso = currentWeekIso || getIsoWeekString();
  const curKwInt = currentWeekNum ? parseInt(currentWeekNum, 10) : (cleanCurIso.includes('-W') ? parseInt(cleanCurIso.split('-W')[1], 10) : NaN);

  // Filtere auf Snapshots, die vor der aktuellen Woche liegen
  const pastCandidates = progressItems.filter(item => {
    if (!item || !item.topic_name || !item.topic_name.startsWith('Hausaufgabe KW ')) return false;
    const kwMatch = item.topic_name.match(/Hausaufgabe KW\s*(\d+)/i);
    if (kwMatch && !isNaN(curKwInt)) {
      const itemKw = parseInt(kwMatch[1], 10);
      return itemKw < curKwInt;
    }
    const itWeek = (item.created_at && getIsoWeekString(item.created_at)) ||
                   (item.updated_at && getIsoWeekString(item.updated_at));
    return Boolean(itWeek && itWeek < cleanCurIso);
  });

  // Sortiere jüngste zuerst
  pastCandidates.sort((a, b) => {
    const kwA = parseInt((a.topic_name.match(/Hausaufgabe KW\s*(\d+)/i) || [])[1] || '0', 10);
    const kwB = parseInt((b.topic_name.match(/Hausaufgabe KW\s*(\d+)/i) || [])[1] || '0', 10);
    if (kwA !== kwB) return kwB - kwA;
    const tA = new Date(a.updated_at || a.created_at || 0).getTime();
    const tB = new Date(b.updated_at || b.created_at || 0).getTime();
    return tB - tA;
  });

  for (const snap of pastCandidates) {
    const raw = snap.homework_notes || snap.teacher_notes;
    if (!raw || raw === '[]' || raw === '""') continue;

    const parsed = parseHomeworkNotesPayload(raw);
    const hasAny = parsed.lehrwerke.length > 0 || parsed.songs.length > 0 || parsed.didacticNotes.length > 0 || parsed.audioItems.length > 0;
    if (!hasAny) continue;

    const kwMatch = snap.topic_name.match(/Hausaufgabe KW\s*(\d+)/i);
    result.weekLabel = kwMatch ? `KW ${kwMatch[1]}` : 'Vorwoche';
    result.weekIso = (snap.created_at && getIsoWeekString(snap.created_at)) || undefined;

    // 1. Lehrwerke
    parsed.lehrwerke.forEach(lw => {
      const pageStr = formatPageRangeString(lw.pages);
      result.items.push({
        id: `book-${cleanHomeworkTitle(lw.title)}`,
        title: lw.title,
        detail: pageStr,
        type: 'book',
        bookData: {
          title: lw.title,
          pages: lw.pages,
          notes: lw.notes
        }
      });
    });

    // 2. Songs
    parsed.songs.forEach(song => {
      const sTitle = cleanHomeworkTitle(song.title || song.topic_name || 'Song');
      result.items.push({
        id: `song-${song.id || sTitle}`,
        title: sTitle,
        detail: song.notes || undefined,
        type: 'song',
        songData: {
          id: song.id,
          title: sTitle,
          notes: song.notes
        }
      });
    });

    // 3. Didaktische Bemerkungen
    parsed.didacticNotes.forEach((dn, idx) => {
      result.items.push({
        id: `note-${idx}`,
        title: dn.length > 40 ? `${dn.slice(0, 40)}…` : dn,
        detail: dn,
        type: 'note',
        noteData: dn
      });
    });

    // 4. Audios
    parsed.audioItems.forEach((audio, idx) => {
      result.items.push({
        id: `audio-${idx}`,
        title: audio.label || `Aufnahme #${idx + 1}`,
        detail: audio.date ? `Vom ${audio.date}` : undefined,
        type: 'audio',
        audioData: {
          url: audio.url,
          label: audio.label,
          duration: audio.duration,
          date: audio.date
        }
      });
    });

    result.hasItems = result.items.length > 0;
    if (result.hasItems) break;
  }

  return result;
}
