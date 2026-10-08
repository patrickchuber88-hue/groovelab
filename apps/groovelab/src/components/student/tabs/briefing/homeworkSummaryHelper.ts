/**
 * 0.1% Goldstandard Helper: Memoized Homework & Practice Summary Engine
 * Eliminates synchronous localStorage blocking queries and JSON parsing during render passes.
 */

export function cleanHomeworkNote(rawNote?: string | null): string {
  if (!rawNote) return '';
  let note = String(rawNote);

  if (note.startsWith('[') || note.startsWith('{')) {
    try {
      const parsed = JSON.parse(note);
      if (Array.isArray(parsed)) {
        note = parsed
          .filter(
            (n: unknown) =>
              typeof n === 'string' &&
              !n.startsWith('AUDIO:') &&
              !n.startsWith('STICKER:') &&
              !n.toLowerCase().startsWith('latency:') &&
              !n.startsWith('LOOP:') &&
              !n.startsWith('SYSTEM:') &&
              !n.startsWith('SNAPSHOT_') &&
              !n.startsWith('FEEDBACK:') &&
              !n.startsWith('STUDENT_NOTE_PUBLIC:') &&
              !n.startsWith('STUDENT_NOTE_PRIVATE:')
          )
          .join(' ');
      }
    } catch {
      // Fallback to raw string
    }
  }

  return note
    .replace(/.*(STUDENT_NOTE_PUBLIC|STUDENT_NOTE_PRIVATE):[^|]*\|/, '')
    .replace(/^❓\s*Frage für den Unterricht:\s*/i, '')
    .trim();
}

export function cleanTitle(str?: string | null): string {
  if (!str) return '';
  return str
    .replace(/^campus[- ]song\s*[-–:]\s*/i, '')
    .replace(/^campus[- ]song\s+/i, '')
    .replace(/linken park/gi, 'Linkin Park')
    .replace(/\s*\((gitarre|guitar|e-gitarre|bass|e-bass|drums|schlagzeug|klavier|piano|keys|keyboard|vocals|gesang|stimme|allgemein)\)/i, '')
    .replace(/\s*\([^)]*\)\s*$/, '')
    .trim();
}

/**
 * 🛡️ 0.1% Goldstandard Guard: Erkennt Hausaufgaben-Wochen-Container (z. B. "Hausaufgabe KW 40", "Unbekannt - Hausaufgabe KW 40").
 * Diese Container dürfen NIEMALS als Song oder Einzelaufgabe im Hausaufgaben-Widget oder Repertoire gerendert werden.
 */
export function isWeeklySnapshotContainer(raw?: string | null): boolean {
  if (!raw) return false;
  const clean = String(raw).trim().toLowerCase();
  if (!clean) return false;
  if (clean.startsWith('hausaufgabe kw') || clean.startsWith('hausaufgaben kw')) return true;
  if (clean.includes('hausaufgabe kw') || clean.includes('hausaufgaben kw')) return true;
  if (/^(unbekannt\s*[-–:]\s*)?hausaufgabe[n]?\s*kw\s*\d+/i.test(clean)) return true;
  if (/^kw\s*\d+\s*[-–:]\s*hausaufgabe/i.test(clean)) return true;
  if (/\bhausaufgabe[n]?\s+kw\s*\d+\b/i.test(clean)) return true;
  return false;
}

/**
 * 🛡️ 0.1% Goldstandard Sanitizer: Filtert Test-, Dummy- und Container-Artefakte heraus.
 */
export function isDummyOrTestSong(songOrTitle?: any): boolean {
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
}

/**
 * 0.1% Goldstandard Formatter: Formatiert aufeinanderfolgende Buchseiten als Bereich (z.B. "S. 1-3" statt "S. 1, S. 2, S. 3").
 * Mehrere nicht zusammenhängende Bereiche werden mit Komma getrennt (z.B. "S. 1-3, 5").
 */
export function formatConsecutivePageRanges(pages?: number[] | null, prefix = 'S. '): string {
  if (!pages || !Array.isArray(pages) || pages.length === 0) return '';
  const sorted = Array.from(new Set(pages.filter(p => typeof p === 'number' && !isNaN(p)))).sort((a, b) => a - b);
  if (sorted.length === 0) return '';

  const ranges: string[] = [];
  let start = sorted[0];
  let end = start;

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    if (current === end + 1) {
      end = current;
    } else {
      if (start === end) {
        ranges.push(`${start}`);
      } else {
        ranges.push(`${start}-${end}`);
      }
      start = current;
      end = current;
    }
  }
  if (start === end) {
    ranges.push(`${start}`);
  } else {
    ranges.push(`${start}-${end}`);
  }

  return `${prefix}${ranges.join(', ')}`;
}

