/**
 * 🎵 Meisterwerk Song Matching & Deduplication Helpers (0.1% Goldstandard)
 * Isolated pure functions to eliminate cyclic dependencies and ensure 100% Vite Fast Refresh compliance.
 */

import { isWeeklySnapshotContainer } from '../../tabs/briefing/homeworkSummaryHelper';
export { isWeeklySnapshotContainer };

// 🛡️ Enterprise+ Song Deduplication & Fuzzy Matcher Goldstandard
export const levenshteinDistance = (s1: string, s2: string): number => {
  if (s1 === s2) return 0;
  if (!s1.length) return s2.length;
  if (!s2.length) return s1.length;
  const track = Array(s2.length + 1).fill(null).map(() =>
    Array(s1.length + 1).fill(null));
  for (let i = 0; i <= s1.length; i += 1) {
    track[0][i] = i;
  }
  for (let j = 0; j <= s2.length; j += 1) {
    track[j][0] = j;
  }
  for (let j = 1; j <= s2.length; j += 1) {
    for (let i = 1; i <= s1.length; i += 1) {
      const indicator = s1[i - 1] === s2[j - 1] ? 0 : 1;
      track[j][i] = Math.min(
        track[j][i - 1] + 1,
        track[j - 1][i] + 1,
        track[j - 1][i - 1] + indicator
      );
    }
  }
  return track[s2.length][s1.length];
};

export const normalizeSongStr = (str: string | undefined | null): string => {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/[\u2010-\u2015\u2212\uFF0D]/g, '-') // Normalize en-dash, em-dash etc. to standard hyphen
    .replace(/\s*\([^)]*\)\s*/g, '') // Strip trailing or inline parenthesis like (Akustik), (Live)
    .replace(/[^\w\s-]/g, '') // Remove non-alphanumeric except space and hyphen
    .replace(/\s+/g, ' ')
    .trim();
};

export const stripInstrumentFromTitle = (str: string | undefined | null): string => {
  if (!str) return '';
  return str
    .replace(/^campus[- ]song\s*[-–:]\s*/i, '')
    .replace(/^campus[- ]song\s+/i, '')
    .replace(/[\u2010-\u2015\u2212\uFF0D]/g, '-')
    .replace(/\s*\([^)]*\)\s*$/g, '')
    .trim();
};

export const formatDisplayTitle = (str: string | undefined | null): string => {
  if (!str) return '';
  const cleaned = str
    .replace(/^campus[- ]song\s*[-–:]\s*/i, '')
    .replace(/^campus[- ]song\s+/i, '')
    .replace(/[\u2010-\u2015\u2212\uFF0D]/g, '-')
    .replace(/\s*\([^)]*\)\s*$/g, '')
    .trim();

  return cleaned
    .split(' ')
    .map(word => {
      if (!word) return '';
      if (word === word.toLowerCase()) {
        return word.charAt(0).toUpperCase() + word.slice(1);
      }
      return word;
    })
    .join(' ');
};

export const extractSongArtistAndTitle = (songOrItem: any): {
  artist: string;
  title: string;
  canonical: string;
  displayArtist: string;
  displayTitle: string;
} => {
  if (!songOrItem) return { artist: '', title: '', canonical: '', displayArtist: '', displayTitle: '' };

  let rawArtist = (songOrItem.songs?.artist || songOrItem.artist || '').trim();
  let rawTitle = (songOrItem.songs?.title || songOrItem.song_title || songOrItem.title || '').trim();

  if (/^campus[- ]song$/i.test(rawArtist)) {
    rawArtist = '';
  }
  rawTitle = rawTitle.replace(/^campus[- ]song\s*[-–:]\s*/i, '').replace(/^campus[- ]song\s+/i, '').trim();

  const rawTopic = (songOrItem.topic_name || '').replace(/^campus[- ]song\s*[-–:]\s*/i, '').replace(/^campus[- ]song\s+/i, '').trim();
  if (rawTopic && !rawTopic.includes(' - Seite ') && !rawTopic.startsWith('Hausaufgabe KW ') && !/^hausaufgabe kw\s*\d+/i.test(rawTopic)) {
    const normTopic = rawTopic.replace(/[\u2010-\u2015\u2212\uFF0D]/g, '-');
    if (normTopic.includes(' - ')) {
      const parts = normTopic.split(' - ');
      if (!rawArtist) rawArtist = parts[0]?.trim() || '';
      if (!rawTitle) rawTitle = parts.slice(1).join(' - ').trim() || '';
    } else if (!rawTitle) {
      rawTitle = rawTopic.trim();
    }
  }

  const artist = normalizeSongStr(rawArtist);
  const title = normalizeSongStr(rawTitle);
  const canonical = title || artist;
  const displayArtist = formatDisplayTitle(rawArtist);
  const displayTitle = formatDisplayTitle(rawTitle);

  return { artist, title, canonical, displayArtist, displayTitle };
};

