/**
 * 🎵 Meisterwerk Song Matching & Deduplication Helpers (0.1% Goldstandard)
 * Isolated pure functions to eliminate cyclic dependencies and ensure 100% Vite Fast Refresh compliance.
 */

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

export const formatDisplayTitle = (str: string | undefined | null): string => {
  if (!str) return '';
  const cleaned = str
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

  const rawTopic = songOrItem.topic_name || '';
  if (rawTopic && !rawTopic.includes(' - Seite ') && !rawTopic.startsWith('Hausaufgabe KW ')) {
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