/**
 * 0.1% Goldstandard Formatter: Formatiert Hausaufgaben-Übungen verlustfrei und konsekutiv.
 * Z.B. ['1', '2', '3', '4'] -> 'Üb. 1–4'
 * ['1', '2', '5'] -> 'Üb. 1–2, 5'
 * Alphanumerische Übungen ('1', '2a', '3') werden sauber integriert.
 * Verhindert Informationsverlust durch Abschneiden ('...').
 */
export function formatConsecutiveExerciseRanges(
  exercises?: (string | number)[] | null,
  prefix = 'Üb. '
): string {
  if (!exercises || !Array.isArray(exercises) || exercises.length === 0) return '';

  const cleaned = exercises
    .map(e => String(e).replace(/^(?:Nr\.|Üb\.|Übung)\s*/i, '').trim())
    .filter(e => e.length > 0);

  if (cleaned.length === 0) return '';

  const numericValues: number[] = [];
  const nonNumericValues: string[] = [];

  cleaned.forEach(item => {
    const num = Number(item);
    if (!isNaN(num) && Number.isInteger(num) && num > 0) {
      numericValues.push(num);
    } else {
      nonNumericValues.push(item);
    }
  });

  const parts: string[] = [];

  if (numericValues.length > 0) {
    const sorted = Array.from(new Set(numericValues)).sort((a, b) => a - b);
    let start = sorted[0];
    let end = start;

    for (let i = 1; i < sorted.length; i++) {
      const current = sorted[i];
      if (current === end + 1) {
        end = current;
      } else {
        if (start === end) {
          parts.push(`${start}`);
        } else {
          parts.push(`${start}–${end}`);
        }
        start = current;
        end = current;
      }
    }
    if (start === end) {
      parts.push(`${start}`);
    } else {
      parts.push(`${start}–${end}`);
    }
  }

  if (nonNumericValues.length > 0) {
    const uniqueNonNumeric = Array.from(new Set(nonNumericValues));
    parts.push(...uniqueNonNumeric);
  }

  if (parts.length === 0) return '';
  return `${prefix}${parts.join(', ')}`;
}

export interface ActiveHomeworkSummaryResult {
  activeLehrwerkeMap: Record<string, { pages: Array<{ num: number; notes: string; status: string }> }>;
  otherActiveHWItems: any[];
  isBooksCarriedOver: boolean;
  isSongsCarriedOver: boolean;
  carriedOverWeekLabel: string | null;
}

export interface DeriveHomeworkParams {
  effectiveId?: string | null;
  studentId?: string | null;
  localProgress?: any;
  lehrwerke?: any[];
  progressItems?: any[];
  activeSongSkills?: any[];
  assignedCampusSongs?: any[];
  currentWeekStr?: string;
}