export const areSongsIdentical = (a: any, b: any): boolean => {
  if (!a || !b) return false;
  if (a === b) return true;

  // 1. Direct ID match (database primary key or song_id foreign key)
  const aId = String(a.song_id || a.id || '').trim();
  const bId = String(b.song_id || b.id || '').trim();
  if (aId && bId && aId === bId) return true;

  const infoA = extractSongArtistAndTitle(a);
  const infoB = extractSongArtistAndTitle(b);

  if (!infoA.canonical || !infoB.canonical) return false;

  // 2. Exact match of canonical titles (e.g. "numb" === "numb")
  if (infoA.title && infoB.title && infoA.title === infoB.title) {
    if (infoA.artist && infoB.artist) {
      if (infoA.artist === infoB.artist) return true;
      if (infoA.artist.includes(infoB.artist) || infoB.artist.includes(infoA.artist)) return true;
      // Fuzzy match: Levenshtein distance <= 2 for artist typos ("linken park" vs "linkin park" diff is 1)
      if (levenshteinDistance(infoA.artist, infoB.artist) <= 2) return true;
    } else {
      return true;
    }
  }

  // 3. Full combined strings match (e.g. "linkin park - numb" vs "linken park - numb")
  const fullA = infoA.artist ? `${infoA.artist} - ${infoA.title}` : infoA.title;
  const fullB = infoB.artist ? `${infoB.artist} - ${infoB.title}` : infoB.title;
  if (fullA === fullB) return true;
  if (fullA.includes(fullB) || fullB.includes(fullA)) return true;
  if (levenshteinDistance(fullA, fullB) <= 2) return true;

  return false;
};

/**
 * 🛡️ 0.1% Goldstandard Sanitizer: Filtert Test-, Dummy- und Container-Artefakte heraus.
 */
export const isDummyOrTestSong = (songOrTitle?: any): boolean => {
  if (!songOrTitle) return false;
  const rawTitle = typeof songOrTitle === 'string'
    ? songOrTitle
    : (songOrTitle.title || songOrTitle.topic_name || songOrTitle.song_title || '');
  if (isWeeklySnapshotContainer(rawTitle)) return true;
  const t = rawTitle.trim().toLowerCase();
  const a = (typeof songOrTitle === 'object' ? (songOrTitle.artist || songOrTitle.songs?.artist || '') : '').trim().toLowerCase();
  if (isWeeklySnapshotContainer(a)) return true;
  if (t === 'test' || t === 'test - test' || t === 'test-test' || t === 'unbenannter song' || t === 'song') return true;
  if (a === 'test' && t === 'test') return true;
  if (t === 'campus-song' || t === 'campus song') return true;
  return false;
};

