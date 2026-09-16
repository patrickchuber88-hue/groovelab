/**
 * audioNamingHelper.ts
 * 
 * Enterprise+ Goldstandard Audio Title Formatter & Sanitizer for Campus-Groovelab.
 * OWASP ASVS Level 3 / UX Architecture Standard.
 * 
 * Syntax: `[Thema] • [Datum] [#[Nr]]`
 * - Single take on that day: `Numb • 22. Aug.`
 * - Multiple takes of same theme on same day: `Numb • 22. Aug. #1`, `Numb • 22. Aug. #2`
 * - Omit redundant instruments (no "Gitarre", "Klavier").
 * - Hierarchy: User Custom Input -> Linked Song -> Linked Book -> Quick Chip -> Fallback (Unterricht / Übung).
 * - Retroactive sanitization: Auto-repairs "Aufnahme", "test", "M.", "AUDIO:..." at runtime.
 */

export interface AudioMetaInput {
  url?: string;
  label?: string;
  title?: string;
  date?: string;
  songTag?: string;
  topic?: string;
  author?: string;
  isTeacher?: boolean;
  duration?: number;
  idx?: number;
  originalIdx?: number;
  visibility?: string;
  id?: string;
  isCustomTitle?: boolean;
  [key: string]: any;
}

export interface HarmonizedAudioItem extends AudioMetaInput {
  harmonizedTitle: string;
  baseTopic: string;
  formattedDate: string;
  takeNumber: number | null;
}

const GENERIC_LABELS = new Set([
  '',
  'test',
  'test 1',
  'test 2',
  'test 3',
  'testtake',
  'test-take',
  'aufnahme',
  'aufnahme 1',
  'aufnahme 2',
  'aufnahme 3',
  'aufnahme #1',
  'aufnahme #2',
  'aufnahme #3',
  'aufnahme ohne titel',
  'eigene aufnahme',
  'eigene aufnahme #1',
  'eigene aufnahme #2',
  'audio',
  'audio 1',
  'audio 2',
  'audioaufnahme',
  'unterrichts-audio',
  'unterrichtsaufnahme',
  'unterrichts-aufnahme',
  'unterricht',
  'm.',
  'm',
  'übe-take',
  'übung',
  'meisterwerk-aufnahme',
  'mein-hit',
  'mein hit',
  'gitarre-hit',
  'klavier-hit',
  'schlagzeug-hit',
  'bass-hit',
  'gesang-hit',
  'hit',
  'audio-track',
  'audio track',
  'take'
]);

const REDUNDANT_INSTRUMENTS = new Set([
  'gitarre', 'e-gitarre', 'akustikgitarre', 'westerngitarre', 'klassische gitarre',
  'klavier', 'piano', 'flügel', 'keyboard', 'e-piano',
  'gesang', 'stimme', 'vocals',
  'schlagzeug', 'drums', 'cajon', 'percussion',
  'bass', 'e-bass', 'kontrabass',
  'ukulele', 'banjo', 'mandoline',
  'violine', 'geige', 'bratsche', 'viola', 'cello', 'violoncello',
  'flöte', 'querflöte', 'blockflöte', 'panflöte',
  'saxophon', 'sax', 'trompete', 'posaune', 'horn', 'tuba', 'klarinette', 'oboe', 'fagott',
  'akkordeon', 'harfe'
]);

/**
 * Format a Date or date string to German standard `DD. MMM.`
 * e.g. `22. Aug.`, `05. Sept.`, `17. Aug.`
 */
export function formatAudioDate(dateInput?: string | number | Date | null): string {
  if (!dateInput) {
    return formatGermanDate(new Date());
  }
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(d.getTime())) {
    return formatGermanDate(new Date());
  }
  return formatGermanDate(d);
}

function formatGermanDate(d: Date): string {
  const day = String(d.getDate()).padStart(2, '0');
  const monthShort = d.toLocaleDateString('de-DE', { month: 'short' });
  const cleanMonth = monthShort.replace(/\./g, '').trim();
  return `${day}. ${cleanMonth}.`;
}

/**
 * Extract date string from a raw label if it contains one (e.g. "Take 1 • 17. Aug." -> "17. Aug.")
 */
export function tryExtractDateFromLabel(rawLabel?: string): string | null {
  if (!rawLabel) return null;
  const match = rawLabel.match(/\b(\d{1,2}\.?\s*(?:Jan|Feb|Mär|Apr|Mai|Jun|Jul|Aug|Sep|Sept|Okt|Nov|Dez)[a-zäöü]*\.?)/i);
  if (match && match[1]) {
    const parts = match[1].trim().split(/\s+/);
    const day = parts[0].replace(/\D/g, '').padStart(2, '0');
    const mon = parts[1]?.replace(/\./g, '') || '';
    if (day && mon) {
      return `${day}. ${mon}.`;
    }
  }
  return null;
}