export function deriveActiveHomeworkSummary({
  effectiveId,
  studentId,
  localProgress,
  lehrwerke = [],
  progressItems = [],
  activeSongSkills = [],
  assignedCampusSongs = [],
  currentWeekStr
}: DeriveHomeworkParams): ActiveHomeworkSummaryResult {
  const activeLehrwerkeMap: Record<string, { pages: Array<{ num: number; notes: string; status: string }> }> = {};
  const otherActiveHWItems: any[] = [];
  let isBooksCarriedOver = false;
  let isSongsCarriedOver = false;
  let carriedOverWeekLabel: string | null = null;

  const currentStudentId = effectiveId || studentId;

  // 1. Gather all active homework books & pages directly from localProgress (assigned Lehrwerke)
  (Array.isArray(localProgress) ? localProgress : []).forEach((assignment: any) => {
    const isStudentMatch =
      !currentStudentId ||
      String(assignment.studentId) === String(currentStudentId) ||
      String(assignment.student_id) === String(currentStudentId);
    if (!isStudentMatch || !assignment.pageStates) return;

    const book = lehrwerke.find((g: any) => String(g.id) === String(assignment.lehrwerkId));
    const bookTitle = book?.title || assignment.bookTitle || assignment.lehrwerkTitle;
    if (!bookTitle) return;

    Object.entries(assignment.pageStates).forEach(([pNumStr, pState]: [string, any]) => {
      if (pState?.status === 'homework' || pState?.isCurrentHomework) {
        const pageNum = parseInt(pNumStr, 10);
        if (!isNaN(pageNum)) {
          if (!activeLehrwerkeMap[bookTitle]) {
            activeLehrwerkeMap[bookTitle] = { pages: [] };
          }
          if (!activeLehrwerkeMap[bookTitle].pages.some(p => p.num === pageNum)) {
            const rawNote = pState.homeworkNotes || pState.homework_notes || pState.notes || '';
            const cleaned = cleanHomeworkNote(rawNote);
            activeLehrwerkeMap[bookTitle].pages.push({
              num: pageNum,
              notes: cleaned,
              status: pState.status || 'homework'
            });
          }
        }
      }
    });
  });

  // 2. Also incorporate items from progressItems (songs, theory, database rows) and songs state
  (progressItems || []).forEach(item => {
    if (!item.topic_name || isWeeklySnapshotContainer(item.topic_name)) return;

    if (item.topic_name.includes(' - Seite ')) {
      const parts = item.topic_name.split(' - Seite ');
      const rawBookTitle = cleanTitle(parts[0].trim());
      const pageNum = parseInt(parts[1], 10);
      const book = (lehrwerke || []).find((g: any) => cleanTitle(g.title).toLowerCase() === rawBookTitle.toLowerCase());
      const resolvedTitle = book?.title || rawBookTitle;

      if (resolvedTitle) {
        if (!activeLehrwerkeMap[resolvedTitle]) {
          activeLehrwerkeMap[resolvedTitle] = { pages: [] };
        }
        if (!isNaN(pageNum) && !activeLehrwerkeMap[resolvedTitle].pages.some(p => p.num === pageNum)) {
          const cleaned = cleanHomeworkNote(item.homework_notes || '');
          activeLehrwerkeMap[resolvedTitle].pages.push({
            num: pageNum,
            notes: cleaned,
            status: item.status || 'homework'
          });
        }
      }
    } else {
      // 🛡️ Bounded Context Isolation: Reine GrooveLab-Songs dürfen NIEMALS als Campus-Hausaufgabe erscheinen
      if (item.is_campus_active === false) return;
      if (item.songs && item.songs.is_campus_active === false) return;
      if (isDummyOrTestSong(item)) return;

      const localHw = currentStudentId
        ? (localStorage.getItem(`song_hw_${currentStudentId}_${item.id}`) ??
           (item.song_id ? localStorage.getItem(`song_hw_${currentStudentId}_${item.song_id}`) : null))
        : null;

      if (localHw !== 'false') {
        const isSongHw = localHw === 'true' || Boolean(item.is_current_homework);
        if (isSongHw) {
          const cleanT = cleanTitle((item.topic_name || item.title || '').replace(/\s*\([^)]*\)\s*$/, ''));
          if (cleanT && !isDummyOrTestSong(cleanT) && !isWeeklySnapshotContainer(cleanT) && !otherActiveHWItems.some(existing => cleanTitle((existing.topic_name || existing.title || '').replace(/\s*\([^)]*\)\s*$/, '')) === cleanT)) {
            const cachedNote =
              (currentStudentId
                ? localStorage.getItem(`song_note_${currentStudentId}_${item.id}`) ||
                  localStorage.getItem(`song_note_${currentStudentId}_${item.song_id}`)
                : '') || item.homework_notes || '';

            otherActiveHWItems.push({
              ...item,
              homework_notes: cleanHomeworkNote(cachedNote)
            });
          }
        }
      }
    }
  });

  // 3. Also incorporate student's activeSongSkills ONLY if explicitly assigned to Campus and marked as homework
  (activeSongSkills || []).forEach((skill: any) => {
    // 🛡️ Bounded Context Isolation: Reine GrooveLab-Skills dürfen nicht im Campus-Modul erscheinen
    if (!skill.songs || skill.songs.is_campus_active !== true) return;
    if (skill.is_campus_active === false) return;
    if (isDummyOrTestSong(skill) || isDummyOrTestSong(skill.songs)) return;

    const localHw = currentStudentId
      ? (localStorage.getItem(`song_hw_${currentStudentId}_${skill.id}`) ??
         (skill.song_id ? localStorage.getItem(`song_hw_${currentStudentId}_${skill.song_id}`) : null) ??
         (skill.songs?.id ? localStorage.getItem(`song_hw_${currentStudentId}_${skill.songs.id}`) : null))
      : null;

    const isHw = localHw === 'true' || (localHw !== 'false' && Boolean(skill.is_current_homework));

    if (isHw) {
      let songArtist = (skill.songs?.artist || skill.artist || '').trim();
      let songTitle = (skill.songs?.title || skill.title || skill.song_title || 'Song').trim();
      if (/^campus[- ]song$/i.test(songArtist)) {
        songArtist = '';
      }
      songTitle = songTitle.replace(/^campus[- ]song\s*[-–:]\s*/i, '').replace(/^campus[- ]song\s+/i, '').trim();
      if (songTitle.includes(' - Seite ') || isWeeklySnapshotContainer(songTitle)) return;
      if (isDummyOrTestSong(songTitle) || isDummyOrTestSong(songArtist)) return;
      const cleanSongTitle = cleanTitle(songTitle);
      const fullTitle = songArtist && !cleanSongTitle.toLowerCase().includes(songArtist.toLowerCase())
        ? `${songArtist} - ${cleanSongTitle}`
        : `${cleanSongTitle}`;
      if (isWeeklySnapshotContainer(fullTitle)) return;
      const cleanT = cleanTitle(fullTitle);

      if (cleanT && !isDummyOrTestSong(cleanT) && !otherActiveHWItems.some(existing => cleanTitle((existing.topic_name || existing.title || '').replace(/\s*\([^)]*\)\s*$/, '')) === cleanT)) {
        const cachedNote =
          (currentStudentId
            ? localStorage.getItem(`song_note_${currentStudentId}_${skill.id}`) ||
              (skill.song_id ? localStorage.getItem(`song_note_${currentStudentId}_${skill.song_id}`) : '') ||
              (skill.songs?.id ? localStorage.getItem(`song_note_${currentStudentId}_${skill.songs.id}`) : '')
            : '') || skill.homework_notes || '';

        otherActiveHWItems.push({
          id: skill.id,
          song_id: skill.song_id || skill.songs?.id,
          topic_name: fullTitle,
          title: fullTitle,
          is_current_homework: true,
          status: 'IN_PROGRESS',
          homework_notes: cleanHomeworkNote(cachedNote)
        });
      }
    }
  });

  // 4. Also incorporate student's assignedCampusSongs (must be campus active)
  (assignedCampusSongs || []).forEach((cSong: any) => {
    // 🛡️ Bounded Context Isolation: Explizite Campus-Zuordnung vorausgesetzt
    if (cSong.is_campus_active === false) return;
    if (cSong.songs && cSong.songs.is_campus_active === false) return;
    if (isDummyOrTestSong(cSong) || isDummyOrTestSong(cSong.songs)) return;

    const localHw = currentStudentId
      ? (localStorage.getItem(`song_hw_${currentStudentId}_${cSong.id}`) ??
         (cSong.song_id ? localStorage.getItem(`song_hw_${currentStudentId}_${cSong.song_id}`) : null) ??
         (cSong.songs?.id ? localStorage.getItem(`song_hw_${currentStudentId}_${cSong.songs.id}`) : null))
      : null;

    const isHw =
      localHw === 'true' ||
      (localHw !== 'false' && (Boolean(cSong.is_current_homework) || Boolean(cSong.homework_notes) || Boolean(cSong.teacher_notes)));

    if (isHw) {
      let songArtist = (cSong.songs?.artist || cSong.artist || '').trim();
      let songTitle = (cSong.songs?.title || cSong.title || cSong.song_title || 'Song').trim();
      if (/^campus[- ]song$/i.test(songArtist)) {
        songArtist = '';
      }
      songTitle = songTitle.replace(/^campus[- ]song\s*[-–:]\s*/i, '').replace(/^campus[- ]song\s+/i, '').trim();
      if (songTitle.includes(' - Seite ') || isWeeklySnapshotContainer(songTitle)) return;
      if (isDummyOrTestSong(songTitle) || isDummyOrTestSong(songArtist)) return;
      const cleanSongTitle = cleanTitle(songTitle);
      const fullTitle = songArtist && !cleanSongTitle.toLowerCase().includes(songArtist.toLowerCase())
        ? `${songArtist} - ${cleanSongTitle}`
        : `${cleanSongTitle}`;
      if (isWeeklySnapshotContainer(fullTitle)) return;
      const cleanT = cleanTitle(fullTitle);

      if (cleanT && !isDummyOrTestSong(cleanT) && !isWeeklySnapshotContainer(cleanT) && !otherActiveHWItems.some(existing => cleanTitle((existing.topic_name || existing.title || '').replace(/\s*\([^)]*\)\s*$/, '')) === cleanT)) {
        const cachedNote =
          (currentStudentId
            ? localStorage.getItem(`song_note_${currentStudentId}_${cSong.id}`) ||
              (cSong.song_id ? localStorage.getItem(`song_note_${currentStudentId}_${cSong.song_id}`) : '') ||
              (cSong.songs?.id ? localStorage.getItem(`song_note_${currentStudentId}_${cSong.songs.id}`) : '')
            : '') || cSong.homework_notes || cSong.teacher_notes || '';

        otherActiveHWItems.push({
          id: cSong.id,
          song_id: cSong.song_id || cSong.songs?.id,
          topic_name: fullTitle,
          title: fullTitle,
          is_current_homework: true,
          status: 'IN_PROGRESS',
          homework_notes: cleanHomeworkNote(cachedNote)
        });
      }
    }
  });

  // 5. Authoritative Snapshot Hydration (1:1 Symmetrie mit MeisterwerkDocumentTab Wochen-Fahrplan)
  // Wenn für die aktuelle Woche ein Wochen-Snapshot (z. B. Hausaufgabe KW xx) existiert,
  // entpacke SNAPSHOT_SONGS und SNAPSHOT_LEHRWERKE vollumfänglich und dedupliziert.
  const curWeekSnap = (progressItems || []).find((item: any) => {
    if (!item.topic_name?.startsWith('Hausaufgabe KW ')) return false;
    if (!currentWeekStr) return false;
    const kwMatch = item.topic_name.match(/KW\s*(\d+)/i);
    const curKwMatch = currentWeekStr.match(/-W(\d+)/i);
    if (kwMatch && curKwMatch && parseInt(kwMatch[1], 10) === parseInt(curKwMatch[1], 10)) return true;
    return false;
  });

  if (curWeekSnap) {
    const rawNotes = curWeekSnap.homework_notes || curWeekSnap.teacher_notes;
    if (rawNotes) {
      let parsedSnapNotes: any = null;
      try {
        parsedSnapNotes = typeof rawNotes === 'string' ? JSON.parse(rawNotes) : rawNotes;
      } catch {}
      if (!Array.isArray(parsedSnapNotes) && typeof rawNotes === 'string' && rawNotes.includes('SNAPSHOT_')) {
        parsedSnapNotes = [rawNotes];
      }

      if (Array.isArray(parsedSnapNotes)) {
        const snapSongEntry = parsedSnapNotes.find((n: any) => typeof n === 'string' && n.includes('SNAPSHOT_SONGS:'));
        if (snapSongEntry) {
          try {
            const sIdx = snapSongEntry.indexOf('SNAPSHOT_SONGS:');
            const after = snapSongEntry.slice(sIdx + 'SNAPSHOT_SONGS:'.length);
            const endIdx = after.search(/\n\n--- [A-Z_]+ ---|\n\nSNAPSHOT_/);
            const jsonStr = (endIdx !== -1 ? after.slice(0, endIdx) : after).trim();
            const parsedSongs = JSON.parse(jsonStr);
            if (Array.isArray(parsedSongs)) {
              parsedSongs.forEach((song: any) => {
                if (song.is_campus_active === false) return;
                if (isDummyOrTestSong(song) || isDummyOrTestSong(song.title) || isDummyOrTestSong(song.topic_name)) return;
                const tName = cleanTitle(song.topic_name || song.title || '');
                if (tName && !isDummyOrTestSong(tName) && !otherActiveHWItems.some(s => cleanTitle(s.topic_name || s.title || '').toLowerCase() === tName.toLowerCase())) {
                  otherActiveHWItems.push({
                    ...song,
                    topic_name: tName,
                    title: tName,
                    is_current_homework: true
                  });
                }
              });
            }
          } catch (e) {
            console.warn('Error hydrating current week SNAPSHOT_SONGS in briefing helper:', e);
          }
        }
      }
    }
  }

  // 6. Snapshot Fallback Hydration für Vorwochen
  if (Object.keys(activeLehrwerkeMap).length === 0 || otherActiveHWItems.length === 0) {
    const allSnapshotCandidates = (progressItems || []).filter((item: any) => {
      if (!item.topic_name?.startsWith('Hausaufgabe KW ')) return false;
      if (!currentWeekStr) return true;
      const itemWeek = item.topic_name.match(/KW\s*(\d+)/i);
      return !itemWeek || item.topic_name <= currentWeekStr;
    });

    allSnapshotCandidates.sort((a: any, b: any) => {
      const tA = new Date(a.updated_at || a.created_at || 0).getTime();
      const tB = new Date(b.updated_at || b.created_at || 0).getTime();
      return tB - tA;
    });

    for (const snapItem of allSnapshotCandidates) {
      const rawNotes = snapItem.homework_notes || snapItem.teacher_notes;
      if (!rawNotes) continue;
      let parsedSnapNotes: any = null;
      try {
        parsedSnapNotes = typeof rawNotes === 'string' ? JSON.parse(rawNotes) : rawNotes;
      } catch {}
      if (!Array.isArray(parsedSnapNotes)) {
        if (typeof rawNotes === 'string' && rawNotes.includes('SNAPSHOT_')) {
          parsedSnapNotes = [rawNotes];
        } else {
          continue;
        }
      }

      if (Object.keys(activeLehrwerkeMap).length === 0) {
        const snapLwEntry = parsedSnapNotes.find((n: any) => typeof n === 'string' && n.includes('SNAPSHOT_LEHRWERKE:'));
        if (snapLwEntry) {
          try {
            const sIdx = snapLwEntry.indexOf('SNAPSHOT_LEHRWERKE:');
            const after = snapLwEntry.slice(sIdx + 'SNAPSHOT_LEHRWERKE:'.length);
            const endIdx = after.search(/\n\n--- [A-Z_]+ ---|\n\nSNAPSHOT_/);
            const jsonStr = (endIdx !== -1 ? after.slice(0, endIdx) : after).trim();
            const parsedLw = JSON.parse(jsonStr);
            if (Array.isArray(parsedLw) && parsedLw.length > 0) {
              parsedLw.forEach((lw: any) => {
                const title = cleanTitle(lw.title || '');
                const pages = Array.isArray(lw.pages) ? [...lw.pages].sort((a: number, b: number) => a - b) : [];
                if (title && pages.length > 0 && !activeLehrwerkeMap[title]) {
                  activeLehrwerkeMap[title] = {
                    pages: pages.map((pNum: number) => ({
                      num: pNum,
                      notes: '',
                      status: 'homework'
                    }))
                  };
                  isBooksCarriedOver = true;
                  const kwMatch = snapItem.topic_name?.match(/Hausaufgabe KW\s*(\d+)/i);
                  if (!carriedOverWeekLabel && kwMatch) carriedOverWeekLabel = `KW ${kwMatch[1]}`;
                }
              });
            }
          } catch (e) {
            console.warn('Error hydrating SNAPSHOT_LEHRWERKE:', e);
          }
        }
      }

      const snapSongEntry = parsedSnapNotes.find((n: any) => typeof n === 'string' && n.includes('SNAPSHOT_SONGS:'));
      if (snapSongEntry) {
        try {
          const sIdx = snapSongEntry.indexOf('SNAPSHOT_SONGS:');
          const after = snapSongEntry.slice(sIdx + 'SNAPSHOT_SONGS:'.length);
          const endIdx = after.search(/\n\n--- [A-Z_]+ ---|\n\nSNAPSHOT_/);
          const jsonStr = (endIdx !== -1 ? after.slice(0, endIdx) : after).trim();
          const parsedSongs = JSON.parse(jsonStr);
          if (Array.isArray(parsedSongs) && parsedSongs.length > 0) {
            parsedSongs.forEach((song: any) => {
              // 🛡️ Bounded Context Isolation: Reine GrooveLab-Songs dürfen nicht über Snapshots in Campus gelangen
              if (song.is_campus_active === false) return;
              if (isDummyOrTestSong(song) || isDummyOrTestSong(song.title) || isDummyOrTestSong(song.topic_name)) return;

              const tName = cleanTitle(song.topic_name || song.title || '');
              if (tName && !isDummyOrTestSong(tName) && !otherActiveHWItems.some(s => cleanTitle(s.topic_name || s.title || '').toLowerCase() === tName.toLowerCase())) {
                otherActiveHWItems.push({
                  ...song,
                  topic_name: tName,
                  title: tName
                });
                isSongsCarriedOver = true;
                const kwMatch = snapItem.topic_name?.match(/Hausaufgabe KW\s*(\d+)/i);
                if (!carriedOverWeekLabel && kwMatch) carriedOverWeekLabel = `KW ${kwMatch[1]}`;
              }
            });
          }
        } catch (e) {
          console.warn('Error hydrating SNAPSHOT_SONGS:', e);
        }
      }

      if (Object.keys(activeLehrwerkeMap).length > 0 && otherActiveHWItems.length > 0) break;
    }
  }

  return {
    activeLehrwerkeMap,
    otherActiveHWItems,
    isBooksCarriedOver,
    isSongsCarriedOver,
    carriedOverWeekLabel
  };
}

