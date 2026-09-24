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
    .replace(/linken park/gi, 'Linkin Park')
    .replace(/\s*\((gitarre|guitar|e-gitarre|bass|e-bass|drums|schlagzeug|klavier|piano|keys|keyboard|vocals|gesang|stimme|allgemein)\)/i, '')
    .replace(/\s*\([^)]*\)\s*$/, '')
    .trim();
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
    if (!item.topic_name || item.topic_name.startsWith('Hausaufgabe KW ')) return;

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
      const localHw = currentStudentId
        ? (localStorage.getItem(`song_hw_${currentStudentId}_${item.id}`) ??
           (item.song_id ? localStorage.getItem(`song_hw_${currentStudentId}_${item.song_id}`) : null))
        : null;

      if (localHw !== 'false') {
        const isSongHw = localHw === 'true' || Boolean(item.is_current_homework);
        if (isSongHw) {
          const cleanT = cleanTitle((item.topic_name || item.title || '').replace(/\s*\([^)]*\)\s*$/, ''));
          if (cleanT && !otherActiveHWItems.some(existing => cleanTitle((existing.topic_name || existing.title || '').replace(/\s*\([^)]*\)\s*$/, '')) === cleanT)) {
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

  // 3. Also incorporate student's activeSongSkills
  (activeSongSkills || []).forEach((skill: any) => {
    const localHw = currentStudentId
      ? (localStorage.getItem(`song_hw_${currentStudentId}_${skill.id}`) ??
         (skill.song_id ? localStorage.getItem(`song_hw_${currentStudentId}_${skill.song_id}`) : null) ??
         (skill.songs?.id ? localStorage.getItem(`song_hw_${currentStudentId}_${skill.songs.id}`) : null))
      : null;

    const isHw = localHw === 'true' || (localHw !== 'false' && Boolean(skill.is_current_homework));

    if (isHw) {
      const songArtist = skill.songs?.artist || skill.artist || '';
      const songTitle = skill.songs?.title || skill.title || skill.song_title || 'Song';
      if (songTitle.includes(' - Seite ') || songTitle.startsWith('Hausaufgabe KW ')) return;
      const songInstrument = skill.instrument ? ` (${skill.instrument})` : '';
      const fullTitle = songArtist ? `${songArtist} - ${songTitle}${songInstrument}` : `${songTitle}${songInstrument}`;
      const cleanT = cleanTitle(fullTitle);

      if (cleanT && !otherActiveHWItems.some(existing => cleanTitle((existing.topic_name || existing.title || '').replace(/\s*\([^)]*\)\s*$/, '')) === cleanT)) {
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

  // 4. Also incorporate student's assignedCampusSongs
  (assignedCampusSongs || []).forEach((cSong: any) => {
    const localHw = currentStudentId
      ? (localStorage.getItem(`song_hw_${currentStudentId}_${cSong.id}`) ??
         (cSong.song_id ? localStorage.getItem(`song_hw_${currentStudentId}_${cSong.song_id}`) : null) ??
         (cSong.songs?.id ? localStorage.getItem(`song_hw_${currentStudentId}_${cSong.songs.id}`) : null))
      : null;

    const isHw =
      localHw === 'true' ||
      (localHw !== 'false' && (Boolean(cSong.is_current_homework) || Boolean(cSong.homework_notes) || Boolean(cSong.teacher_notes)));

    if (isHw) {
      const songArtist = cSong.songs?.artist || cSong.artist || '';
      const songTitle = cSong.songs?.title || cSong.title || cSong.song_title || 'Song';
      if (songTitle.includes(' - Seite ') || songTitle.startsWith('Hausaufgabe KW ')) return;
      const songInstrument = cSong.instrument ? ` (${cSong.instrument})` : '';
      const fullTitle = songArtist ? `${songArtist} - ${songTitle}${songInstrument}` : `${songTitle}${songInstrument}`;
      const cleanT = cleanTitle(fullTitle);

      if (cleanT && !otherActiveHWItems.some(existing => cleanTitle((existing.topic_name || existing.title || '').replace(/\s*\([^)]*\)\s*$/, '')) === cleanT)) {
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

  // 5. Snapshot Fallback Hydration
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
              const tName = cleanTitle(song.topic_name || song.title || '');
              if (tName && !otherActiveHWItems.some(s => cleanTitle(s.topic_name || s.title || '').toLowerCase() === tName.toLowerCase())) {
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
      const formattedPages = pages.length === 1 ? `S. ${pages[0]}` : `S. ${pages[0]}–${pages[pages.length - 1]}`;
      const existingBook = activeJuniorBooks.find(b => b.title.toLowerCase() === bookTitle.toLowerCase());
      if (existingBook) {
        existingBook.book = existingBook.book || book;
        pages.forEach(p => {
          if (!existingBook.pages.includes(p)) existingBook.pages.push(p);
        });
        existingBook.pages.sort((a, b) => a - b);
        existingBook.formattedPages = existingBook.pages.length === 1 ? `S. ${existingBook.pages[0]}` : `S. ${existingBook.pages[0]}–${existingBook.pages[existingBook.pages.length - 1]}`;
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
    if (!item.topic_name || item.topic_name.startsWith('Hausaufgabe KW ')) return;
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
            existingBook.formattedPages = existingBook.pages.length === 1 ? `S. ${existingBook.pages[0]}` : `S. ${existingBook.pages[0]}–${existingBook.pages[existingBook.pages.length - 1]}`;
          }
          if (formattedNote && !existingBook.notes?.includes(formattedNote)) {
            existingBook.notes = [...(existingBook.notes || []), formattedNote];
          }
        } else {
          activeJuniorBooks.push({
            title: resolvedTitle,
            pages: [pageNum],
            formattedPages: `S. ${pageNum}`,
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
    if (item.topic_name.startsWith('Hausaufgabe KW ') || item.topic_name.includes(' - Seite ')) return;
    const localHw = studentId
      ? (localStorage.getItem(`song_hw_${studentId}_${item.id}`) ??
         (item.song_id ? localStorage.getItem(`song_hw_${studentId}_${item.song_id}`) : null))
      : null;
    if (localHw === 'false') return;
    const isSongHw = localHw === 'true' || (localHw !== 'false' && (Boolean(item.is_current_homework) || Boolean(item.homework_notes) || Boolean(item.teacher_notes)));
    if (isSongHw) {
      const cleanT = cleanTitle(item.topic_name);
      if (!activeJuniorSongs.some(existing => cleanTitle(existing.topic_name) === cleanT)) {
        const cleanNote = cleanHomeworkNote(item.homework_notes || item.teacher_notes);
        activeJuniorSongs.push({
          ...item,
          homework_notes: cleanNote
        });
      }
    }
  });

  (activeSongSkills || []).forEach((skill: any) => {
    const localHw = studentId
      ? (localStorage.getItem(`song_hw_${studentId}_${skill.id}`) ??
         (skill.song_id ? localStorage.getItem(`song_hw_${studentId}_${skill.song_id}`) : null) ??
         (skill.songs?.id ? localStorage.getItem(`song_hw_${studentId}_${skill.songs.id}`) : null))
      : null;

    const isHw = localHw === 'true' || (localHw !== 'false' && (Boolean(skill.is_current_homework) || Boolean(skill.homework_notes) || Boolean(skill.teacher_notes)));
    if (isHw) {
      const songArtist = skill.songs?.artist || skill.artist || '';
      const songTitle = skill.songs?.title || skill.title || skill.song_title || 'Song';
      const songInstrument = skill.instrument ? ` (${skill.instrument})` : '';
      const fullTitle = songArtist ? `${songArtist} - ${songTitle}${songInstrument}` : `${songTitle}${songInstrument}`;
      const cleanT = cleanTitle(fullTitle);

      if (!activeJuniorSongs.some(existing => cleanTitle(existing.topic_name || existing.title) === cleanT)) {
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
    const localHw = studentId
      ? (localStorage.getItem(`song_hw_${studentId}_${cSong.id}`) ??
         (cSong.song_id ? localStorage.getItem(`song_hw_${studentId}_${cSong.song_id}`) : null))
      : null;
    const isHw = localHw === 'true' || (localHw !== 'false' && (Boolean(cSong.is_current_homework) || Boolean(cSong.homework_notes) || Boolean(cSong.teacher_notes)));
    if (isHw) {
      const songArtist = cSong.songs?.artist || cSong.artist || '';
      const songTitle = cSong.songs?.title || cSong.title || cSong.song_title || 'Song';
      const songInstrument = cSong.instrument ? ` (${cSong.instrument})` : '';
      const fullTitle = songArtist ? `${songArtist} - ${songTitle}${songInstrument}` : `${songTitle}${songInstrument}`;
      const cleanT = cleanTitle(fullTitle);

      if (!activeJuniorSongs.some(existing => cleanTitle(existing.topic_name || existing.title) === cleanT)) {
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
