import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../../lib/supabase';

export interface UseStudentSongsDataProps {
  studentId: string;
  studentUser: any;
}

const cleanTitle = (t: string) => 
  (t || '').replace(/\s*\((gitarre|guitar|e-gitarre|bass|e-bass|drums|schlagzeug|klavier|piano|keys|keyboard|vocals|gesang|stimme|allgemein)\)/i, '').trim();

export function useStudentSongsData({
  studentId,
  studentUser
}: UseStudentSongsDataProps) {
  const [songs, setSongs] = useState<any[]>([]);
  const [lehrwerke, setLehrwerke] = useState<any[]>([]);
  const [activeSongSkills, setActiveSongSkills] = useState<any[]>([]);
  const [progressItems, setProgressItems] = useState<any[]>([]);
  const [progressLoading, setProgressLoading] = useState(false);
  const [localProgress, setLocalProgress] = useState<any[]>(() => {
    try {
      const stored1 = typeof window !== 'undefined' ? localStorage.getItem('student_lehrwerke_progress') : null;
      const stored2 = typeof window !== 'undefined' ? localStorage.getItem('campus_lehrwerke_progress') : null;
      const p1 = stored1 ? JSON.parse(stored1) : [];
      const p2 = stored2 ? JSON.parse(stored2) : [];
      return [...(Array.isArray(p1) ? p1 : []), ...(Array.isArray(p2) ? p2 : [])];
    } catch {
      return [];
    }
  });

  const targetId = studentId || studentUser?.id;

  const fetchStudentProgress = useCallback(async (silent = false) => {
    if (!targetId) return;

    // ⚡ 0. Optimistic Instant Persistent Cache Loading (0ms)
    let hasValidCache = false;
    try {
      const cacheKey = `cg_mediathek_cache_${targetId}`;
      const cached = localStorage.getItem(cacheKey) || sessionStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed.songs) && parsed.songs.length > 0) {
          setSongs(parsed.songs);
          hasValidCache = true;
        }
        if (Array.isArray(parsed.lehrwerke) && parsed.lehrwerke.length > 0) {
          setLehrwerke(parsed.lehrwerke);
          hasValidCache = true;
        }
        if (Array.isArray(parsed.activeSongSkills) && parsed.activeSongSkills.length > 0) {
          setActiveSongSkills(parsed.activeSongSkills);
        }
        if (Array.isArray(parsed.progressItems) && parsed.progressItems.length > 0) {
          setProgressItems(parsed.progressItems);
        }
      }
    } catch {
      // ignore
    }

    if (!silent && !hasValidCache) {
      setProgressLoading(true);
    }

    try {
      const stored = localStorage.getItem('student_lehrwerke_progress') || localStorage.getItem(`campus_lehrwerke_progress_${targetId}`);
      if (stored) {
        setLocalProgress(JSON.parse(stored));
      }
    } catch (e) {
      console.error(e);
    }

    const schoolId = studentUser?.school_id || (studentUser as any)?.schools?.id;

    // ⚡ 1. Ultra-Fast Parallel SWR Supabase Queries
    try {
      const teacherId = studentUser?.teacher_id || (studentUser as any)?.teacherId;
      let lehrwerkeQuery = supabase.from('lehrwerke').select('*');
      const orParts: string[] = ['school_id.is.null'];
      if (schoolId) orParts.push(`school_id.eq.${schoolId}`);
      if (teacherId) orParts.push(`teacher_id.eq.${teacherId}`);
      const lehrwerkePromise = lehrwerkeQuery.or(orParts.join(',')).order('title');

      const songsPromise = schoolId
        ? supabase.from('songs').select('*').or(`school_id.eq.${schoolId},school_id.is.null`).order('title')
        : supabase.from('songs').select('*').order('title');

      const skillsPromise = supabase
        .from('user_song_skills')
        .select('*, songs(*)')
        .eq('user_id', targetId);

      const matrixPromise = supabase
        .from('progress_matrix')
        .select('*')
        .eq('student_id', targetId)
        .order('updated_at', { ascending: false });

      const [lehrwerkeRes, songsRes, skillsRes, matrixRes] = await Promise.allSettled([
        lehrwerkePromise,
        songsPromise,
        skillsPromise,
        matrixPromise
      ]);

      let loadedLehrwerke: any[] = [];
      let loadedSongs: any[] = [];
      let loadedSkills: any[] = [];
      let loadedProgress: any[] = [];

      if (lehrwerkeRes.status === 'fulfilled' && (lehrwerkeRes.value as any)?.data) {
        loadedLehrwerke = ((lehrwerkeRes.value as any).data || []).map((item: any) => ({
          ...item,
          totalPages: item.total_pages || 50
        }));

        // Merge locally cached custom Lehrwerke (strictly deduplicated by ID and Title)
        try {
          const storedCustom = localStorage.getItem('custom_lehrwerke');
          if (storedCustom) {
            const parsedCustom = JSON.parse(storedCustom);
            if (Array.isArray(parsedCustom)) {
              parsedCustom.forEach(c => {
                if (c && c.id) {
                  const normCustomTitle = (c.title || '').trim().toLowerCase();
                  const alreadyExists = loadedLehrwerke.some(m => 
                    String(m.id) === String(c.id) || 
                    (m.title || '').trim().toLowerCase() === normCustomTitle
                  );
                  if (!alreadyExists) {
                    loadedLehrwerke.push({
                      ...c,
                      totalPages: c.totalPages || c.total_pages || 50
                    });
                  }
                }
              });
            }
          }
        } catch {}

        if (loadedLehrwerke.length > 0) {
          setLehrwerke(loadedLehrwerke);
        }
      }

      if (songsRes.status === 'fulfilled' && (songsRes.value as any)?.data) {
        loadedSongs = (songsRes.value as any).data || [];
        if (loadedSongs.length > 0) {
          setSongs(loadedSongs);
        }
      }

      if (skillsRes.status === 'fulfilled' && (skillsRes.value as any)?.data) {
        loadedSkills = ((skillsRes.value as any).data || []).filter((skill: any) => {
          if (!skill.songs) return false;
          return skill.songs.is_campus_active === true || skill.is_current_homework === true || Boolean(skill.homework_notes) || Boolean(skill.teacher_notes);
        });
        setActiveSongSkills(loadedSkills);
      }

      if (matrixRes.status === 'fulfilled' && (matrixRes.value as any)?.data) {
        const uniqueItemsMap = new Map<string, any>();
        ((matrixRes.value as any).data || []).forEach((item: any) => {
          const name = (item.topic_name || '').trim().toLowerCase();
          if (name && !uniqueItemsMap.has(name)) {
            uniqueItemsMap.set(name, item);
          }
        });
        loadedProgress = Array.from(uniqueItemsMap.values());

        // 🛡️ Cold Cache / PWA: Unpack SNAPSHOT_SONGS into loadedProgress so assigned songs are never lost on empty localStorage
        ((matrixRes.value as any).data || []).forEach((item: any) => {
          if (item.topic_name && item.topic_name.startsWith('Hausaufgabe KW ')) {
            const extractSongsFromSnapshot = (raw: any) => {
              if (!raw) return;
              let songList: any[] = [];
              if (Array.isArray(raw)) {
                const sEntry = raw.find((entry: any) => typeof entry === 'string' && entry.startsWith('SNAPSHOT_SONGS:'));
                if (sEntry) {
                  try {
                    const parsed = JSON.parse(sEntry.substring('SNAPSHOT_SONGS:'.length));
                    if (Array.isArray(parsed)) songList = parsed;
                  } catch {}
                }
              } else if (typeof raw === 'string') {
                if (raw.startsWith('[') || raw.startsWith('{')) {
                  try {
                    const parsedArr = JSON.parse(raw);
                    if (Array.isArray(parsedArr)) {
                      const sEntry = parsedArr.find((entry: any) => typeof entry === 'string' && entry.startsWith('SNAPSHOT_SONGS:'));
                      if (sEntry) {
                        const parsed = JSON.parse(sEntry.substring('SNAPSHOT_SONGS:'.length));
                        if (Array.isArray(parsed)) songList = parsed;
                      }
                    }
                  } catch {}
                }
                if (songList.length === 0 && raw.includes('SNAPSHOT_SONGS:')) {
                  try {
                    const sIdx = raw.indexOf('SNAPSHOT_SONGS:');
                    const after = raw.slice(sIdx + 'SNAPSHOT_SONGS:'.length);
                    const endIdx = after.search(/\n\n--- [A-Z_]+ ---|\n\nSNAPSHOT_/);
                    const jsonStr = (endIdx !== -1 ? after.slice(0, endIdx) : after).trim();
                    const parsed = JSON.parse(jsonStr);
                    if (Array.isArray(parsed)) songList = parsed;
                  } catch {}
                }
              }

              songList.forEach((song: any) => {
                const sTitle = (song.title || song.topic_name || '').trim();
                if (!sTitle) return;
                const existing = loadedProgress.find((p: any) => (p.topic_name || p.title || '').trim().toLowerCase() === sTitle.toLowerCase());
                if (existing) {
                  existing.is_current_homework = true;
                  if (song.homework_notes || song.notes || song.note) {
                    existing.homework_notes = song.homework_notes || song.notes || song.note;
                  }
                  if (song.teacher_notes) {
                    existing.teacher_notes = song.teacher_notes;
                  }
                  if (song.status) {
                    existing.status = song.status;
                  }
                } else {
                  loadedProgress.push({
                    id: song.id || `snapshot-song-${Date.now()}-${Math.random()}`,
                    student_id: targetId,
                    topic_name: sTitle,
                    title: sTitle,
                    is_current_homework: true,
                    status: song.status || 'IN_PROGRESS',
                    homework_notes: song.homework_notes || song.notes || song.note || '',
                    teacher_notes: song.teacher_notes || '',
                    updated_at: item.updated_at || item.created_at
                  });
                }
              });
            };

            extractSongsFromSnapshot(item.homework_notes);
            extractSongsFromSnapshot(item.teacher_notes);
          }
        });

        // 🛡️ Fail-Safe: Ensure activeSongSkills also reflects homework songs from loadedProgress
        if (loadedSkills && loadedSkills.length > 0) {
          loadedProgress.forEach((p: any) => {
            if (p.is_current_homework && (p.topic_name || p.title)) {
              const pNorm = (p.topic_name || p.title || '').trim().toLowerCase();
              const pClean = cleanTitle(pNorm.replace(/\s*\([^)]*\)\s*$/, ''));
              const matchSkill = loadedSkills.find((s: any) => {
                const sTitle = (s.songs?.title || s.title || s.song_title || '').trim().toLowerCase();
                const sArtist = (s.songs?.artist || s.artist || '').trim().toLowerCase();
                const sFull = sArtist ? `${sArtist} - ${sTitle}` : sTitle;
                return sTitle === pNorm || 
                       sFull === pNorm || 
                       cleanTitle(sTitle) === pClean || 
                       cleanTitle(sFull) === pClean ||
                       pNorm.includes(sTitle) || 
                       (sArtist && pNorm.includes(sArtist) && pNorm.includes(sTitle));
              });
              if (matchSkill) {
                matchSkill.is_current_homework = true;
                if (p.homework_notes) matchSkill.homework_notes = p.homework_notes;
                if (p.teacher_notes) matchSkill.teacher_notes = p.teacher_notes;
              }
            }
          });
          setActiveSongSkills([...loadedSkills]);
        }

        setProgressItems(loadedProgress);

        // 🛡️ Auto-heal localProgress for cold/online cache: merge database Lehrwerke into localProgress
        setLocalProgress((prevLocal: any[]) => {
          const combined = (prevLocal || []).map((a: any) => ({ ...a, pageStates: { ...(a.pageStates || {}) } }));
          loadedProgress.forEach((item: any) => {
            if (item.topic_name && item.topic_name.includes(' - Seite ')) {
              const parts = item.topic_name.split(' - Seite ');
              const bookTitle = parts[0].trim();
              const pageNum = parseInt(parts[1], 10);
              const book = loadedLehrwerke.find((g: any) => (g.title || '').trim().toLowerCase() === bookTitle.toLowerCase());
              const bId = book?.id || `custom-${bookTitle.toLowerCase()}`;
              let assignment = combined.find((a: any) => 
                (String(a.studentId) === String(targetId) || !a.studentId) &&
                (String(a.lehrwerkId) === String(bId) || ((a.bookTitle || a.lehrwerkTitle || '').trim().toLowerCase() === bookTitle.toLowerCase()))
              );
              if (!assignment) {
                assignment = {
                  studentId: targetId,
                  lehrwerkId: bId,
                  bookTitle: book?.title || bookTitle,
                  lehrwerkTitle: book?.title || bookTitle,
                  totalPages: book?.totalPages || book?.total_pages || 50,
                  assignedAt: item.created_at || item.updated_at || new Date().toISOString(),
                  pageStates: {}
                };
                combined.push(assignment);
              }
              if (!isNaN(pageNum) && assignment.pageStates) {
                if (!assignment.pageStates[pageNum] || item.is_current_homework) {
                  let status: 'locked' | 'homework' | 'mastered' | 'purple' = 'locked';
                  if (item.status === 'MASTERED') status = 'mastered';
                  else if (item.status === 'THEORY_DONE') status = 'purple';
                  else if (item.is_current_homework) status = 'homework';

                  assignment.pageStates[pageNum] = {
                    ...(assignment.pageStates[pageNum] || {}),
                    status: assignment.pageStates[pageNum]?.status || status,
                    isCurrentHomework: Boolean(item.is_current_homework),
                    notes: item.teacher_notes || assignment.pageStates[pageNum]?.notes || '',
                    homework_notes: item.homework_notes || item.teacher_notes || assignment.pageStates[pageNum]?.homework_notes || ''
                  };
                }
              }
            } else if (item.topic_name && item.topic_name.startsWith('Hausaufgabe KW ') && ((item.teacher_notes && item.teacher_notes.includes('SNAPSHOT_LEHRWERKE:')) || (item.homework_notes && item.homework_notes.includes('SNAPSHOT_LEHRWERKE:')))) {
              // 📚 Cold Cache / Online: Unpack assigned Lehrwerke and homework page states from SNAPSHOT_LEHRWERKE
              try {
                const sourceNotes = item.teacher_notes && item.teacher_notes.includes('SNAPSHOT_LEHRWERKE:') ? item.teacher_notes : item.homework_notes;
                const snapshotIdx = sourceNotes.indexOf('SNAPSHOT_LEHRWERKE:');
                const afterSnapshot = sourceNotes.slice(snapshotIdx + 'SNAPSHOT_LEHRWERKE:'.length);
                const endIdx = afterSnapshot.search(/\n\n--- [A-Z_]+ ---|\n\nSNAPSHOT_/);
                const jsonStr = (endIdx !== -1 ? afterSnapshot.slice(0, endIdx) : afterSnapshot).trim();
                const parsed = JSON.parse(jsonStr);
                if (Array.isArray(parsed)) {
                  parsed.forEach((lw: any) => {
                    const bookTitle = (lw.title || lw.bookTitle || lw.lehrwerkTitle || '').trim();
                    if (!bookTitle) return;
                    const book = loadedLehrwerke.find((g: any) => (g.title || '').trim().toLowerCase() === bookTitle.toLowerCase());
                    const bId = lw.id || lw.lehrwerkId || book?.id || `custom-${bookTitle.toLowerCase()}`;
                    let assignment = combined.find((a: any) =>
                      (String(a.studentId) === String(targetId) || !a.studentId) &&
                      (String(a.lehrwerkId) === String(bId) || ((a.bookTitle || a.lehrwerkTitle || '').trim().toLowerCase() === bookTitle.toLowerCase()))
                    );
                    if (!assignment) {
                      assignment = {
                        studentId: targetId,
                        lehrwerkId: bId,
                        bookTitle: book?.title || bookTitle,
                        lehrwerkTitle: book?.title || bookTitle,
                        totalPages: lw.totalPages || book?.totalPages || book?.total_pages || 50,
                        assignedAt: item.created_at || new Date().toISOString(),
                        pageStates: {}
                      };
                      combined.push(assignment);
                    }
                    if (Array.isArray(lw.pages) && assignment.pageStates) {
                      lw.pages.forEach((p: any) => {
                        const pNum = typeof p === 'object' ? p.page : parseInt(p, 10);
                        if (!isNaN(pNum) && !assignment.pageStates[pNum]) {
                          assignment.pageStates[pNum] = {
                            status: 'homework',
                            isCurrentHomework: true,
                            notes: (typeof p === 'object' ? p.notes : '') || '',
                            homework_notes: (typeof p === 'object' ? p.notes : '') || ''
                          };
                        }
                      });
                    }
                  });
                }
              } catch (e) {
                console.warn('Could not parse SNAPSHOT_LEHRWERKE in fetchStudentProgress:', e);
              }
            }
          });
          return combined;
        });
      }

      // Persist cache snapshot for instant 0ms loads
      if (loadedSongs.length > 0 || loadedLehrwerke.length > 0 || loadedProgress.length > 0) {
        try {
          const payload = JSON.stringify({
            lehrwerke: loadedLehrwerke,
            songs: loadedSongs,
            activeSongSkills: loadedSkills,
            progressItems: loadedProgress,
            timestamp: Date.now()
          });
          const cacheKey = `cg_mediathek_cache_${targetId}`;
          localStorage.setItem(cacheKey, payload);
          sessionStorage.setItem(cacheKey, payload);
        } catch {
          // ignore quota
        }
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('campus_homework_updated', { detail: { studentId: targetId } }));
      }
    } catch (err) {
      console.error('Error fetching student progress in parallel:', err);
    } finally {
      setProgressLoading(false);
    }
  }, [targetId, studentUser]);

  // Unified canonical resolver for all student songs
  const assignedCampusSongs = useMemo(() => {
    const songsMap = new Map<string, any>();

    // 1. From activeSongSkills (Direct user assignments in user_song_skills)
    (activeSongSkills || []).forEach((skill: any) => {
      const songObj = skill.songs || {};
      const title = songObj.title || skill.title || skill.song_title || '';
      const artist = songObj.artist || skill.artist || 'Unbekannt';
      const id = songObj.id || skill.song_id || skill.id;
      if (title) {
        const normKey = title.toLowerCase().trim();
        songsMap.set(normKey, {
          id: id || normKey,
          title,
          artist,
          audio_url: songObj.audio_url || skill.audio_url,
          tempo_bpm: songObj.tempo_bpm || skill.tempo_bpm,
          genre: songObj.genre || skill.genre,
          color_scheme: songObj.color_scheme,
          is_campus_active: true,
          progress_percent: skill.progress_percent || 0,
          status: skill.status || (skill.progress_percent === 100 ? 'MASTERED' : 'IN_PROGRESS'),
          is_current_homework: Boolean(skill.is_current_homework),
          homework_notes: skill.homework_notes || skill.teacher_notes || ''
        });
      }
    });

    // 2. From progressItems (Direct assignments in progress_matrix)
    (progressItems || []).forEach((item: any) => {
      const rawTopic = (item.topic_name || item.title || '').trim();
      if (!rawTopic || rawTopic.startsWith('Hausaufgabe KW ') || rawTopic.includes(' - Seite ')) return;
      
      const cleanT = rawTopic.replace(/\s*\([^)]*\)\s*$/, '').trim();
      const normKey = cleanT.toLowerCase();
      
      const existing = songsMap.get(normKey) || Array.from(songsMap.values()).find(s => s.title.toLowerCase() === normKey || normKey.includes(s.title.toLowerCase()) || s.title.toLowerCase().includes(normKey));
      
      if (existing) {
        if (item.is_current_homework) existing.is_current_homework = true;
        if (item.status === 'MASTERED') existing.status = 'MASTERED';
        if (item.homework_notes || item.teacher_notes) existing.homework_notes = item.homework_notes || item.teacher_notes;
        if (item.progress_percent !== undefined) existing.progress_percent = item.progress_percent;
      } else {
        const catalogSong = (songs || []).find(s => 
          s.id === item.song_id || 
          s.title.toLowerCase() === normKey || 
          normKey.includes(s.title.toLowerCase()) || 
          s.title.toLowerCase().includes(normKey)
        );

        let title = cleanT;
        let artist = 'Unbekannt';
        if (catalogSong) {
          title = catalogSong.title;
          artist = catalogSong.artist || 'Unbekannt';
        } else if (cleanT.includes(' - ')) {
          const parts = cleanT.split(' - ');
          artist = parts[0].trim();
          title = parts.slice(1).join(' - ').trim();
        }

        songsMap.set(title.toLowerCase().trim(), {
          id: item.song_id || catalogSong?.id || item.id || normKey,
          title,
          artist,
          audio_url: catalogSong?.audio_url || item.audio_url,
          tempo_bpm: catalogSong?.tempo_bpm || item.tempo_bpm,
          genre: catalogSong?.genre || item.genre,
          color_scheme: catalogSong?.color_scheme,
          is_campus_active: true,
          progress_percent: item.progress_percent || (item.status === 'MASTERED' ? 100 : 0),
          status: item.status,
          is_current_homework: Boolean(item.is_current_homework),
          homework_notes: item.homework_notes || item.teacher_notes || ''
        });
      }
    });

    // 3. Check songs catalog for any is_campus_active songs matching assigned items
    (songs || []).forEach((s: any) => {
      if (!s.title) return;
      const normKey = s.title.toLowerCase().trim();
      if (songsMap.has(normKey)) return;
      const isAssigned = (progressItems || []).some(item => 
        (item.topic_name || '').toLowerCase().includes(normKey) ||
        normKey.includes((item.topic_name || '').toLowerCase())
      );
      if (isAssigned) {
        songsMap.set(normKey, {
          ...s,
          artist: s.artist || 'Unbekannt'
        });
      }
    });

    // 4. Unpack SNAPSHOT_SONGS from progressItems snapshots (Fail-Safe Server Hydration)
    (progressItems || []).forEach((item: any) => {
      if (!item.topic_name?.startsWith('Hausaufgabe KW ')) return;
      const rawNotes = item.homework_notes || item.teacher_notes;
      if (!rawNotes) return;
      let parsedNotes: any = null;
      try {
        parsedNotes = typeof rawNotes === 'string' ? JSON.parse(rawNotes) : rawNotes;
      } catch {}
      if (!Array.isArray(parsedNotes)) {
        if (typeof rawNotes === 'string' && rawNotes.includes('SNAPSHOT_SONGS:')) {
          parsedNotes = [rawNotes];
        } else {
          return;
        }
      }
      const snapSongEntry = parsedNotes.find((n: any) => typeof n === 'string' && n.includes('SNAPSHOT_SONGS:'));
      if (snapSongEntry) {
        try {
          const sIdx = snapSongEntry.indexOf('SNAPSHOT_SONGS:');
          const after = snapSongEntry.slice(sIdx + 'SNAPSHOT_SONGS:'.length);
          const endIdx = after.search(/\n\n--- [A-Z_]+ ---|\n\nSNAPSHOT_/);
          const jsonStr = (endIdx !== -1 ? after.slice(0, endIdx) : after).trim();
          const parsedSongs = JSON.parse(jsonStr);
          if (Array.isArray(parsedSongs)) {
            parsedSongs.forEach((song: any) => {
              const sTitle = song.topic_name || song.title || '';
              if (!sTitle) return;
              const normKey = sTitle.toLowerCase().trim();
              const existing = songsMap.get(normKey);
              if (existing) {
                existing.is_current_homework = true;
                if (song.homework_notes && !existing.homework_notes) {
                  existing.homework_notes = song.homework_notes;
                }
              } else {
                let artist = 'Unbekannt';
                let cleanT = sTitle;
                if (sTitle.includes(' - ')) {
                  const parts = sTitle.split(' - ');
                  artist = parts[0].trim();
                  cleanT = parts.slice(1).join(' - ').trim();
                }
                songsMap.set(normKey, {
                  id: song.id || normKey,
                  title: cleanT,
                  artist,
                  is_campus_active: true,
                  progress_percent: 0,
                  status: song.status || 'IN_PROGRESS',
                  is_current_homework: true,
                  homework_notes: song.homework_notes || ''
                });
              }
            });
          }
        } catch (snapErr) {
          console.warn('[assignedCampusSongs] Error parsing SNAPSHOT_SONGS:', snapErr);
        }
      }
    });

    return Array.from(songsMap.values());
  }, [activeSongSkills, progressItems, songs]);

  const isSongMastered = useCallback((song: any) => {
    if (!song) return false;
    const songId = typeof song === 'string' ? song : (song.id || song.song_id);
    if (typeof song === 'object') {
      if (song.status === 'MASTERED' || (song.progress_percent || 0) === 100) return true;
    }
    const normKey = (typeof song === 'object' ? song.title : '')?.toLowerCase().trim();
    const pItem = (progressItems || []).find(item => {
      if (songId && (String(item.song_id) === String(songId) || String(item.id) === String(songId))) return true;
      if (normKey) {
        const t = (item.topic_name || item.title || '').toLowerCase().trim();
        return t && (t === normKey || t.includes(normKey) || normKey.includes(t));
      }
      return false;
    });
    if (pItem && (pItem.status === 'MASTERED' || (pItem.progress_percent || 0) === 100)) return true;
    const skill = (activeSongSkills || []).find((s: any) => {
      if (songId && (String(s.song_id) === String(songId) || String(s.id) === String(songId) || String(s.songs?.id) === String(songId))) return true;
      if (normKey) {
        const skTitle = (s.songs?.title || s.title || s.song_title || '').toLowerCase().trim();
        return skTitle && (skTitle === normKey || skTitle.includes(normKey) || normKey.includes(skTitle));
      }
      return false;
    });
    if (skill && (skill.is_stage_ready || (skill.progress_percent || 0) === 100 || skill.status === 'MASTERED')) return true;
    return false;
  }, [progressItems, activeSongSkills]);

  const songStats = useMemo(() => {
    const assigned = assignedCampusSongs;
    const mastered = assigned.filter(song => isSongMastered(song));

    return {
      assignedCount: assigned.length,
      masteredCount: mastered.length,
      activeCount: assigned.length - mastered.length
    };
  }, [assignedCampusSongs, isSongMastered]);

  useEffect(() => {
    fetchStudentProgress();

    if (typeof window === 'undefined') return;

    const handleHomeworkUpdated = (e: any) => {
      if (!e.detail?.studentId || String(e.detail.studentId) === String(targetId)) {
        fetchStudentProgress(true);
      }
    };

    window.addEventListener('campus_homework_updated', handleHomeworkUpdated);
    return () => {
      window.removeEventListener('campus_homework_updated', handleHomeworkUpdated);
    };
  }, [targetId, fetchStudentProgress]);

  return {
    songs,
    setSongs,
    lehrwerke,
    setLehrwerke,
    activeSongSkills,
    setActiveSongSkills,
    progressItems,
    setProgressItems,
    assignedCampusSongs,
    localProgress,
    setLocalProgress,
    progressLoading,
    fetchStudentProgress,
    isSongMastered,
    songStats
  };
}
