import { isInternalMetadataNote } from '../../../../domain/stickersAndTresor';
import { isDummyOrTestSong, isWeeklySnapshotContainer } from './meisterwerkSongHelpers';

export interface UnpackedAudioNote {
  url: string;
  duration: number;
  date?: string;
  label: string;
  author: string;
  songTag?: string;
  originalIdx: number;
  idx: number;
  isCarriedOver?: boolean;
}

export interface UnpackedLehrwerk {
  title: string;
  pages: number[];
  notes: string[];
}

export function parseRawNotesArray(raw: any): any[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return [raw];
    }
    return [raw];
  }
  return [];
}

export function parseSnapshotLehrwerke(entry: string): UnpackedLehrwerk[] {
  try {
    const sIdx = entry.indexOf('SNAPSHOT_LEHRWERKE:');
    const after = entry.slice(sIdx + 'SNAPSHOT_LEHRWERKE:'.length);
    const endIdx = after.search(/\n\n--- [A-Z_]+ ---|\n\nSNAPSHOT_/);
    const rawJson = (endIdx !== -1 ? after.slice(0, endIdx) : after).trim();
    const parsedLw = JSON.parse(rawJson);
    if (Array.isArray(parsedLw) && parsedLw.length > 0) {
      return parsedLw.map((lw: any) => ({
        title: lw.title || lw.bookTitle || lw.lehrwerkTitle || 'Lehrwerk',
        pages: Array.isArray(lw.pages) ? [...lw.pages].sort((a: number, b: number) => a - b) : (Array.isArray(lw.pageNums) ? [...lw.pageNums].sort((a: number, b: number) => a - b) : []),
        notes: Array.isArray(lw.notes) ? lw.notes : []
      })).filter(lw => lw.title && lw.pages.length > 0);
    }
  } catch (err) {
    console.warn('[MeisterwerkSnapshotUnpacker] Error parsing SNAPSHOT_LEHRWERKE:', err);
  }
  return [];
}

export function parseSnapshotSongs(entry: string): any[] {
  try {
    const sIdx = entry.indexOf('SNAPSHOT_SONGS:');
    const after = entry.slice(sIdx + 'SNAPSHOT_SONGS:'.length);
    const endIdx = after.search(/\n\n--- [A-Z_]+ ---|\n\nSNAPSHOT_/);
    const rawJson = (endIdx !== -1 ? after.slice(0, endIdx) : after).trim();
    const parsedSongs = JSON.parse(rawJson);
    if (Array.isArray(parsedSongs)) {
      return parsedSongs;
    }
  } catch (err) {
    console.warn('[MeisterwerkSnapshotUnpacker] Error parsing SNAPSHOT_SONGS:', err);
  }
  return [];
}

export function parseAudioEntries(entries: string[], isCarriedOver = false): UnpackedAudioNote[] {
  return entries
    .filter((n: any) => typeof n === 'string' && n.includes('AUDIO:'))
    .map((cleanStr: string, index: number) => {
      const parts = cleanStr.substring(cleanStr.indexOf('AUDIO:') + 6).split('|');
      return {
        url: parts[0]?.replace(/^["']|["']$/g, '').trim(),
        duration: parseInt(parts[1] || '0', 10),
        date: parts[2]?.trim(),
        label: parts[3]?.trim() || `Aufnahme #${index + 1}`,
        author: parts[4]?.trim() || 'teacher',
        songTag: parts[7]?.trim() || undefined,
        originalIdx: index,
        idx: index,
        isCarriedOver
      };
    })
    .filter(a => !!a.url);
}

export function parseDidacticTextNotes(entries: string[]): string[] {
  return entries
    .filter((n: any) => {
      if (typeof n !== 'string') return false;
      return !isInternalMetadataNote(n) &&
             !n.startsWith('AUDIO:') &&
             !n.startsWith('STICKER:') &&
             !n.startsWith('LOOP:') &&
             !n.startsWith('SNAPSHOT_') &&
             !n.startsWith('FEEDBACK:') &&
             !n.startsWith('STUDENT_NOTE_') &&
             !n.startsWith('WORLDTOUR_MASTERY:');
    })
    .map((s: string) => s.trim())
    .filter(Boolean);
}