export const collectHomeworkSongsFromSources = ({
  rawItems,
  activeSongSkills,
  assignedCampusSongs,
  studentId,
  getCleanPageNotes
}: {
  rawItems: any[];
  activeSongSkills: any[];
  assignedCampusSongs: any[];
  studentId?: string;
  getCleanPageNotes: (notes: any) => string;
}): any[] => {
  const result: any[] = [];
  const addSong = (candidateSong: any) => {
    if (!candidateSong || isDummyOrTestSong(candidateSong)) return;
    if (isWeeklySnapshotContainer(candidateSong.topic_name) || isWeeklySnapshotContainer(candidateSong.title)) return;
    if (candidateSong.is_campus_active === false || candidateSong.songs?.is_campus_active === false) return;
    const existingIdx = result.findIndex(existing => areSongsIdentical(existing, candidateSong));
    if (existingIdx === -1) {
      result.push(candidateSong);
    } else {
      const existing = result[existingIdx];
      if (!existing.homework_notes && candidateSong.homework_notes) existing.homework_notes = candidateSong.homework_notes;
      if (!existing.topic_name && candidateSong.topic_name) existing.topic_name = candidateSong.topic_name;
    }
  };

  (rawItems || []).forEach(item => {
    if (item.topic_name && item.topic_name.includes(' - Seite ')) return;
    if (item.topic_name && isWeeklySnapshotContainer(item.topic_name)) return;
    if (isDummyOrTestSong(item) || item.is_campus_active === false || item.songs?.is_campus_active === false) return;
    const sId = studentId || 'default';
    const localHw = studentId
      ? (localStorage.getItem(`song_hw_${studentId}_${item.id}`) ??
         (item.song_id ? localStorage.getItem(`song_hw_${studentId}_${item.song_id}`) : null))
      : null;
    if (localHw === 'false') return;
    const isSongHw = localHw === 'true' || (localHw !== 'false' && (Boolean(item.is_current_homework) || Boolean(item.homework_notes) || Boolean(item.teacher_notes)));
    if (!isSongHw) return;

    const cachedNote = localStorage.getItem(`song_note_${sId}_${item.id}`) ||
                       localStorage.getItem(`song_note_${sId}_${item.song_id}`) ||
                       item.homework_notes || item.teacher_notes || '';
    addSong({ ...item, is_current_homework: true, homework_notes: cachedNote });
  });

  (activeSongSkills || []).forEach(skill => {
    if (isDummyOrTestSong(skill) || isDummyOrTestSong(skill.songs)) return;
    if (!skill.songs || skill.songs.is_campus_active !== true || skill.is_campus_active === false) return;
    const sId = studentId || 'default';
    const localHw = studentId
      ? (localStorage.getItem(`song_hw_${sId}_${skill.id}`) ??
         (skill.song_id ? localStorage.getItem(`song_hw_${sId}_${skill.song_id}`) : null) ??
         (skill.songs?.id ? localStorage.getItem(`song_hw_${sId}_${skill.songs.id}`) : null))
      : null;
    if (localHw === 'false') return;
    const isHwInLs = localHw === 'true' || (localHw !== 'false' && Boolean(skill.is_current_homework));
    if (isHwInLs) {
      let songArtist = (skill.songs?.artist || skill.artist || '').trim();
      let songTitle = (skill.songs?.title || skill.title || skill.song_title || 'Song').trim();
      if (/^campus[- ]song$/i.test(songArtist)) {
        songArtist = '';
      }
      songTitle = songTitle.replace(/^campus[- ]song\s*[-–:]\s*/i, '').replace(/^campus[- ]song\s+/i, '').trim();
      if (songTitle.includes(' - Seite ') || isWeeklySnapshotContainer(songTitle)) return;
      if (isDummyOrTestSong(songTitle) || isDummyOrTestSong(songArtist)) return;
      const cleanTitle = stripInstrumentFromTitle(songTitle);
      const fullTitle = songArtist && !cleanTitle.toLowerCase().includes(songArtist.toLowerCase())
        ? `${songArtist} - ${cleanTitle}`
        : `${cleanTitle}`;
      if (isWeeklySnapshotContainer(fullTitle)) return;
      const cachedNote = localStorage.getItem(`song_note_${sId}_${skill.id}`) ||
                         localStorage.getItem(`song_note_${sId}_${skill.song_id}`) ||
                         skill.homework_notes || skill.teacher_notes || '';
      addSong({
        id: skill.id,
        song_id: skill.song_id,
        topic_name: fullTitle,
        is_current_homework: true,
        status: 'IN_PROGRESS',
        homework_notes: cachedNote,
        songs: skill.songs
      });
    }
  });

  (assignedCampusSongs || []).forEach(cSong => {
    if (cSong.is_campus_active === false || cSong.songs?.is_campus_active === false) return;
    const sId = studentId || 'default';
    const localHw = studentId
      ? (localStorage.getItem(`song_hw_${sId}_${cSong.id}`) ??
         (cSong.song_id ? localStorage.getItem(`song_hw_${sId}_${cSong.song_id}`) : null) ??
         (cSong.songs?.id ? localStorage.getItem(`song_hw_${sId}_${cSong.songs.id}`) : null))
      : null;
    if (localHw === 'false') return;
    const isHwInLs = localHw === 'true' || (localHw !== 'false' && Boolean(cSong.is_current_homework));
    if (isHwInLs) {
      let songArtist = (cSong.songs?.artist || cSong.artist || '').trim();
      let songTitle = (cSong.songs?.title || cSong.title || cSong.song_title || 'Song').trim();
      if (/^campus[- ]song$/i.test(songArtist)) {
        songArtist = '';
      }
      songTitle = songTitle.replace(/^campus[- ]song\s*[-–:]\s*/i, '').replace(/^campus[- ]song\s+/i, '').trim();
      if (songTitle.includes(' - Seite ') || isWeeklySnapshotContainer(songTitle)) return;
      if (isDummyOrTestSong(songTitle) || isDummyOrTestSong(songArtist)) return;
      const cleanTitle = stripInstrumentFromTitle(songTitle);
      const fullTitle = songArtist && !cleanTitle.toLowerCase().includes(songArtist.toLowerCase())
        ? `${songArtist} - ${cleanTitle}`
        : `${cleanTitle}`;
      if (isWeeklySnapshotContainer(fullTitle)) return;
      const cachedNote = localStorage.getItem(`song_note_${sId}_${cSong.id}`) ||
                         (cSong.song_id && localStorage.getItem(`song_note_${sId}_${cSong.song_id}`)) ||
                         cSong.homework_notes || cSong.teacher_notes || '';
      addSong({
        id: cSong.id,
        song_id: cSong.song_id || cSong.songs?.id,
        topic_name: fullTitle,
        is_current_homework: true,
        status: 'IN_PROGRESS',
        homework_notes: cachedNote,
        songs: cSong.songs
      });
    }
  });

  return result;
};