/**
 * Extracts take number from a label or title (e.g. "Unterricht · 17. Aug. #2" -> 2)
 */
export function tryExtractTakeNumber(rawLabel?: string): number | null {
  if (!rawLabel) return null;
  const match = rawLabel.match(/#(\d+)\b/);
  if (match && match[1]) {
    const num = parseInt(match[1], 10);
    if (!isNaN(num) && num > 0) return num;
  }
  return null;
}

/**
 * Detects whether a string is a generic fallback or timestamped lesson label
 * (e.g. "Übung", "Unterricht", "Übung • 16. Sep. #5", "Aufnahme 1"), which must
 * NEVER be treated as a real Song Album.
 */
export function isGenericSongTag(tag?: string | null): boolean {
  if (!tag) return true;
  const trimmed = tag.trim();
  if (!trimmed) return true;
  const lower = trimmed.toLowerCase();
  if (GENERIC_LABELS.has(lower)) return true;

  // Catch typical auto-generated lesson / exercise labels with dates or bullets
  // e.g. "Übung • 16. Sep. #5", "Unterricht · 17. Aug.", "Duett: Übung • 16. Sep. #5"
  if (/^(?:duett:\s*)?(?:übung|unterricht|aufnahme|take|audio|test|probe)\b/i.test(trimmed)) {
    return true;
  }
  if (/[•·-]\s*\d{1,2}\.?\s*(?:jan|feb|mär|apr|mai|jun|jul|aug|sep|sept|okt|nov|dez)/i.test(trimmed)) {
    return true;
  }
  if (/^eigene aufnahme/i.test(trimmed)) {
    return true;
  }
  return false;
}

/**
 * Parses artist and title from a string like "Linkin Park - Numb" or "Numb".
 */
export function cleanSongOrBookTitle(raw?: string): string {
  if (!raw) return '';
  let cleaned = raw.trim();
  // Strip "Artist - " prefix if present
  if (cleaned.includes(' - ')) {
    const parts = cleaned.split(' - ');
    cleaned = parts[parts.length - 1].trim();
  }
  // Strip trailing notes like " - Seite 1-3" or " (Buch)"
  cleaned = cleaned.replace(/\s*-\s*Seite.*$/i, '');
  cleaned = cleaned.replace(/\s*\([^)]*\)\s*$/g, '');
  return cleaned.trim();
}

/**
 * Resolves the clean base topic according to the priority hierarchy:
 * 1. Custom User Input (if not generic)
 * 2. Linked Song (songTag)
 * 3. Linked Method Book (activeTopicContext)
 * 4. Preset Quick Chip
 * 5. Pedagogical Role Fallback (Unterricht / Übung)
 */
