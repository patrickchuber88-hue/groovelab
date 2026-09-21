import { AudioTrackItem } from '../../AudioTrackCarousel';
import { getISOWeek, getSimulatedNow, getItemWeek } from '../studentDateUtils';

export interface JuniorWeeklyHomeworkSummary {
  formattedJuniorBooks: Array<{
    title: string;
    pageNums: number[];
    notesList: Array<{ num: number; text: string }>;
  }>;
  otherActiveSongs: any[];
  audioTracks: AudioTrackItem[];
  generalNote: string;
  specificTeacherNote: string;
  allTeacherNotes: string[];
  carriedOverWeek: string;
  studentQuestionText: string;
  hasAnyHomework: boolean;
  isCarriedOverPlan: boolean;
}

export interface JuniorHomeworkResolverParams {
  localProgress: any[];
  lehrwerke: any[];
  progressItems: any[];
  activeSongSkills: any[];
  assignedCampusSongs: any[];
  studentId: string;
  studentUser?: any;
}

export function resolveJuniorWeeklyHomeworkSummary(params: JuniorHomeworkResolverParams): JuniorWeeklyHomeworkSummary {
  const {
    localProgress = [],
    lehrwerke = [],
    progressItems = [],
    activeSongSkills = [],
    assignedCampusSongs = [],
    studentId,
    studentUser
  } = params;

  const currentWeekStr = getISOWeek(getSimulatedNow());
  const cleanTitle = (t: string) => (t || '').replace(/\s*\((gitarre|guitar|e-gitarre|bass|e-bass|drums|schlagzeug|klavier|piano|keys|keyboard|vocals|gesang|stimme|allgemein)\)/i, '');

  // 1. Gather all active homework books & pages directly from localProgress (assigned Lehrwerke)
  const activeJuniorBooksMap: Record<string, { pages: { num: number; notes: string; status: string }[] }> = {};

  (localProgress || []).forEach((assignment: any) => {
    const assignStdId = String(assignment.studentId || assignment.student_id || '');
    if (assignStdId !== String(studentId) || !assignment.pageStates) return;
    const assignBookId = String(assignment.lehrwerkId || assignment.lehrwerk_id || '');
    const book = lehrwerke.find((g: any) => String(g.id) === assignBookId);
    const bookTitle = book?.title || assignment.bookTitle || assignment.lehrwerkTitle;
    if (!bookTitle) return;

    Object.entries(assignment.pageStates).forEach(([pNumStr, pState]: [string, any]) => {
      if (pState?.status === 'homework' || pState?.isCurrentHomework || pState?.is_current_homework) {
        const pageNum = parseInt(pNumStr, 10);
        if (!isNaN(pageNum)) {
          if (!activeJuniorBooksMap[bookTitle]) {
            activeJuniorBooksMap[bookTitle] = { pages: [] };
          }
          if (!activeJuniorBooksMap[bookTitle].pages.some(p => p.num === pageNum)) {
            let cleanNote = pState.homeworkNotes || pState.homework_notes || pState.notes || '';
            if (typeof cleanNote === 'string' && (cleanNote.startsWith('[') || cleanNote.startsWith('{'))) {
              try {
                const parsed = JSON.parse(cleanNote);
                if (Array.isArray(parsed)) {
                  cleanNote = parsed.filter((n: string) => typeof n === 'string' && !n.startsWith('AUDIO:') && !n.startsWith('STICKER:') && !n.toLowerCase().startsWith('latency:') && !n.startsWith('LOOP:') && !n.startsWith('SYSTEM:') && !n.startsWith('STUDENT_NOTE_PUBLIC:') && !n.startsWith('STUDENT_NOTE_PRIVATE:')).join(' ');
                }
              } catch {}
            }
            cleanNote = String(cleanNote).replace(/.*(STUDENT_NOTE_PUBLIC|STUDENT_NOTE_PRIVATE):[^|]*\|/, '').replace(/^❓\s*Frage für den Unterricht:\s*/i, '').trim();
            activeJuniorBooksMap[bookTitle].pages.push({
              num: pageNum,
              notes: cleanNote,
              status: pState.status || 'homework'
            });
          }
        }
      }
    });
  });

  // 2. Also incorporate items from progressItems (songs, database rows)
  const otherActiveSongs: any[] = [];
  const effectiveId = studentId || studentUser?.id;
  (progressItems || []).forEach((item: any) => {
    if (!item.topic_name || item.topic_name.startsWith('Hausaufgabe KW ')) return;
    if (item.topic_name.includes(' - Seite ')) {
      const parts = item.topic_name.split(' - Seite ');
      const rawBookTitle = cleanTitle(parts[0].trim());
      const pageNum = parseInt(parts[1], 10);
      const book = lehrwerke.find((g: any) => cleanTitle(g.title).toLowerCase() === rawBookTitle.toLowerCase());
      const resolvedTitle = book?.title || rawBookTitle;
      if (resolvedTitle) {
        if (!activeJuniorBooksMap[resolvedTitle]) {
          activeJuniorBooksMap[resolvedTitle] = { pages: [] };
        }
        if (!isNaN(pageNum) && !activeJuniorBooksMap[resolvedTitle].pages.some(p => p.num === pageNum)) {
          let cleanNote = item.homework_notes || '';
          if (typeof cleanNote === 'string' && (cleanNote.startsWith('[') || cleanNote.startsWith('{'))) {
            try {
              const parsed = JSON.parse(cleanNote);
              if (Array.isArray(parsed)) {
                cleanNote = parsed.filter((n: string) => typeof n === 'string' && !n.startsWith('AUDIO:') && !n.startsWith('STICKER:') && !n.toLowerCase().startsWith('latency:') && !n.startsWith('LOOP:') && !n.startsWith('SYSTEM:') && !n.startsWith('STUDENT_NOTE_PUBLIC:') && !n.startsWith('STUDENT_NOTE_PRIVATE:')).join(' ');
              }
            } catch {}
          }
          cleanNote = String(cleanNote).replace(/.*(STUDENT_NOTE_PUBLIC|STUDENT_NOTE_PRIVATE):[^|]*\|/, '').replace(/^❓\s*Frage für den Unterricht:\s*/i, '').trim();
          activeJuniorBooksMap[resolvedTitle].pages.push({
            num: pageNum,
            notes: cleanNote,
            status: item.status || 'homework'
          });
        }
      }
    } else {
      const localHw = effectiveId ? (localStorage.getItem(`song_hw_${effectiveId}_${item.id}`) ??
                      (item.song_id ? localStorage.getItem(`song_hw_${effectiveId}_${item.song_id}`) : null)) : null;
      if (localHw !== 'false') {
        const isSongHw = (localHw === 'true') || (localHw !== 'false' && (Boolean(item.is_current_homework) || Boolean(item.homework_notes) || Boolean(item.teacher_notes)));
        if (isSongHw) {
          const cleanT = cleanTitle((item.topic_name || item.title || '').replace(/\s*\([^)]*\)\s*$/, ''));
          if (cleanT && !otherActiveSongs.some(existing => cleanTitle((existing.topic_name || existing.title || '').replace(/\s*\([^)]*\)\s*$/, '')) === cleanT)) {
            let cleanNote = (effectiveId ? (localStorage.getItem(`song_note_${effectiveId}_${item.id}`) || localStorage.getItem(`song_note_${effectiveId}_${item.song_id}`)) : '') ||
                            item.homework_notes || item.teacher_notes || '';
            if (typeof cleanNote === 'string' && (cleanNote.startsWith('[') || cleanNote.startsWith('{'))) {
              try {
                const parsed = JSON.parse(cleanNote);
                if (Array.isArray(parsed)) {
                  cleanNote = parsed.filter((n: string) => typeof n === 'string' && !n.startsWith('AUDIO:') && !n.startsWith('STICKER:') && !n.toLowerCase().startsWith('latency:') && !n.startsWith('LOOP:') && !n.startsWith('SYSTEM:') && !n.startsWith('STUDENT_NOTE_PUBLIC:') && !n.startsWith('STUDENT_NOTE_PRIVATE:')).join(' ');
                }
              } catch {}
            }
            cleanNote = String(cleanNote).replace(/.*(STUDENT_NOTE_PUBLIC|STUDENT_NOTE_PRIVATE):[^|]*\|/, '').replace(/^❓\s*Frage für den Unterricht:\s*/i, '').trim();

            otherActiveSongs.push({
              ...item,
              homework_notes: cleanNote
            });
          }
        }
      }
    }
  });

  // Also incorporate student's activeSongSkills
  (activeSongSkills || []).forEach((skill: any) => {
    const localHw = effectiveId ? (localStorage.getItem(`song_hw_${effectiveId}_${skill.id}`) ??
                    (skill.song_id ? localStorage.getItem(`song_hw_${effectiveId}_${skill.song_id}`) : null) ??
                    (skill.songs?.id ? localStorage.getItem(`song_hw_${effectiveId}_${skill.songs.id}`) : null)) : null;

    const isHw = (localHw === 'true') || (localHw !== 'false' && (Boolean(skill.is_current_homework) || Boolean(skill.homework_notes) || Boolean(skill.teacher_notes)));

    if (isHw) {
      const songArtist = skill.songs?.artist || skill.artist || '';
      const songTitle = skill.songs?.title || skill.title || skill.song_title || 'Song';
      if (songTitle.includes(' - Seite ') || songTitle.startsWith('Hausaufgabe KW ')) return;
      const songInstrument = skill.instrument ? ` (${skill.instrument})` : '';
      const fullTitle = songArtist ? `${songArtist} - ${songTitle}${songInstrument}` : `${songTitle}${songInstrument}`;
      const cleanT = cleanTitle(fullTitle);

      if (cleanT && !otherActiveSongs.some(existing => cleanTitle((existing.topic_name || existing.title || '').replace(/\s*\([^)]*\)\s*$/, '')) === cleanT)) {
        let cleanNote = (effectiveId ? (localStorage.getItem(`song_note_${effectiveId}_${skill.id}`) ||
                         (skill.song_id ? localStorage.getItem(`song_note_${effectiveId}_${skill.song_id}`) : '') ||
                         (skill.songs?.id ? localStorage.getItem(`song_note_${effectiveId}_${skill.songs.id}`) : '')) : '') ||
                         skill.homework_notes || skill.teacher_notes || '';
        if (typeof cleanNote === 'string' && (cleanNote.startsWith('[') || cleanNote.startsWith('{'))) {
          try {
            const parsed = JSON.parse(cleanNote);
            if (Array.isArray(parsed)) {
              cleanNote = parsed.filter((n: string) => typeof n === 'string' && !n.startsWith('AUDIO:') && !n.startsWith('STICKER:') && !n.toLowerCase().startsWith('latency:') && !n.startsWith('LOOP:') && !n.startsWith('SYSTEM:') && !n.startsWith('STUDENT_NOTE_PUBLIC:') && !n.startsWith('STUDENT_NOTE_PRIVATE:')).join(' ');
            }
          } catch {}
        }
        cleanNote = String(cleanNote).replace(/.*(STUDENT_NOTE_PUBLIC|STUDENT_NOTE_PRIVATE):[^|]*\|/, '').replace(/^❓\s*Frage für den Unterricht:\s*/i, '').trim();

        otherActiveSongs.push({
          id: skill.id,
          song_id: skill.song_id || skill.songs?.id,
          topic_name: fullTitle,
          title: fullTitle,
          is_current_homework: true,
          status: 'IN_PROGRESS',
          homework_notes: cleanNote
        });
      }
    }
  });

  // Also check assignedCampusSongs
  (assignedCampusSongs || []).forEach((cSong: any) => {
    const localHw = effectiveId ? (localStorage.getItem(`song_hw_${effectiveId}_${cSong.id}`) ??
                    (cSong.song_id ? localStorage.getItem(`song_hw_${effectiveId}_${cSong.song_id}`) : null) ??
                    (cSong.songs?.id ? localStorage.getItem(`song_hw_${effectiveId}_${cSong.songs.id}`) : null)) : null;
    const isHw = (localHw === 'true') || (localHw !== 'false' && (Boolean(cSong.is_current_homework) || Boolean(cSong.homework_notes) || Boolean(cSong.teacher_notes)));

    if (isHw) {
      const songArtist = cSong.songs?.artist || cSong.artist || '';
      const songTitle = cSong.songs?.title || cSong.title || cSong.song_title || 'Song';
      if (songTitle.includes(' - Seite ') || songTitle.startsWith('Hausaufgabe KW ')) return;
      const songInstrument = cSong.instrument ? ` (${cSong.instrument})` : '';
      const fullTitle = songArtist ? `${songArtist} - ${songTitle}${songInstrument}` : `${songTitle}${songInstrument}`;
      const cleanT = cleanTitle(fullTitle);

      if (cleanT && !otherActiveSongs.some(existing => cleanTitle((existing.topic_name || existing.title || '').replace(/\s*\([^)]*\)\s*$/, '')) === cleanT)) {
        let cleanNote = (effectiveId ? (localStorage.getItem(`song_note_${effectiveId}_${cSong.id}`) ||
                         (cSong.song_id ? localStorage.getItem(`song_note_${effectiveId}_${cSong.song_id}`) : '') ||
                         (cSong.songs?.id ? localStorage.getItem(`song_note_${effectiveId}_${cSong.songs.id}`) : '')) : '') ||
                         cSong.homework_notes || cSong.teacher_notes || '';
        if (typeof cleanNote === 'string' && (cleanNote.startsWith('[') || cleanNote.startsWith('{'))) {
          try {
            const parsed = JSON.parse(cleanNote);
            if (Array.isArray(parsed)) {
              cleanNote = parsed.filter((n: string) => typeof n === 'string' && !n.startsWith('AUDIO:') && !n.startsWith('STICKER:') && !n.toLowerCase().startsWith('latency:') && !n.startsWith('LOOP:') && !n.startsWith('SYSTEM:') && !n.startsWith('STUDENT_NOTE_PUBLIC:') && !n.startsWith('STUDENT_NOTE_PRIVATE:')).join(' ');
            }
          } catch {}
        }
        cleanNote = String(cleanNote).replace(/.*(STUDENT_NOTE_PUBLIC|STUDENT_NOTE_PRIVATE):[^|]*\|/, '').replace(/^❓\s*Frage für den Unterricht:\s*/i, '').trim();

        otherActiveSongs.push({
          id: cSong.id,
          song_id: cSong.song_id || cSong.songs?.id,
          topic_name: fullTitle,
          title: fullTitle,
          is_current_homework: true,
          status: 'IN_PROGRESS',
          homework_notes: cleanNote
        });
      }
    }
  });

  // 🔄 Snapshot Hydration for Junior Summary
  if (Object.keys(activeJuniorBooksMap).length === 0 || otherActiveSongs.length === 0) {
    const allSnapshotCandidates = (progressItems || []).filter((item: any) => item.topic_name?.startsWith('Hausaufgabe KW '));
    allSnapshotCandidates.sort((a: any, b: any) => {
      const wA = getItemWeek(a);
      const wB = getItemWeek(b);
      if (wA && wB && wA !== wB) return wB.localeCompare(wA);
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

      if (Object.keys(activeJuniorBooksMap).length === 0) {
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
                if (title && pages.length > 0 && !activeJuniorBooksMap[title]) {
                  activeJuniorBooksMap[title] = {
                    pages: pages.map((pNum: number) => ({
                      num: pNum,
                      notes: '',
                      status: 'homework'
                    }))
                  };
                }
              });
            }
          } catch (e) {
            console.warn('Error hydrating SNAPSHOT_LEHRWERKE in Junior summary:', e);
          }
        }
      }

      if (otherActiveSongs.length === 0) {
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
                if (tName && !otherActiveSongs.some(s => cleanTitle(s.topic_name || s.title || '').toLowerCase() === tName.toLowerCase())) {
                  otherActiveSongs.push({
                    ...song,
                    topic_name: tName,
                    title: tName,
                    is_current_homework: true
                  });
                }
              });
            }
          } catch (e) {
            console.warn('Error hydrating SNAPSHOT_SONGS in Junior summary:', e);
          }
        }
      }

      if (Object.keys(activeJuniorBooksMap).length > 0 && otherActiveSongs.length > 0) break;
    }
  }

  // Sort pages for all active books
  Object.keys(activeJuniorBooksMap).forEach(title => {
    activeJuniorBooksMap[title].pages.sort((a, b) => a.num - b.num);
  });

  const formattedJuniorBooks = Object.entries(activeJuniorBooksMap).map(([title, info]) => {
    const pageNums = info.pages.map(p => p.num);
    const notesList = info.pages.filter(p => p.notes && p.notes.length > 0).map(p => ({ num: p.num, text: p.notes }));
    return {
      title,
      pageNums,
      notesList
    };
  });

  // Notes and audio
  const currentWeekNotes: string[] = [];
  const directAudioCandidates: Array<{ url: string; date?: string; label?: string; author?: string; duration?: number; idx?: number }> = [];

  // Resolve authoritative snapshot (current week or latest active past snapshot carried over)
  const allSnapshotCandidates = (progressItems || []).filter((item: any) => item.topic_name?.startsWith('Hausaufgabe KW '));
  const curWkNum = (currentWeekStr.split('-W')[1] || '').replace(/^0+/, '');
  let resolvedSnapshot = allSnapshotCandidates.find((item: any) => {
    const itemW = getItemWeek(item);
    return item.topic_name === `Hausaufgabe KW ${curWkNum}` || item.topic_name === `Hausaufgabe KW ${currentWeekStr.split('-W')[1] || ''}` || itemW === currentWeekStr;
  });

  if (!resolvedSnapshot && allSnapshotCandidates.length > 0) {
    const sortedSnaps = [...allSnapshotCandidates].sort((a: any, b: any) => {
      const wA = getItemWeek(a);
      const wB = getItemWeek(b);
      if (wA && wB && wA !== wB) return wB.localeCompare(wA);
      const tA = new Date(a.updated_at || a.created_at || 0).getTime();
      const tB = new Date(b.updated_at || b.created_at || 0).getTime();
      return tB - tA;
    });
    resolvedSnapshot = sortedSnaps.find(s => s.is_current_homework) || sortedSnaps[0];
  }

  (progressItems || []).forEach((item: any) => {
    const isCurrentHwSnapshot = resolvedSnapshot ? (item.id === resolvedSnapshot.id || item.topic_name === resolvedSnapshot.topic_name) : false;
    const isOtherActiveHw = Boolean(item.is_current_homework) && !item.topic_name?.startsWith('Hausaufgabe KW ');
    const isActive = isCurrentHwSnapshot || isOtherActiveHw;

    // Extract direct recording_url if present
    if (isActive && item.recording_url && typeof item.recording_url === 'string' && item.recording_url.trim()) {
      directAudioCandidates.push({
        url: item.recording_url.trim(),
        date: item.updated_at || item.created_at,
        label: item.topic_name || 'Aufnahme',
        author: 'teacher'
      });
    }

    if (isActive) {
      [item.homework_notes, item.teacher_notes].forEach(noteField => {
        if (noteField && typeof noteField === 'string' && noteField.trim()) {
          try {
            const parsed = JSON.parse(noteField);
            if (Array.isArray(parsed)) {
              parsed.forEach((n: any) => {
                if (typeof n === 'string' && n.trim() && !currentWeekNotes.includes(n.trim())) currentWeekNotes.push(n.trim());
              });
            } else if (typeof parsed === 'string' && parsed.trim() && !currentWeekNotes.includes(parsed.trim())) {
              currentWeekNotes.push(parsed.trim());
            }
          } catch {
            if (!currentWeekNotes.includes(noteField.trim())) currentWeekNotes.push(noteField.trim());
          }
        }
      });
    }
  });

  try {
    const localGenNotes = localStorage.getItem(`campus_homework_notes_${studentId}`);
    if (localGenNotes && localGenNotes.trim()) {
      try {
        const parsed = JSON.parse(localGenNotes);
        if (Array.isArray(parsed)) {
          parsed.forEach((n: any) => {
            if (typeof n === 'string' && n.trim() && !currentWeekNotes.includes(n.trim())) currentWeekNotes.push(n.trim());
          });
        } else if (typeof parsed === 'string' && parsed.trim() && !currentWeekNotes.includes(parsed.trim())) {
          currentWeekNotes.push(parsed.trim());
        }
      } catch {
        if (!currentWeekNotes.includes(localGenNotes.trim())) currentWeekNotes.push(localGenNotes.trim());
      }
    }
  } catch {}

  const audioTracks: AudioTrackItem[] = [];

  // First collect direct recording URLs
  directAudioCandidates.forEach((cand, idx) => {
    if (!audioTracks.some(t => t.url === cand.url)) {
      audioTracks.push({
        url: cand.url,
        duration: cand.duration || 0,
        date: cand.date || '',
        label: cand.label || `Aufnahme #${audioTracks.length + 1}`,
        author: cand.author || 'teacher',
        idx
      });
    }
  });

  currentWeekNotes.forEach((n, idx) => {
    if (typeof n === 'string') {
      if (n.startsWith('AUDIO:')) {
        const parts = n.substring(6).split('|');
        if (!audioTracks.some(t => t.url === parts[0])) {
          audioTracks.push({
            url: parts[0],
            duration: parseFloat(parts[1]) || 0,
            date: parts[2],
            label: parts[3] || `Aufnahme #${audioTracks.length + 1}`,
            author: parts[4] || 'teacher',
            songTag: parts[7] || undefined,
            idx: audioTracks.length
          });
        }
      } else if (n.startsWith('[') || n.startsWith('{')) {
        try {
          const parsed = JSON.parse(n);
          if (Array.isArray(parsed)) {
            parsed.forEach((item: string) => {
              if (typeof item === 'string' && item.startsWith('AUDIO:')) {
                const parts = item.substring(6).split('|');
                if (!audioTracks.some(t => t.url === parts[0])) {
                  audioTracks.push({
                    url: parts[0],
                    duration: parseFloat(parts[1]) || 0,
                    date: parts[2],
                    label: parts[3] || `Aufnahme #${audioTracks.length + 1}`,
                    author: parts[4] || 'teacher',
                    songTag: parts[7] || undefined,
                    idx: audioTracks.length
                  });
                }
              }
            });
          }
        } catch {}
      }
    }
  });

  // 🌉 Smart Audio Bridge: Bridge active practice tracks from latest snapshot or progressItems if current week has none
  if (audioTracks.length === 0) {
    const allAudioSnapshots = (progressItems || []).filter((item: any) => item.topic_name?.startsWith('Hausaufgabe KW '));
    allAudioSnapshots.sort((a: any, b: any) => {
      const wA = getItemWeek(a);
      const wB = getItemWeek(b);
      if (wA && wB && wA !== wB) return wB.localeCompare(wA);
      const tA = new Date(a.updated_at || a.created_at || 0).getTime();
      const tB = new Date(b.updated_at || b.created_at || 0).getTime();
      return tB - tA;
    });

    for (const snap of allAudioSnapshots) {
      if (snap.recording_url && typeof snap.recording_url === 'string' && snap.recording_url.trim()) {
        audioTracks.push({
          url: snap.recording_url.trim(),
          duration: 0,
          date: snap.updated_at || snap.created_at,
          label: snap.topic_name || 'Aufnahme #1',
          author: 'teacher',
          isCarriedOver: true,
          idx: audioTracks.length
        });
      }
      const snapNotesStr = snap.homework_notes || snap.teacher_notes;
      if (snapNotesStr) {
        try {
          const parsed = typeof snapNotesStr === 'string' && (snapNotesStr.startsWith('[') || snapNotesStr.startsWith('{')) ? JSON.parse(snapNotesStr) : (Array.isArray(snapNotesStr) ? snapNotesStr : [snapNotesStr]);
          if (Array.isArray(parsed)) {
            parsed.forEach((item: any) => {
              if (typeof item === 'string' && item.includes('AUDIO:')) {
                const cleanStr = item.startsWith('[') ? item.replace(/[\[\]"]/g, '') : item;
                const parts = cleanStr.substring(cleanStr.indexOf('AUDIO:') + 6).split('|');
                if (!audioTracks.some(t => t.url === parts[0])) {
                  audioTracks.push({
                    url: parts[0],
                    duration: parseFloat(parts[1]) || 0,
                    date: parts[2],
                    label: parts[3] || ('Aufnahme #' + (audioTracks.length + 1)),
                    author: parts[4] || 'teacher',
                    songTag: parts[7] || undefined,
                    isCarriedOver: true,
                    idx: audioTracks.length
                  });
                }
              }
            });
          }
        } catch {}
      }
      if (audioTracks.length > 0) break;
    }

    // Fallback: check any recording_url or AUDIO: in individual song / lehrwerk progress items
    if (audioTracks.length === 0) {
      (progressItems || []).forEach((item: any) => {
        if (item.recording_url && typeof item.recording_url === 'string' && item.recording_url.trim()) {
          if (!audioTracks.some(t => t.url === item.recording_url.trim())) {
            audioTracks.push({
              url: item.recording_url.trim(),
              duration: 0,
              date: item.updated_at || item.created_at,
              label: item.topic_name || 'Aufnahme',
              author: 'teacher',
              isCarriedOver: true,
              idx: audioTracks.length
            });
          }
        }
        const nStr = item.homework_notes || item.teacher_notes;
        if (nStr && typeof nStr === 'string' && nStr.includes('AUDIO:')) {
          try {
            const parsed = nStr.startsWith('[') || nStr.startsWith('{') ? JSON.parse(nStr) : [nStr];
            if (Array.isArray(parsed)) {
              parsed.forEach((n: any) => {
                if (typeof n === 'string' && n.includes('AUDIO:')) {
                  const cleanStr = n.startsWith('[') ? n.replace(/[\[\]"]/g, '') : n;
                  const parts = cleanStr.substring(cleanStr.indexOf('AUDIO:') + 6).split('|');
                  if (!audioTracks.some(t => t.url === parts[0])) {
                    audioTracks.push({
                      url: parts[0],
                      duration: parseFloat(parts[1]) || 0,
                      date: parts[2],
                      label: parts[3] || ('Aufnahme #' + (audioTracks.length + 1)),
                      author: parts[4] || 'teacher',
                      songTag: parts[7] || undefined,
                      isCarriedOver: true,
                      idx: audioTracks.length
                    });
                  }
                }
              });
            }
          } catch {}
        }
      });
    }
  }

  const isPlaceholderNote = (t: string) => {
    if (!t) return true;
    const lower = t.trim().toLowerCase();
    return lower === 'keine' || lower === 'keine hausaufgabe' || lower === 'keine hausaufgaben';
  };

  const cleanGeneralNote = (text: string) => {
    if (!text) return '';
    let clean = text;
    if (clean.startsWith('[') || clean.startsWith('{') || clean.startsWith('"')) {
      try {
        const p = JSON.parse(clean);
        if (Array.isArray(p)) {
          clean = p.filter((x: any) => typeof x === 'string' && !x.startsWith('AUDIO:') && !x.startsWith('STICKER:') && !x.startsWith('LATENCY:') && !x.startsWith('SNAPSHOT_') && !x.startsWith('FEEDBACK:') && !x.startsWith('STUDENT_NOTE_PUBLIC:') && !x.startsWith('STUDENT_NOTE_PRIVATE:') && !x.startsWith('STUDENT_QUESTION:')).join(' ');
        } else if (typeof p === 'string') {
          clean = p;
        }
      } catch {}
    }
    return clean
      .replace(/\["AUDIO:[^"]*"\]/g, '')
      .replace(/AUDIO:[^\s,|]+/g, '')
      .replace(/.*(STUDENT_NOTE_PUBLIC|STUDENT_NOTE_PRIVATE|STUDENT_QUESTION):[^|]*\|/, '')
      .replace(/^STUDENT_QUESTION:[^|]*\|?/i, '')
      .replace(/^❓\s*Frage für den Unterricht:\s*/i, '')
      .trim();
  };

  let isPastNoteCarriedOver = false;
  let carriedOverWeekLabel = '';
  const isDidacticNote = (n: any) => typeof n === 'string' && !n.startsWith('AUDIO:') && !n.startsWith('STICKER:') && !n.startsWith('LATENCY:') && !n.startsWith('LOOP:') && !n.startsWith('SYSTEM:') && !n.startsWith('SNAPSHOT_') && !n.startsWith('FEEDBACK:') && !n.startsWith('STUDENT_NOTE_PUBLIC:') && !n.startsWith('STUDENT_NOTE_PRIVATE:') && !n.startsWith('STUDENT_QUESTION:') && !n.startsWith('❓ Frage für den Unterricht:');

  let allTeacherNotes: string[] = currentWeekNotes.filter(isDidacticNote).map(cleanGeneralNote).filter(n => !isPlaceholderNote(n));

  if (allTeacherNotes.length === 0) {
    const pastHwSnapshots = (progressItems || []).filter((item: any) => {
      if (!item.topic_name?.startsWith('Hausaufgabe KW ')) return false;
      const itWeekIso = getItemWeek(item);
      return itWeekIso && itWeekIso < currentWeekStr;
    });
    pastHwSnapshots.sort((a: any, b: any) => {
      const wA = getItemWeek(a);
      const wB = getItemWeek(b);
      if (wA !== wB) return (wB || '').localeCompare(wA || '');
      const tA = new Date(a.updated_at || a.created_at || 0).getTime();
      const tB = new Date(b.updated_at || b.created_at || 0).getTime();
      return tB - tA;
    });
    const latestPast = pastHwSnapshots[0];
    if (latestPast && latestPast.homework_notes) {
      try {
        const parsed = typeof latestPast.homework_notes === 'string' ? JSON.parse(latestPast.homework_notes) : latestPast.homework_notes;
        if (Array.isArray(parsed)) {
          const pastNotes = parsed.filter(isDidacticNote).map(cleanGeneralNote).filter(n => !isPlaceholderNote(n));
          if (pastNotes.length > 0) {
            allTeacherNotes = pastNotes;
            isPastNoteCarriedOver = true;
            const kwMatch = latestPast.topic_name?.match(/Hausaufgabe KW\s*(\d+)/i);
            if (kwMatch) carriedOverWeekLabel = `KW ${kwMatch[1]}`;
          }
        } else if (typeof parsed === 'string') {
          const cleanP = cleanGeneralNote(parsed);
          if (cleanP && !isPlaceholderNote(cleanP)) {
            allTeacherNotes = [cleanP];
            isPastNoteCarriedOver = true;
            const kwMatch = latestPast.topic_name?.match(/Hausaufgabe KW\s*(\d+)/i);
            if (kwMatch) carriedOverWeekLabel = `KW ${kwMatch[1]}`;
          }
        }
      } catch {}
    }
  }
  const generalNote = allTeacherNotes[0] || '';

  const isAudioCarriedOver = audioTracks.some(t => t.isCarriedOver);
  const isCarriedOverPlan = isAudioCarriedOver || isPastNoteCarriedOver;

  let studentQuestionEntry = currentWeekNotes.find(n => typeof n === 'string' && (n.startsWith('STUDENT_QUESTION:') || n.startsWith('❓ Frage für den Unterricht:')));
  if (!studentQuestionEntry) {
    const pastHwSnapshots = (progressItems || []).filter((item: any) => {
      if (!item.topic_name?.startsWith('Hausaufgabe KW ')) return false;
      const itWeekIso = getItemWeek(item);
      return itWeekIso && itWeekIso < currentWeekStr;
    });
    pastHwSnapshots.sort((a: any, b: any) => {
      const wA = getItemWeek(a);
      const wB = getItemWeek(b);
      if (wA !== wB) return (wB || '').localeCompare(wA || '');
      const tA = new Date(a.updated_at || a.created_at || 0).getTime();
      const tB = new Date(b.updated_at || b.created_at || 0).getTime();
      return tB - tA;
    });
    const latestPast = pastHwSnapshots[0];
    if (latestPast && latestPast.homework_notes) {
      try {
        const parsed = typeof latestPast.homework_notes === 'string' ? JSON.parse(latestPast.homework_notes) : latestPast.homework_notes;
        if (Array.isArray(parsed)) {
          const pastQ = parsed.find((n: string) => typeof n === 'string' && (n.startsWith('STUDENT_QUESTION:') || n.startsWith('❓ Frage für den Unterricht:')));
          if (pastQ) studentQuestionEntry = pastQ;
        }
      } catch {}
    }
  }

  let studentQuestionText = '';
  if (studentQuestionEntry) {
    if (studentQuestionEntry.startsWith('STUDENT_QUESTION:')) {
      const withoutPrefix = studentQuestionEntry.replace(/^STUDENT_QUESTION:/, '');
      const pipeIdx = withoutPrefix.indexOf('|');
      studentQuestionText = pipeIdx !== -1 ? withoutPrefix.slice(pipeIdx + 1).trim() : withoutPrefix.trim();
    } else {
      studentQuestionText = studentQuestionEntry.replace(/^❓\s*Frage für den Unterricht:\s*/i, '').trim();
    }
  }

  const validGeneralNote = isPlaceholderNote(generalNote) ? '' : generalNote;

  let specificTeacherNote = validGeneralNote;
  if (!specificTeacherNote) {
    for (const b of formattedJuniorBooks) {
      if (b.notesList && b.notesList.length > 0 && b.notesList[0].text && !isPlaceholderNote(b.notesList[0].text)) {
        specificTeacherNote = b.notesList[0].text;
        break;
      }
    }
  }
  if (!specificTeacherNote) {
    for (const s of otherActiveSongs) {
      if (s.homework_notes && !isPlaceholderNote(s.homework_notes)) {
        specificTeacherNote = s.homework_notes;
        break;
      }
    }
  }

  const hasAnyHomework = formattedJuniorBooks.length > 0 || otherActiveSongs.length > 0 || audioTracks.length > 0 || Boolean(validGeneralNote) || Boolean(studentQuestionText);

  return {
    formattedJuniorBooks,
    otherActiveSongs,
    audioTracks,
    generalNote: validGeneralNote,
    specificTeacherNote,
    allTeacherNotes,
    carriedOverWeek: carriedOverWeekLabel,
    studentQuestionText,
    hasAnyHomework,
    isCarriedOverPlan
  };
}