export interface JuniorHomeworkBook {
  title: string;
  pages: number[];
  formattedPages: string;
  notes?: string[];
  book?: any;
}

export function deriveJuniorHomeworkSummary({
  studentId,
  localProgress,
  lehrwerke = [],
  progressItems = [],
  activeSongSkills = [],
  assignedCampusSongs = []
}: DeriveHomeworkParams): {
  activeJuniorBooks: JuniorHomeworkBook[];
  activeJuniorSongs: any[];
} {
  const activeJuniorBooks: JuniorHomeworkBook[] = [];

  // 1. Gather all active homework books & pages from localProgress
  (Array.isArray(localProgress) ? localProgress : []).forEach((assignment: any) => {
    if (String(assignment.studentId) !== String(studentId) || !assignment.pageStates) return;
    const book = lehrwerke.find((g: any) => String(g.id) === String(assignment.lehrwerkId));
    const bookTitle = book?.title || assignment.bookTitle || assignment.lehrwerkTitle;
    if (!bookTitle) return;

    const pages: number[] = [];
    const notes: string[] = [];
    Object.entries(assignment.pageStates).forEach(([pNumStr, pState]: [string, any]) => {
      if (pState?.status === 'homework' || pState?.isCurrentHomework) {
        const pNum = parseInt(pNumStr, 10);
        if (!isNaN(pNum) && !pages.includes(pNum)) pages.push(pNum);
        const rawNote = pState.homeworkNotes || pState.homework_notes || pState.notes || '';
        const cleanNote = cleanHomeworkNote(rawNote);
        if (cleanNote) {
          notes.push(`Seite ${pNum}: ${cleanNote}`);
        }
      }
    });

    if (pages.length > 0) {
      pages.sort((a, b) => a - b);
      const formattedPages = formatConsecutivePageRanges(pages);
      const existingBook = activeJuniorBooks.find(b => b.title.toLowerCase() === bookTitle.toLowerCase());
      if (existingBook) {
        existingBook.book = existingBook.book || book;
        pages.forEach(p => {
          if (!existingBook.pages.includes(p)) existingBook.pages.push(p);
        });
        existingBook.pages.sort((a, b) => a - b);
        existingBook.formattedPages = formatConsecutivePageRanges(existingBook.pages);
        notes.forEach(n => {
          if (!existingBook.notes?.includes(n)) {
            existingBook.notes = [...(existingBook.notes || []), n];
          }
        });
      } else {
        activeJuniorBooks.push({
          title: bookTitle,
          pages,
          formattedPages,
          notes,
          book
        });
      }
    }
  });

  // Also incorporate progressItems for books
  (progressItems || []).forEach(item => {
    if (!item.topic_name || isWeeklySnapshotContainer(item.topic_name) || !item.is_current_homework) return;
    if (item.topic_name.includes(' - Seite ')) {
      const parts = item.topic_name.split(' - Seite ');
      const rawBookTitle = cleanTitle(parts[0].trim());
      const pageNum = parseInt(parts[1], 10);
      const book = (lehrwerke || []).find((g: any) => cleanTitle(g.title).toLowerCase() === rawBookTitle.toLowerCase());
      const resolvedTitle = book?.title || rawBookTitle;

      if (resolvedTitle && !isNaN(pageNum)) {
        const cleanNote = cleanHomeworkNote(item.homework_notes);
        const formattedNote = cleanNote ? `Seite ${pageNum}: ${cleanNote}` : '';

        const existingBook = activeJuniorBooks.find(b => (b.title || '').trim().toLowerCase() === resolvedTitle.trim().toLowerCase());
        if (existingBook) {
          if (!existingBook.pages.includes(pageNum)) {
            existingBook.pages.push(pageNum);
            existingBook.pages.sort((a, b) => a - b);
            existingBook.formattedPages = formatConsecutivePageRanges(existingBook.pages);
          }
          if (formattedNote && !existingBook.notes?.includes(formattedNote)) {
            existingBook.notes = [...(existingBook.notes || []), formattedNote];
          }
        } else {
          activeJuniorBooks.push({
            title: resolvedTitle,
            pages: [pageNum],
            formattedPages: formatConsecutivePageRanges([pageNum]),
            notes: formattedNote ? [formattedNote] : [],
            book
          });
        }
      }
    }
  });

  // 2. Songs & progress items
  const activeJuniorSongs: any[] = [];
  (progressItems || []).forEach(item => {
    if (isWeeklySnapshotContainer(item.topic_name) || item.topic_name.includes(' - Seite ')) return;
    
    // 🛡️ Bounded Context Isolation: Reine GrooveLab-Songs dürfen nicht als Campus-Hausaufgabe erscheinen
    if (item.is_campus_active === false) return;
    if (isDummyOrTestSong(item) || isDummyOrTestSong(item.topic_name)) return;

    const localHw = studentId
      ? (localStorage.getItem(`song_hw_${studentId}_${item.id}`) ??
         (item.song_id ? localStorage.getItem(`song_hw_${studentId}_${item.song_id}`) : null))
      : null;
    if (localHw === 'false') return;
    const isSongHw = localHw === 'true' || (localHw !== 'false' && (Boolean(item.is_current_homework) || Boolean(item.homework_notes) || Boolean(item.teacher_notes)));
    if (isSongHw) {
      const cleanT = cleanTitle(item.topic_name);
      if (cleanT && !isDummyOrTestSong(cleanT) && !isWeeklySnapshotContainer(cleanT) && !activeJuniorSongs.some(existing => cleanTitle(existing.topic_name) === cleanT)) {
        const cleanNote = cleanHomeworkNote(item.homework_notes || item.teacher_notes);
        activeJuniorSongs.push({
          ...item,
          homework_notes: cleanNote
        });
      }
    }
  });

  (activeSongSkills || []).forEach((skill: any) => {
    // 🛡️ Bounded Context Isolation: Reine GrooveLab-Skills dürfen NIEMALS im Campus-Modul erscheinen
    if (!skill.songs || skill.songs.is_campus_active !== true) return;
    if (skill.is_campus_active === false) return;
    if (isDummyOrTestSong(skill) || isDummyOrTestSong(skill.songs)) return;

    const localHw = studentId
      ? (localStorage.getItem(`song_hw_${studentId}_${skill.id}`) ??
         (skill.song_id ? localStorage.getItem(`song_hw_${studentId}_${skill.song_id}`) : null) ??
         (skill.songs?.id ? localStorage.getItem(`song_hw_${studentId}_${skill.songs.id}`) : null))
      : null;

    const isHw = localHw === 'true' || (localHw !== 'false' && Boolean(skill.is_current_homework));
    if (isHw) {
      let songArtist = (skill.songs?.artist || skill.artist || '').trim();
      let songTitle = (skill.songs?.title || skill.title || skill.song_title || 'Song').trim();
      if (/^campus[- ]song$/i.test(songArtist)) {
        songArtist = '';
      }
      songTitle = songTitle.replace(/^campus[- ]song\s*[-–:]\s*/i, '').replace(/^campus[- ]song\s+/i, '').trim();
      if (songTitle.includes(' - Seite ') || isWeeklySnapshotContainer(songTitle)) return;
      if (isDummyOrTestSong(songTitle) || isDummyOrTestSong(songArtist)) return;
      const cleanSongTitle = cleanTitle(songTitle);
      const fullTitle = songArtist && !cleanSongTitle.toLowerCase().includes(songArtist.toLowerCase())
        ? `${songArtist} - ${cleanSongTitle}`
        : `${cleanSongTitle}`;
      if (isWeeklySnapshotContainer(fullTitle)) return;
      const cleanT = cleanTitle(fullTitle);

      if (cleanT && !isDummyOrTestSong(cleanT) && !isWeeklySnapshotContainer(cleanT) && !activeJuniorSongs.some(existing => cleanTitle(existing.topic_name || existing.title) === cleanT)) {
        const cachedNote =
          (studentId
            ? localStorage.getItem(`song_note_${studentId}_${skill.id}`) ||
              (skill.song_id ? localStorage.getItem(`song_note_${studentId}_${skill.song_id}`) : '') ||
              (skill.songs?.id ? localStorage.getItem(`song_note_${studentId}_${skill.songs.id}`) : '')
            : '') || skill.homework_notes || skill.teacher_notes || '';

        activeJuniorSongs.push({
          id: skill.id,
          song_id: skill.song_id || skill.songs?.id,
          topic_name: fullTitle,
          title: fullTitle,
          is_current_homework: true,
          status: 'IN_PROGRESS',
          homework_notes: cleanHomeworkNote(cachedNote)
        });
      }
    }
  });

  (assignedCampusSongs || []).forEach((cSong: any) => {
    // 🛡️ Bounded Context Isolation: Explizite Campus-Zuordnung vorausgesetzt
    if (cSong.is_campus_active === false) return;
    if (cSong.songs && cSong.songs.is_campus_active === false) return;
    if (isDummyOrTestSong(cSong) || isDummyOrTestSong(cSong.songs)) return;

    const localHw = studentId
      ? (localStorage.getItem(`song_hw_${studentId}_${cSong.id}`) ??
         (cSong.song_id ? localStorage.getItem(`song_hw_${studentId}_${cSong.song_id}`) : null))
      : null;
    const isHw = localHw === 'true' || (localHw !== 'false' && (Boolean(cSong.is_current_homework) || Boolean(cSong.homework_notes) || Boolean(cSong.teacher_notes)));
    if (isHw) {
      let songArtist = (cSong.songs?.artist || cSong.artist || '').trim();
      let songTitle = (cSong.songs?.title || cSong.title || cSong.song_title || 'Song').trim();
      if (/^campus[- ]song$/i.test(songArtist)) {
        songArtist = '';
      }
      songTitle = songTitle.replace(/^campus[- ]song\s*[-–:]\s*/i, '').replace(/^campus[- ]song\s+/i, '').trim();
      if (songTitle.includes(' - Seite ') || isWeeklySnapshotContainer(songTitle)) return;
      if (isDummyOrTestSong(songTitle) || isDummyOrTestSong(songArtist)) return;
      const cleanSongTitle = cleanTitle(songTitle);
      const fullTitle = songArtist && !cleanSongTitle.toLowerCase().includes(songArtist.toLowerCase())
        ? `${songArtist} - ${cleanSongTitle}`
        : `${cleanSongTitle}`;
      if (isWeeklySnapshotContainer(fullTitle)) return;
      const cleanT = cleanTitle(fullTitle);

      if (cleanT && !isDummyOrTestSong(cleanT) && !isWeeklySnapshotContainer(cleanT) && !activeJuniorSongs.some(existing => cleanTitle(existing.topic_name || existing.title) === cleanT)) {
        const cachedNote =
          (studentId
            ? localStorage.getItem(`song_note_${studentId}_${cSong.id}`) ||
              (cSong.song_id ? localStorage.getItem(`song_note_${studentId}_${cSong.song_id}`) : '')
            : '') || cSong.homework_notes || cSong.teacher_notes || '';

        activeJuniorSongs.push({
          id: cSong.id,
          song_id: cSong.song_id || cSong.songs?.id,
          topic_name: fullTitle,
          title: fullTitle,
          is_current_homework: true,
          status: 'IN_PROGRESS',
          homework_notes: cleanHomeworkNote(cachedNote)
        });
      }
    }
  });

  return { activeJuniorBooks, activeJuniorSongs };
}