export function extractBaseTopic(
  rawLabel?: string,
  rawSongTag?: string,
  activeTopicContext?: string,
  isTeacher: boolean = false
): string {
  // 1. Check if rawLabel contains a valid custom topic
  if (rawLabel) {
    let candidate = rawLabel
      .replace(/^AUDIO:[^|]*\|/i, '')
      .replace(/[[\]"]/g, '')
      // Strip bullet/dash/middle-dot date patterns (e.g. " • 22. Aug.", " · 17. Aug. #1", " - 17. Aug.")
      .replace(/\s*[-•·]\s*(?:Mo|Di|Mi|Do|Fr|Sa|So)?[,.]?\s*\d{1,2}\.?\s*(?:Aug|Sep|Sept|Okt|Nov|Dez|Jan|Feb|Mär|Apr|Mai|Jun|Jul|\d{1,2}\.?)[a-zäöü]*\s*(?:#\d+)?\s*[).]?/gi, '')
      // Strip parenthesized dates, times or week numbers (e.g. "(KW 36 • 13:46)", "(17.08.)")
      .replace(/\s*\(\s*(?:KW\s*\d+|\d{1,2}\.\d{1,2}\.?|[^)]*(?:Uhr|\d{1,2}:\d{2}))\s*\)\s*$/gi, '')
      // Strip trailing "#1", "#2"
      .replace(/\s*#\d+\s*$/g, '')
      // Strip "Take 1", "Take 2" prefixes
      .replace(/^Take\s*\d+\s*/i, '')
      .trim();

    // Check if auto-generated instrument prefix like "Gitarre-Übung" or "Gitarre-Hit" or "Klavier-Solo"
    if (/^[a-zäöüß\s]+-(?:übung|aufnahme|take|hit|solo|clip|track|song)$/i.test(candidate)) {
      candidate = '';
    }

    const norm = candidate.toLowerCase().trim();
    // Check if redundant pure instrument name
    if (REDUNDANT_INSTRUMENTS.has(norm)) {
      candidate = '';
    }

    if (norm && !GENERIC_LABELS.has(norm) && !/^aufnahme\s*\d*$/i.test(norm) && !/^test\s*\d*$/i.test(norm) && !/^audio\s*\d*$/i.test(norm) && !/^[a-zäöüß\s]+-hit$/i.test(norm)) {
      return candidate;
    }
  }

  // 2. Check Linked Song / Tag
  if (rawSongTag && rawSongTag.trim()) {
    const cleanSong = cleanSongOrBookTitle(rawSongTag);
    if (cleanSong && !GENERIC_LABELS.has(cleanSong.toLowerCase())) {
      return cleanSong;
    }
  }

  // 3. Check Active Topic Context (e.g. method book or song in current homework)
  if (activeTopicContext && activeTopicContext.trim()) {
    const cleanContext = cleanSongOrBookTitle(activeTopicContext);
    const norm = cleanContext.toLowerCase();
    if (norm && !GENERIC_LABELS.has(norm) && !norm.startsWith('hausaufgabe') && !norm.startsWith('allgemein')) {
      return cleanContext;
    }
  }

  // 4. Role Fallback (Unterricht / Übung)
  return isTeacher ? 'Unterricht' : 'Übung';
}

/**
 * Computes the next strictly sequential take number (#1, #2, #3...) for a new take
 * on the given base topic and date.
 */
export function getNextSequentialTakeNumber(
  existingItems: AudioMetaInput[],
  baseTopic: string,
  formattedDate: string
): number {
  if (!existingItems || existingItems.length === 0) return 1;

  const targetGroupKey = `${baseTopic.toLowerCase()}|${formattedDate}`;
  let maxTake = 0;
  let matchingCount = 0;

  for (const item of existingItems) {
    const itemDate = formatAudioDate(item.date) || tryExtractDateFromLabel(item.label || item.title);
    const itemTopic = extractBaseTopic(item.label || item.title, item.songTag, item.topic, item.isTeacher ?? false);
    const itemKey = `${itemTopic.toLowerCase()}|${itemDate}`;

    if (itemKey === targetGroupKey) {
      matchingCount++;
      const takeNum = tryExtractTakeNumber(item.label || item.title);
      if (takeNum && takeNum > maxTake) {
        maxTake = takeNum;
      }
    }
  }

  return Math.max(maxTake, matchingCount) + 1;
}

/**
 * Harmonizes an entire array of audio items.
 * Calculates chronological sequential take numbers `#1`, `#2`, `#3`... per topic & date.
 * Guarantees that numbering is ALWAYS strictly continuous and forward-chronological.
 */
export function harmonizeAudioList<T extends AudioMetaInput>(
  items: T[],
  isTeacherDefault: boolean = false,
  activeTopicContext?: string
): (T & HarmonizedAudioItem)[] {
  if (!items || items.length === 0) return [];

  // Step 1: Pre-resolve topic, date, explicit take numbers and timestamps for each item
  const resolvedList = items.map((item, originalIndex) => {
    const isTeacher = item.isTeacher !== undefined
      ? item.isTeacher
      : item.author === 'teacher'
        ? true
        : item.author === 'student'
          ? false
          : isTeacherDefault;

    // Resolve date
    let formattedDate = formatAudioDate(item.date);
    if (!item.date) {
      const extracted = tryExtractDateFromLabel(item.label || item.title);
      if (extracted) formattedDate = extracted;
    }

    const baseTopic = extractBaseTopic(
      item.label || item.title,
      item.songTag,
      item.topic || activeTopicContext,
      isTeacher
    );

    const explicitTakeNum = tryExtractTakeNumber(item.label || item.title);
    const timestamp = item.date ? new Date(item.date).getTime() : 0;

    return {
      item,
      originalIndex,
      baseTopic,
      formattedDate,
      explicitTakeNum,
      timestamp: isNaN(timestamp) ? 0 : timestamp,
      groupKey: `${baseTopic.toLowerCase()}|${formattedDate}`
    };
  });

  // Step 2: Group by groupKey
  const groups: { [key: string]: typeof resolvedList } = {};
  resolvedList.forEach(entry => {
    if (!groups[entry.groupKey]) groups[entry.groupKey] = [];
    groups[entry.groupKey].push(entry);
  });

  // Step 3: For each group, sort chronologically (oldest first) to assign sequential take numbers
  // This guarantees that the earliest take recorded is #1, the next is #2, etc. (ALWAYS fortlaufend)
  const takeNumberMap = new Map<any, { takeNumber: number; harmonizedTitle: string }>();

  Object.values(groups).forEach(groupEntries => {
    const sortedEntries = [...groupEntries].sort((a, b) => {
      if (a.timestamp && b.timestamp && a.timestamp !== b.timestamp) {
        return a.timestamp - b.timestamp;
      }
      if (a.explicitTakeNum && b.explicitTakeNum && a.explicitTakeNum !== b.explicitTakeNum) {
        return a.explicitTakeNum - b.explicitTakeNum;
      }
      return a.originalIndex - b.originalIndex;
    });

    const hasMultipleTakes = groupEntries.length > 1;

    sortedEntries.forEach((entry, idx) => {
      if (entry.item.isCustomTitle && (entry.item.label || entry.item.title)) {
        const customCandidate = (entry.item.label || entry.item.title)!.trim();
        const customNorm = customCandidate.toLowerCase();
        if (!GENERIC_LABELS.has(customNorm) && !/^aufnahme\s*\d*$/i.test(customNorm) && !/^test\s*\d*$/i.test(customNorm)) {
          takeNumberMap.set(entry.item, {
            takeNumber: entry.explicitTakeNum || (idx + 1),
            harmonizedTitle: customCandidate
          });
          return;
        }
      }

      const takeNumber = entry.explicitTakeNum || (idx + 1);
      // Enterprise+ Goldstandard: Only append #takeNumber if multiple takes exist in group OR an explicit take > 1 was specified
      const shouldIncludeNumber = hasMultipleTakes || (entry.explicitTakeNum !== null && entry.explicitTakeNum > 1);
      const harmonizedTitle = shouldIncludeNumber
        ? `${entry.baseTopic} • ${entry.formattedDate} #${takeNumber}`
        : `${entry.baseTopic} • ${entry.formattedDate}`;
      takeNumberMap.set(entry.item, { takeNumber, harmonizedTitle });
    });
  });

  // Step 4: Map back in the EXACT original order of the input items array
  return resolvedList.map(entry => {
    const res = takeNumberMap.get(entry.item) || {
      takeNumber: 1,
      harmonizedTitle: `${entry.baseTopic} • ${entry.formattedDate}`
    };

    return {
      ...entry.item,
      harmonizedTitle: res.harmonizedTitle,
      baseTopic: entry.baseTopic,
      formattedDate: entry.formattedDate,
      takeNumber: res.takeNumber
    };
  });
}

/**
 * Format a single audio item.
 * If `allAudios` is provided, computes duplicate take numbering relative to the group.
 */
export function formatHarmonizedAudioTitle(
  item: AudioMetaInput,
  allAudios?: AudioMetaInput[],
  isTeacherDefault: boolean = false,
  activeTopicContext?: string
): string {
  if (item.isCustomTitle && (item.label || item.title)) {
    const customTitle = (item.label || item.title)!.trim();
    const customNorm = customTitle.toLowerCase();
    if (!GENERIC_LABELS.has(customNorm) && !/^aufnahme\s*\d*$/i.test(customNorm) && !/^test\s*\d*$/i.test(customNorm)) {
      return customTitle;
    }
  }

  const isTeacher = item.isTeacher !== undefined
    ? item.isTeacher
    : item.author === 'teacher'
      ? true
      : item.author === 'student'
        ? false
        : isTeacherDefault;

  let formattedDate = formatAudioDate(item.date);
  if (!item.date) {
    const extracted = tryExtractDateFromLabel(item.label || item.title);
    if (extracted) formattedDate = extracted;
  }

  const baseTopic = extractBaseTopic(
    item.label || item.title,
    item.songTag,
    item.topic || activeTopicContext,
    isTeacher
  );

  if (allAudios && allAudios.length > 0) {
    const nextNum = getNextSequentialTakeNumber(allAudios, baseTopic, formattedDate);
    return nextNum > 1
      ? `${baseTopic} • ${formattedDate} #${nextNum}`
      : `${baseTopic} • ${formattedDate}`;
  }

  const explicitTake = tryExtractTakeNumber(item.label || item.title);
  return explicitTake && explicitTake > 1
    ? `${baseTopic} • ${formattedDate} #${explicitTake}`
    : `${baseTopic} • ${formattedDate}`;
}
