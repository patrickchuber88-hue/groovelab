import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Calendar, BookOpen, Music, Headphones, FileText, HelpCircle,
  Share2, Copy, Check, Printer, ChevronDown, ChevronRight, Play, Pause,
  Lock, Sparkles, Pin, User, Volume2, VolumeX, AlertTriangle
} from 'lucide-react';
import { StudentHomeworkStatusButton } from './StudentHomeworkStatusButton';
import {
  formatConsecutivePageRanges,
  formatConsecutiveExerciseRanges,
  cleanHomeworkNote,
  isDummyOrTestSong,
  isWeeklySnapshotContainer
} from '../tabs/briefing/homeworkSummaryHelper';
import {
  parseSnapshotLehrwerke,
  parseSnapshotSongs,
  parseAudioEntries,
  parseDidacticTextNotes,
  parseRawNotesArray,
  UnpackedAudioNote
} from '../meisterwerk/utils/meisterwerkSnapshotUnpacker';
import { isInternalMetadataNote, cleanNotesText } from '../../../domain/stickersAndTresor';
import {
  getISOWeek,
  getItemWeek,
  getWeekDateRange,
  getSongColor,
  CANONICAL_LEHRWERK_COLOR
} from '../studentDateUtils';
import { cleanHomeworkTitle } from '../../../utils/homeworkSnapshotHelper';
import { formatTeacherFullName } from '../../../utils/nameHelper';
import { resolvePlayableAudioSource } from '../../../utils/audioStorageHelper';
import { parseStudentQuestionFromNotes } from '../meisterwerk.types';
import { AudioTrackCarousel } from '../../AudioTrackCarousel';
import { useMeisterwerkTts } from '../meisterwerk/hooks/useMeisterwerkTts';
import { MicroScoreSnippetButton } from '../meisterwerk/microscore';
import {
  collectHomeworkSongsFromSources,
  extractSongArtistAndTitle,
  formatDisplayTitle
} from '../meisterwerk/utils/meisterwerkSongHelpers';

// ─── Archive Audio Player Row ───────────────────────────────────────────────
export interface ArchiveAudioTrackItem {
  url: string;
  label: string;
  duration?: number;
  author?: string;
  date?: string;
}

export const ArchiveAudioPlayerRow: React.FC<{ track: ArchiveAudioTrackItem; aIdx: number }> = ({ track, aIdx }) => {
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(track.duration || 0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  const formattedDate = useMemo(() => {
    if (!track.date) return '';
    try {
      if (track.date.includes('T') || (track.date.includes('-') && track.date.length > 8)) {
        const d = new Date(track.date);
        if (!isNaN(d.getTime())) {
          const dateStr = d.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' });
          const timeStr = d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
          return `${dateStr} · ${timeStr} Uhr`;
        }
      }
      return track.date;
    } catch {
      return track.date;
    }
  }, [track.date]);

  useEffect(() => {
    let isCancelled = false;

    const resolve = async () => {
      try {
        let src: string | null = null;
        let cleanup: (() => void) | undefined = undefined;

        if (track.url.startsWith('blob:') || track.url.startsWith('data:') || track.url.startsWith('http://') || track.url.startsWith('https://')) {
          src = track.url;
        } else {
          const res = await resolvePlayableAudioSource(track.url, 'campus-assets', 1800);
          if (res && res.src) {
            src = res.src;
            cleanup = res.cleanup;
          } else {
            const resGroove = await resolvePlayableAudioSource(track.url, 'groovelab-assets', 1800);
            if (resGroove && resGroove.src) {
              src = resGroove.src;
              cleanup = resGroove.cleanup;
            }
          }
        }

        if (isCancelled) {
          if (cleanup) cleanup();
          return;
        }

        if (src) {
          if (cleanupRef.current && cleanupRef.current !== cleanup) {
            cleanupRef.current();
          }
          cleanupRef.current = cleanup || null;
          setResolvedUrl(src);
        }
      } catch (err) {
        console.warn('[ArchiveAudioPlayerRow] Resolution error:', err);
      }
    };

    resolve();

    return () => {
      isCancelled = true;
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, [track.url]);

  const togglePlay = () => {
    if (!audioRef.current || !resolvedUrl) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(err => {
          console.warn('[ArchiveAudioPlayerRow] Play error:', err);
          setIsPlaying(false);
        });
    }
  };

  const formatSecs = (sec: number) => {
    if (isNaN(sec) || sec <= 0) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '12px',
      padding: '10px 14px',
      background: '#f8fafc',
      border: '1px solid #e2e8f0',
      borderRadius: '12px'
    }}>
      {resolvedUrl && (
        <audio
          ref={audioRef}
          src={resolvedUrl}
          preload="metadata"
          onTimeUpdate={() => audioRef.current && setCurrentTime(audioRef.current.currentTime)}
          onLoadedMetadata={() => audioRef.current && setDuration(audioRef.current.duration)}
          onEnded={() => {
            setIsPlaying(false);
            setCurrentTime(0);
          }}
        />
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
        <button
          type="button"
          onClick={togglePlay}
          aria-label={isPlaying ? 'Audio pausieren' : 'Audio abspielen'}
          style={{
            width: '34px',
            height: '34px',
            borderRadius: '50%',
            background: isPlaying ? '#16a34a' : '#ffffff',
            color: isPlaying ? '#ffffff' : '#16a34a',
            border: '1.5px solid #bbf7d0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
            boxShadow: '0 1px 3px rgba(22, 163, 74, 0.15)',
            transition: 'all 0.15s ease'
          }}
          className="hover-scale-mini"
        >
          {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" style={{ marginLeft: '2px' }} />}
        </button>

        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {track.label || `Aufnahme #${aIdx + 1}`}
          </span>
          <span style={{ fontSize: '0.70rem', color: '#64748b', fontWeight: 600 }}>
            {formatSecs(currentTime)} / {formatSecs(duration)} {formattedDate ? `· ${formattedDate}` : ''}
          </span>
        </div>
      </div>

      <span style={{
        fontSize: '0.68rem',
        fontWeight: 800,
        color: '#15803d',
        background: '#dcfce7',
        padding: '2px 8px',
        borderRadius: '100px',
        flexShrink: 0
      }}>
        {track.author || 'Lehrkraft'}
      </span>
    </div>
  );
};

// ─── Main Component Props ───────────────────────────────────────────────────
export interface QrAuthoritativeHomeworkSectionProps {
  profile: any;
  progressItems: any[];
  localProgress?: any[];
  lehrwerke?: any[];
  activeSongSkills?: any[];
  assignedCampusSongs?: any[];
  teachers?: any[];
  compressed?: boolean;
  onOpenFullArchive?: () => void;
  isArchiveUnlocked?: boolean;
}

export const QrAuthoritativeHomeworkSection: React.FC<QrAuthoritativeHomeworkSectionProps> = ({
  profile,
  progressItems = [],
  localProgress = [],
  lehrwerke = [],
  activeSongSkills = [],
  assignedCampusSongs = [],
  teachers = [],
  compressed = false,
  onOpenFullArchive,
  isArchiveUnlocked = false
}) => {
  const studentId = profile?.id;
  const studentFirstName = profile?.first_name || 'Schüler';

  const {
    isTtsSpeaking,
    activeTtsKey,
    handleSpeakText,
    handleStopSpeaking,
    buildCompleteWeeklyHomeworkSpeechPhrases
  } = useMeisterwerkTts();

  const [expandedWeek, setExpandedWeek] = useState<string | null>(null);
  const [isShareMenuOpen, setIsShareMenuOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // 1. Calculate current ISO week
  const currentWeekIso = useMemo(() => {
    try {
      return getISOWeek(new Date());
    } catch {
      return '2026-W41';
    }
  }, []);

  const currentKw = useMemo(() => {
    try {
      return currentWeekIso.split('-W')[1] || '';
    } catch {
      return '';
    }
  }, [currentWeekIso]);

  // Previous week ISO string (e.g. 2026-W40)
  const previousWeekIso = useMemo(() => {
    try {
      const parts = currentWeekIso.split('-W');
      let y = parseInt(parts[0], 10);
      let w = parseInt(parts[1], 10) - 1;
      if (w < 1) {
        y -= 1;
        w = 52;
      }
      return `${y}-W${String(w).padStart(2, '0')}`;
    } catch {
      return '';
    }
  }, [currentWeekIso]);

  // Default expand direct previous week
  useEffect(() => {
    if (!expandedWeek && previousWeekIso) {
      setExpandedWeek(previousWeekIso);
    }
  }, [previousWeekIso, expandedWeek]);

  // ─── Current Week Processing (100% Parity with Meisterwerk Wochen-Fahrplan) ───
  const currentWeekData = useMemo(() => {
    const rawItems = progressItems.filter(item => {
      if (studentId && item.student_id && String(item.student_id) !== String(studentId)) return false;
      return true;
    });

    const activeHWs = rawItems.filter(item => {
      if (item.topic_name && item.topic_name.includes(' - Seite ')) {
        const parts = item.topic_name.split(' - Seite ');
        const bookTitle = parts[0].trim();
        const pageNum = parseInt(parts[1], 10);
        const book = lehrwerke.find(g => g.title === bookTitle);
        if (book) {
          const assignment = (localProgress || []).find((a: any) =>
            (String(a.lehrwerkId) === String(book.id) || String(a.lehrwerk_id) === String(book.id)) &&
            (!studentId || String(a.studentId || a.student_id) === String(studentId))
          );
          const pageState = assignment?.pageStates?.[pageNum];
          if (pageState?.status === 'homework' || pageState?.isCurrentHomework || pageState?.is_current_homework) {
            return true;
          }
        }
        return Boolean(item.is_current_homework);
      }
      return Boolean(item.is_current_homework) && !item.topic_name?.startsWith('Hausaufgabe KW ');
    });

    // 1. Group Lehrwerke with pages and notes
    const groupedLehrwerke: Record<string, { pages: number[]; notes: string[]; exercises: string[] }> = {};

    (localProgress || []).forEach((assignment: any) => {
      const assignStdId = String(assignment.studentId || assignment.student_id || '');
      if (studentId && assignStdId && assignStdId !== String(studentId)) return;

      const book = lehrwerke.find(g => String(g.id) === String(assignment.lehrwerkId || assignment.lehrwerk_id));
      if (!book || !assignment.pageStates) return;

      Object.entries(assignment.pageStates).forEach(([pNumStr, pState]: [string, any]) => {
        if (pState?.status === 'homework' || pState?.isCurrentHomework || pState?.is_current_homework) {
          const pageNum = parseInt(pNumStr, 10);
          if (!isNaN(pageNum)) {
            if (!groupedLehrwerke[book.title]) {
              groupedLehrwerke[book.title] = { pages: [], notes: [], exercises: [] };
            }
            if (!groupedLehrwerke[book.title].pages.includes(pageNum)) {
              groupedLehrwerke[book.title].pages.push(pageNum);
            }
            const cleanN = cleanHomeworkNote(pState.homeworkNotes || pState.homework_notes || pState.notes);
            if (cleanN && !isInternalMetadataNote(cleanN) && !groupedLehrwerke[book.title].notes.includes(`S. ${pageNum}: ${cleanN}`)) {
              groupedLehrwerke[book.title].notes.push(`S. ${pageNum}: ${cleanN}`);
            }
            if (Array.isArray(pState.exercises)) {
              pState.exercises.forEach((ex: any) => {
                if (ex.status === 'homework' && ex.label && !groupedLehrwerke[book.title].exercises.includes(ex.label)) {
                  groupedLehrwerke[book.title].exercises.push(ex.label);
                }
              });
            }
          }
        }
      });
    });

    activeHWs.forEach(item => {
      if (item.topic_name && item.topic_name.includes(' - Seite ')) {
        const parts = item.topic_name.split(' - Seite ');
        const bookTitle = parts[0].trim();
        const pageNum = parseInt(parts[1], 10);
        if (!isNaN(pageNum)) {
          if (!groupedLehrwerke[bookTitle]) {
            groupedLehrwerke[bookTitle] = { pages: [], notes: [], exercises: [] };
          }
          if (!groupedLehrwerke[bookTitle].pages.includes(pageNum)) {
            groupedLehrwerke[bookTitle].pages.push(pageNum);
          }
          const cleanN = cleanHomeworkNote(item.homework_notes || item.teacher_notes);
          if (cleanN && !isInternalMetadataNote(cleanN) && !groupedLehrwerke[bookTitle].notes.includes(`S. ${pageNum}: ${cleanN}`)) {
            groupedLehrwerke[bookTitle].notes.push(`S. ${pageNum}: ${cleanN}`);
          }
        }
      }
    });

    // 2. Songs (100% Parity with collectHomeworkSongsFromSources)
    const effectiveAssignedCampusSongs = assignedCampusSongs && assignedCampusSongs.length > 0
      ? assignedCampusSongs
      : (activeSongSkills && activeSongSkills.length > 0
          ? activeSongSkills
          : (typeof window !== 'undefined' && studentId
              ? (() => {
                  try {
                    const raw = localStorage.getItem(`local_assigned_campus_songs_${studentId}`) || localStorage.getItem('local_assigned_campus_songs');
                    return raw ? JSON.parse(raw) : [];
                  } catch {
                    return [];
                  }
                })()
              : []));

    const collected = collectHomeworkSongsFromSources({
      rawItems: activeHWs,
      activeSongSkills,
      assignedCampusSongs: effectiveAssignedCampusSongs,
      studentId: studentId,
      getCleanPageNotes: cleanHomeworkNote
    });

    const songs: Array<{ id: string; cleanTitle: string; artist: string; notes?: string }> = [];
    collected.forEach(item => {
      const songInfo = extractSongArtistAndTitle(item);
      const rawSongTopic = item.topic_name || item.title || item.song_title || 'Song';
      const cleanSongDisplayTitle = rawSongTopic
        .replace(/^campus[- ]song\s*[-–:]\s*/i, '')
        .replace(/^campus[- ]song\s+/i, '')
        .replace(/\s*\([^)]*\)\s*$/, '')
        .replace(/linken park/gi, 'Linkin Park');
      const songTitle = songInfo.displayTitle || formatDisplayTitle(cleanSongDisplayTitle) || songInfo.title;
      const songArtist = (songInfo.displayArtist || formatDisplayTitle(songInfo.artist) || '').replace(/linken park/gi, 'Linkin Park');
      const sNote = cleanHomeworkNote(item.homework_notes || item.teacher_notes || item.notes);

      if (!songs.some(s => s.cleanTitle.toLowerCase() === songTitle.toLowerCase())) {
        songs.push({
          id: String(item.id || item.song_id || item.topic_name || songTitle),
          cleanTitle: songTitle,
          artist: songArtist,
          notes: sNote && !isInternalMetadataNote(sNote) ? sNote : undefined
        });
      }
    });

    // 3. Snapshot & Current Week Notes Unpacking (Strictly scoped to Current Week)
    const curWeekSnapshotItem = rawItems.find(item => {
      if (!item.topic_name?.startsWith('Hausaufgabe KW ')) return false;
      const kwMatch = item.topic_name.match(/Hausaufgabe KW\s*(\d+)/i);
      return kwMatch && parseInt(kwMatch[1], 10) === parseInt(currentKw, 10);
    });

    let currentWeekNotesList: string[] = [];
    if (curWeekSnapshotItem && (curWeekSnapshotItem.homework_notes || curWeekSnapshotItem.teacher_notes)) {
      currentWeekNotesList = parseRawNotesArray(curWeekSnapshotItem.homework_notes || curWeekSnapshotItem.teacher_notes);
    }
    if (currentWeekNotesList.length === 0 && typeof window !== 'undefined' && studentId) {
      try {
        const rawLocal = localStorage.getItem(`campus_homework_notes_${studentId}`);
        if (rawLocal) {
          currentWeekNotesList = parseRawNotesArray(rawLocal);
        }
      } catch {}
    }

    const audioTracks: UnpackedAudioNote[] = [];
    const didacticNotes: string[] = [];

    // Extract from currentWeekNotesList (Audio & Didactic Notes for this week)
    if (currentWeekNotesList.length > 0) {
      const snapAudios = parseAudioEntries(currentWeekNotesList);
      snapAudios.forEach(a => {
        if (!audioTracks.some(existing => existing.url === a.url)) {
          audioTracks.push(a);
        }
      });
      const snapNotes = parseDidacticTextNotes(currentWeekNotesList);
      snapNotes.forEach(sn => {
        if (!didacticNotes.includes(sn) && !isInternalMetadataNote(sn)) {
          didacticNotes.push(sn);
        }
      });
    }

    // Only fallback to items that STRICTLY belong to the current week (never all historical items!)
    if (audioTracks.length === 0) {
      rawItems.forEach(item => {
        const itemWk = getItemWeek(item);
        const isThisWeek = (itemWk && itemWk === currentWeekIso) || Boolean(item.is_current_homework && !item.topic_name?.startsWith('Hausaufgabe KW '));
        if (!isThisWeek) return;

        if (item.recording_url && !audioTracks.some(a => a.url === item.recording_url)) {
          audioTracks.push({
            url: item.recording_url,
            label: item.topic_name ? cleanHomeworkTitle(item.topic_name) : 'Unterrichts-Aufnahme',
            duration: 0,
            author: 'Lehrkraft',
            originalIdx: 0,
            idx: 0
          });
        }
        if (item.homework_notes || item.teacher_notes) {
          const parsed = parseRawNotesArray(item.homework_notes || item.teacher_notes);
          const audios = parseAudioEntries(parsed);
          audios.forEach(a => {
            if (!audioTracks.some(existing => existing.url === a.url)) {
              audioTracks.push(a);
            }
          });
          const dNotes = parseDidacticTextNotes(parsed);
          dNotes.forEach(dn => {
            if (!didacticNotes.includes(dn) && !isInternalMetadataNote(dn)) {
              didacticNotes.push(dn);
            }
          });
        }
      });
    }

    // Unpack current week snapshot if needed (when lehrwerkeList is empty or songs are in snapshot)
    if (curWeekSnapshotItem && (curWeekSnapshotItem.homework_notes || curWeekSnapshotItem.teacher_notes)) {
      const parsedSnap = parseRawNotesArray(curWeekSnapshotItem.homework_notes || curWeekSnapshotItem.teacher_notes);
      if (Object.keys(groupedLehrwerke).length === 0) {
        const snapLw = parsedSnap.find((n: any) => typeof n === 'string' && n.includes('SNAPSHOT_LEHRWERKE:'));
        if (snapLw) {
          const unpackedLw = parseSnapshotLehrwerke(snapLw);
          unpackedLw.forEach(lw => {
            if (!groupedLehrwerke[lw.title]) {
              groupedLehrwerke[lw.title] = { pages: lw.pages, notes: lw.notes, exercises: [] };
            }
          });
        }
      }

      // Songs snapshot unpacking with deduplication (100% Parity with MeisterwerkDocumentTab)
      const snapSongEntry = parsedSnap.find((n: any) => typeof n === 'string' && n.includes('SNAPSHOT_SONGS:'));
      if (snapSongEntry) {
        const parsedSongs = parseSnapshotSongs(snapSongEntry);
        parsedSongs.forEach((song: any) => {
          const songInfo = extractSongArtistAndTitle(song);
          const rawSongTopic = song.topic_name || song.title || song.song_title || 'Song';
          const cleanSongDisplayTitle = rawSongTopic
            .replace(/^campus[- ]song\s*[-–:]\s*/i, '')
            .replace(/^campus[- ]song\s+/i, '')
            .replace(/\s*\([^)]*\)\s*$/, '')
            .replace(/linken park/gi, 'Linkin Park');
          const songTitle = songInfo.displayTitle || formatDisplayTitle(cleanSongDisplayTitle) || songInfo.title;
          const songArtist = (songInfo.displayArtist || formatDisplayTitle(songInfo.artist) || '').replace(/linken park/gi, 'Linkin Park');
          const sNote = cleanHomeworkNote(song.homework_notes || song.teacher_notes || song.notes);

          if (!songs.some(s => s.cleanTitle.toLowerCase() === songTitle.toLowerCase())) {
            songs.push({
              id: String(song.id || song.song_id || song.topic_name || songTitle),
              cleanTitle: songTitle,
              artist: songArtist,
              notes: sNote && !isInternalMetadataNote(sNote) ? sNote : undefined
            });
          }
        });
      }
    }

    // 🌉 SMART VORWOCHEN-FALLBACK & AUDIO/NOTE BRIDGE (100% Parity with MeisterwerkDocumentTab)
    // Pädagogische Kontinuität (Zero-LocalStorage / Mobile Cold Cache):
    // Wenn für die aktuelle Woche noch keine vollständigen Einträge existieren,
    // übernehme nahtlos Lehrwerke, Songs, Audioaufnahmen und didaktische Notizen aus dem jüngsten Vorwochen-Snapshot.
    const hasActiveCurrentHomework = (Object.keys(groupedLehrwerke).length > 0 || songs.length > 0 || audioTracks.length > 0 || didacticNotes.length > 0);
    if (!hasActiveCurrentHomework || audioTracks.length === 0 || didacticNotes.length === 0 || songs.length === 0 || Object.keys(groupedLehrwerke).length === 0) {
      const pastWeekSnapshots = rawItems.filter(item => {
        if (!item.topic_name?.startsWith('Hausaufgabe KW ')) return false;
        const kwMatch = item.topic_name.match(/Hausaufgabe KW\s*(\d+)/i);
        if (kwMatch && currentKw) {
          const itemKw = parseInt(kwMatch[1], 10);
          const curKw = parseInt(currentKw, 10);
          if (!isNaN(itemKw) && !isNaN(curKw)) {
            return itemKw < curKw;
          }
        }
        const itWeekIso = getItemWeek(item);
        return Boolean(itWeekIso && currentWeekIso && itWeekIso < currentWeekIso);
      });

      pastWeekSnapshots.sort((a, b) => {
        const kwA = parseInt((a.topic_name?.match(/Hausaufgabe KW\s*(\d+)/i) || [])[1] || '0', 10);
        const kwB = parseInt((b.topic_name?.match(/Hausaufgabe KW\s*(\d+)/i) || [])[1] || '0', 10);
        if (kwA !== kwB) return kwB - kwA;
        const wA = getItemWeek(a);
        const wB = getItemWeek(b);
        if (wA !== wB) return (wB || '').localeCompare(wA || '');
        const tA = new Date(a.updated_at || a.created_at || 0).getTime();
        const tB = new Date(b.updated_at || b.created_at || 0).getTime();
        return tB - tA;
      });

      for (const pastSnapItem of pastWeekSnapshots) {
        if (Object.keys(groupedLehrwerke).length > 0 && songs.length > 0 && audioTracks.length > 0 && didacticNotes.length > 0) {
          break;
        }
        const snapRaw = pastSnapItem.homework_notes || pastSnapItem.teacher_notes;
        if (!snapRaw) continue;

        const parsedPastNotes = parseRawNotesArray(snapRaw);
        if (parsedPastNotes.length === 0) continue;

        // 1. Lehrwerke der Vorwoche übernehmen (falls aktuell noch keine)
        if (Object.keys(groupedLehrwerke).length === 0) {
          const snapLwEntry = parsedPastNotes.find((n: any) => typeof n === 'string' && n.includes('SNAPSHOT_LEHRWERKE:'));
          if (snapLwEntry) {
            const unpackedLw = parseSnapshotLehrwerke(snapLwEntry);
            unpackedLw.forEach(lw => {
              if (!groupedLehrwerke[lw.title]) {
                groupedLehrwerke[lw.title] = { pages: lw.pages, notes: lw.notes, exercises: [] };
              }
            });
          }
        }

        // 2. Songs der Vorwoche übernehmen (falls aktuell noch keine oder fehlend)
        const snapSongEntry = parsedPastNotes.find((n: any) => typeof n === 'string' && n.includes('SNAPSHOT_SONGS:'));
        if (snapSongEntry) {
          const parsedSongs = parseSnapshotSongs(snapSongEntry);
          parsedSongs.forEach((song: any) => {
            const songInfo = extractSongArtistAndTitle(song);
            const rawSongTopic = song.topic_name || song.title || song.song_title || 'Song';
            const cleanSongDisplayTitle = rawSongTopic
              .replace(/^campus[- ]song\s*[-–:]\s*/i, '')
              .replace(/^campus[- ]song\s+/i, '')
              .replace(/\s*\([^)]*\)\s*$/, '')
              .replace(/linken park/gi, 'Linkin Park');
            const songTitle = songInfo.displayTitle || formatDisplayTitle(cleanSongDisplayTitle) || songInfo.title;
            const songArtist = (songInfo.displayArtist || formatDisplayTitle(songInfo.artist) || '').replace(/linken park/gi, 'Linkin Park');
            const sNote = cleanHomeworkNote(song.homework_notes || song.teacher_notes || song.notes);

            if (!songs.some(s => s.cleanTitle.toLowerCase() === songTitle.toLowerCase())) {
              songs.push({
                id: String(song.id || song.song_id || song.topic_name || songTitle),
                cleanTitle: songTitle,
                artist: songArtist,
                notes: sNote && !isInternalMetadataNote(sNote) ? sNote : undefined
              });
            }
          });
        }

        // 3. Audio-Aufnahmen der Vorwoche übernehmen (falls aktuell noch keine)
        if (audioTracks.length === 0) {
          const pastAudios = parseAudioEntries(parsedPastNotes, true);
          pastAudios.forEach(a => {
            if (!audioTracks.some(existing => existing.url === a.url)) {
              audioTracks.push(a);
            }
          });
        }

        // 4. Didaktische Notizen der Vorwoche übernehmen (falls aktuell noch keine)
        if (didacticNotes.length === 0) {
          const pastDidacticNotes = parseDidacticTextNotes(parsedPastNotes);
          pastDidacticNotes.forEach(dn => {
            if (!didacticNotes.includes(dn) && !isInternalMetadataNote(dn)) {
              didacticNotes.push(dn);
            }
          });
        }
      }
    }

    // 4. Student Question for Current Week (with Vorwochen-Fallback)
    let studentQuestionText: string | null = null;
    if (typeof window !== 'undefined' && studentId) {
      studentQuestionText = localStorage.getItem(`campus_student_question_${studentId}`) || null;
    }
    if (!studentQuestionText) {
      for (const item of rawItems) {
        if (item.homework_notes || item.teacher_notes) {
          const parsedArr = parseRawNotesArray(item.homework_notes || item.teacher_notes);
          const qParsed = parseStudentQuestionFromNotes(parsedArr);
          if (qParsed.hasQuestion && qParsed.text) {
            studentQuestionText = qParsed.text;
            break;
          }
        }
      }
    }

    const booksList = Object.entries(groupedLehrwerke).map(([title, info]) => {
      const sortedPages = [...info.pages].sort((a, b) => a - b);
      const pageRange = formatConsecutivePageRanges(sortedPages);
      const exRange = info.exercises.length > 0 ? formatConsecutiveExerciseRanges(info.exercises) : '';
      const pillLabel = exRange ? `${pageRange} · ${exRange}` : pageRange;
      return {
        title,
        pages: sortedPages,
        pageRange,
        exRange,
        pillLabel,
        notes: info.notes
      };
    });

    return {
      books: booksList,
      songs,
      audioTracks,
      didacticNotes,
      studentQuestion: studentQuestionText,
      hasActiveHomework: booksList.length > 0 || songs.length > 0 || didacticNotes.length > 0 || audioTracks.length > 0
    };
  }, [progressItems, localProgress, lehrwerke, activeSongSkills, assignedCampusSongs, studentId, currentKw, currentWeekIso]);

  // ─── Archive Past Weeks Hydration Engine (100% Parity with Meisterwerk Archive) ──
  const pastWeeksList = useMemo(() => {
    const allPastWeeksSet = new Set<string>();

    (progressItems || []).forEach(item => {
      const itemWk = getItemWeek(item);
      if (itemWk && itemWk < currentWeekIso) {
        allPastWeeksSet.add(itemWk);
      }
    });

    if (previousWeekIso) {
      allPastWeeksSet.add(previousWeekIso);
    }

    return Array.from(allPastWeeksSet).sort().reverse().slice(0, 8);
  }, [progressItems, currentWeekIso, previousWeekIso]);

  // Hydrate an individual archived week
  const getArchivedWeekDetails = useCallback((weekIso: string) => {
    const weekNum = weekIso.split('-W')[1] || '';
    const weekItems = (progressItems || []).filter(item => {
      if (studentId && item.student_id && String(item.student_id) !== String(studentId)) return false;
      return getItemWeek(item) === weekIso || (item.updated_at && getItemWeek(item) === weekIso);
    });

    const groupedLehrwerke: Record<string, { pages: number[]; notes: string[] }> = {};
    const weekSongs: any[] = [];
    const weekAudioTracks: ArchiveAudioTrackItem[] = [];
    const weekNotes: string[] = [];
    let weekQuestion: { timestamp?: string; text: string } | null = null;

    // Check direct weekItems
    weekItems.forEach(item => {
      if (item.recording_url && !weekAudioTracks.some(a => a.url === item.recording_url)) {
        weekAudioTracks.push({
          url: item.recording_url,
          label: item.topic_name ? cleanHomeworkTitle(item.topic_name) : 'Unterrichts-Aufnahme',
          author: 'Lehrkraft'
        });
      }

      if (item.topic_name?.includes(' - Seite ')) {
        const parts = item.topic_name.split(' - Seite ');
        const bookTitle = parts[0].trim();
        const pageNum = parseInt(parts[1], 10);
        if (!isNaN(pageNum)) {
          if (!groupedLehrwerke[bookTitle]) groupedLehrwerke[bookTitle] = { pages: [], notes: [] };
          if (!groupedLehrwerke[bookTitle].pages.includes(pageNum)) groupedLehrwerke[bookTitle].pages.push(pageNum);
          const cleanN = cleanHomeworkNote(item.homework_notes || item.teacher_notes);
          if (cleanN && !isInternalMetadataNote(cleanN) && !groupedLehrwerke[bookTitle].notes.includes(`S. ${pageNum}: ${cleanN}`)) {
            groupedLehrwerke[bookTitle].notes.push(`S. ${pageNum}: ${cleanN}`);
          }
        }
      } else if (!item.topic_name?.startsWith('Hausaufgabe KW ') && (item.is_current_homework || item.status === 'THEORY_DONE')) {
        const rawTitle = item.topic_name || item.title || 'Song';
        const cTitle = cleanHomeworkTitle(rawTitle);
        if (cTitle && !isDummyOrTestSong(item) && !weekSongs.some(s => s.cleanTitle === cTitle)) {
          weekSongs.push({
            cleanTitle: cTitle,
            artist: item.artist || item.songs?.artist || '',
            notes: cleanHomeworkNote(item.homework_notes || item.teacher_notes)
          });
        }
      }

      if (item.homework_notes) {
        const parsed = parseRawNotesArray(item.homework_notes);
        parsed.forEach((line: any) => {
          if (typeof line !== 'string') return;
          if (line.startsWith('STUDENT_QUESTION:') || line.startsWith('❓ Frage für den Unterricht:')) {
            const qP = parseStudentQuestionFromNotes([line]);
            if (qP.hasQuestion && !weekQuestion) {
              weekQuestion = { text: qP.text, timestamp: qP.timestamp || undefined };
            }
          }
        });
      }
    });

    // Check snapshot item (e.g. Hausaufgabe KW 40)
    const snapshotItem = (progressItems || []).find(item => {
      if (!item.topic_name?.startsWith('Hausaufgabe KW ')) return false;
      const kwMatch = item.topic_name.match(/Hausaufgabe KW\s*(\d+)/i);
      return kwMatch && parseInt(kwMatch[1], 10) === parseInt(weekNum, 10);
    });

    if (snapshotItem && snapshotItem.homework_notes) {
      const parsedNotes = parseRawNotesArray(snapshotItem.homework_notes);

      // 1. Lehrwerke
      const snapLw = parsedNotes.find((n: any) => typeof n === 'string' && n.includes('SNAPSHOT_LEHRWERKE:'));
      if (snapLw) {
        const unpackedLw = parseSnapshotLehrwerke(snapLw);
        unpackedLw.forEach(lw => {
          if (!groupedLehrwerke[lw.title]) groupedLehrwerke[lw.title] = { pages: [], notes: [] };
          lw.pages.forEach(p => {
            if (!groupedLehrwerke[lw.title].pages.includes(p)) groupedLehrwerke[lw.title].pages.push(p);
          });
          lw.notes.forEach(n => {
            if (!groupedLehrwerke[lw.title].notes.includes(n)) groupedLehrwerke[lw.title].notes.push(n);
          });
        });
      }

      // 2. Songs
      const snapS = parsedNotes.find((n: any) => typeof n === 'string' && n.includes('SNAPSHOT_SONGS:'));
      if (snapS) {
        const unpackedSongs = parseSnapshotSongs(snapS);
        unpackedSongs.forEach((song: any) => {
          const cTitle = cleanHomeworkTitle(song.topic_name || song.title || 'Song');
          if (cTitle && !isDummyOrTestSong(song) && !weekSongs.some(s => s.cleanTitle === cTitle)) {
            weekSongs.push({
              cleanTitle: cTitle,
              artist: song.artist || song.songs?.artist || '',
              notes: song.homework_notes && !isInternalMetadataNote(song.homework_notes) ? cleanHomeworkNote(song.homework_notes) : undefined
            });
          }
        });
      }

      // 3. Audio tracks
      const snapAudios = parseAudioEntries(parsedNotes);
      snapAudios.forEach(a => {
        if (!weekAudioTracks.some(existing => existing.url === a.url)) {
          weekAudioTracks.push({
            url: a.url,
            label: a.label || 'Unterrichts-Aufnahme',
            duration: a.duration,
            author: a.author === 'student' ? 'Schüler' : 'Lehrkraft',
            date: a.date
          });
        }
      });

      // 4. Didactic notes
      const snapDidactic = parseDidacticTextNotes(parsedNotes);
      snapDidactic.forEach(dn => {
        if (!weekNotes.includes(dn) && !isInternalMetadataNote(dn)) {
          weekNotes.push(dn);
        }
      });

      // 5. Question
      if (!weekQuestion) {
        const qParsed = parseStudentQuestionFromNotes(parsedNotes);
        if (qParsed.hasQuestion && qParsed.text) {
          weekQuestion = { text: qParsed.text, timestamp: qParsed.timestamp || undefined };
        }
      }
    }

    // Sort pages
    Object.keys(groupedLehrwerke).forEach(title => {
      groupedLehrwerke[title].pages.sort((a, b) => a - b);
    });

    const totalTasksCount = Object.keys(groupedLehrwerke).length + weekSongs.length;

    return {
      weekNum,
      dateRange: getWeekDateRange(weekIso),
      groupedLehrwerke,
      songs: weekSongs,
      audioTracks: weekAudioTracks,
      notes: weekNotes,
      studentQuestion: weekQuestion,
      totalTasksCount
    };
  }, [progressItems, studentId]);

  // ─── Share & Export Helpers ───────────────────────────────────────────────
  const getHomeworkShareText = useCallback(() => {
    const sName = studentFirstName;
    const sSchool = profile?.school_name || 'Campus-Groovelab';
    const lines: string[] = [];
    const divider = '────────────────────────────────────────';

    lines.push(`Hallo ${sName},`);
    lines.push('');
    lines.push('hier ist dein Wochenplan mit den aktuellen Übezielen aus unserem Unterricht:');
    lines.push('');
    lines.push(divider);
    lines.push(`ÜBE-ZIELE • KW ${currentKw}`);
    lines.push(divider);
    lines.push('');

    if (currentWeekData.books.length > 0) {
      lines.push('LEHRWERKE');
      currentWeekData.books.forEach(b => {
        lines.push(`• ${b.title} (${b.pillLabel})`);
      });
      lines.push('');
    }

    if (currentWeekData.songs.length > 0) {
      lines.push('SONGS & REPERTOIRE');
      currentWeekData.songs.forEach(s => {
        const artistStr = s.artist ? ` · ${s.artist}` : '';
        lines.push(`• ${s.cleanTitle}${artistStr}`);
      });
      lines.push('');
    }

    if (currentWeekData.didacticNotes.length > 0) {
      lines.push('NOTIZEN & FAHRPLAN');
      currentWeekData.didacticNotes.forEach(n => {
        lines.push(`• ${n}`);
      });
      lines.push('');
    }

    lines.push(divider);
    lines.push('INTERAKTIVE WEB-APP');
    lines.push('Unterrichtsaufnahmen, Song-Bibliothek und Übe-Timer:');
    lines.push(typeof window !== 'undefined' ? window.location.href : '');

    const assignedTeacher = teachers.find(t => t.id === profile?.teacher_id);
    const teacherName = formatTeacherFullName(assignedTeacher || profile?.teacher_name);
    if (teacherName && teacherName !== 'Lehrkraft') {
      lines.push('');
      lines.push('Herzliche Grüße');
      lines.push(teacherName);
      lines.push(sSchool);
    }

    return lines.join('\n');
  }, [studentFirstName, profile, currentKw, currentWeekData, teachers]);

  const handleParentShare = async () => {
    const text = getHomeworkShareText();
    const sName = studentFirstName;
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({
          title: `Hausaufgaben KW ${currentKw} - ${sName}`,
          text: text,
          url: window.location.href
        });
        setIsShareMenuOpen(false);
        return;
      } catch {
        // Fallback to clipboard
      }
    }
    handleCopyText();
  };

  const handleCopyText = () => {
    try {
      const text = getHomeworkShareText();
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text);
      }
      setIsCopied(true);
      setTimeout(() => {
        setIsCopied(false);
        setIsShareMenuOpen(false);
      }, 2000);
    } catch (err) {
      console.warn('Clipboard write failed', err);
    }
  };

  const assignedTeacher = teachers.find(t => t.id === profile?.teacher_id);
  const teacherFullName = formatTeacherFullName(assignedTeacher || profile?.teacher_name);

  // ─── 1. CURRENT WEEK CARD (Wochen-Fahrplan) ─────────────────────────────────
  const currentWeekCard = (
    <div style={{
      borderRadius: '20px',
      background: '#ffffff',
      border: '1px solid rgba(0, 0, 0, 0.06)',
      padding: '16px 18px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      boxShadow: '0 8px 24px -4px rgba(0, 0, 0, 0.06), 0 2px 6px -1px rgba(0, 0, 0, 0.03)',
      width: '100%',
      boxSizing: 'border-box'
    }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '26px',
            height: '26px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 6px rgba(16, 185, 129, 0.25)',
            flexShrink: 0
          }}>
            <Calendar size={14} strokeWidth={2.5} />
          </div>
          <span style={{ fontSize: '0.92rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em' }}>
            Dein Wochen-Fahrplan (KW {currentKw})
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {/* 🔊 Didaktischer Audio-Vorlese-Assistent (30px Pill im Header) */}
          <button
            type="button"
            role="button"
            tabIndex={0}
            onClick={() => {
              if (isTtsSpeaking && activeTtsKey === 'global_homework') {
                handleStopSpeaking();
              } else {
                if (currentWeekData.hasActiveHomework) {
                  const speechPhrases = buildCompleteWeeklyHomeworkSpeechPhrases({
                    studentFirstName: studentFirstName,
                    teacherName: teacherFullName,
                    books: currentWeekData.books.map(b => ({
                      title: b.title,
                      pages: b.pages,
                      notes: b.notes
                    })),
                    songs: currentWeekData.songs.map(s => ({
                      title: s.cleanTitle + (s.artist ? ` von ${s.artist}` : ''),
                      note: s.notes
                    })),
                    audioRecordings: currentWeekData.audioTracks.map(a => ({
                      label: a.label || 'Aufnahme'
                    })),
                    generalNotes: currentWeekData.didacticNotes.join('. ')
                  });
                  handleSpeakText(speechPhrases, 'global_homework');
                } else {
                  const speechPhrases = [
                    'Bühne frei für deine Musik! Für diese Woche sind noch keine Aufgaben eingetragen. Zeit für freies Üben!'
                  ];
                  handleSpeakText(speechPhrases, 'global_homework');
                }
              }
            }}
            style={{
              background: (isTtsSpeaking && activeTtsKey === 'global_homework') ? '#ef4444' : '#f0fdf4',
              border: (isTtsSpeaking && activeTtsKey === 'global_homework') ? '1px solid #dc2626' : '1.5px solid #10b981',
              color: (isTtsSpeaking && activeTtsKey === 'global_homework') ? '#ffffff' : '#15803d',
              borderRadius: '100px',
              height: '30px',
              padding: '0 10px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              fontSize: '0.74rem',
              fontWeight: 800,
              transition: 'all 0.15s ease',
              boxShadow: (isTtsSpeaking && activeTtsKey === 'global_homework') 
                ? '0 0 0 3px rgba(239, 68, 68, 0.25)' 
                : '0 1px 2px rgba(0,0,0,0.02)',
              touchAction: 'manipulation',
              flexShrink: 0
            }}
            className="hover-scale-mini"
            title={isTtsSpeaking && activeTtsKey === 'global_homework' ? "Vorlesen stoppen" : "Hausaufgabe vorlesen lassen"}
            aria-label={isTtsSpeaking && activeTtsKey === 'global_homework' ? "Vorlesen stoppen" : "Hausaufgabe vorlesen lassen"}
          >
            {isTtsSpeaking && activeTtsKey === 'global_homework' ? (
              <>
                <VolumeX size={14} strokeWidth={2.4} />
                <span>Stopp</span>
              </>
            ) : (
              <>
                <Volume2 size={14} color="#15803d" strokeWidth={2.3} />
                <span>Vorlesen</span>
              </>
            )}
          </button>

          {/* 📤 WhatsApp-freier Eltern-Export (AirDrop, Clipboard, PDF) */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setIsShareMenuOpen(prev => !prev)}
              style={{
                background: isShareMenuOpen ? '#ffffff' : '#f1f5f9',
                border: '1px solid #e2e8f0',
                borderRadius: '100px',
                padding: '4px 10px',
                fontSize: '0.74rem',
                fontWeight: 800,
                color: '#334155',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                boxShadow: isShareMenuOpen ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.15s ease'
              }}
              className="hover-scale-mini"
              title="Wochenplan teilen, kopieren oder drucken"
            >
              <Share2 size={12} color="#475569" strokeWidth={2.2} />
              <span>Teilen / Drucken</span>
              <ChevronDown size={11} color="#64748b" style={{ transform: isShareMenuOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }} />
            </button>

            {isShareMenuOpen && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                right: 0,
                zIndex: 9999,
                minWidth: '220px',
                background: '#ffffff',
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 16px 36px -4px rgba(15, 23, 42, 0.16), 0 4px 12px rgba(0,0,0,0.05)',
                padding: '6px',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
                animation: 'fadeIn 0.15s ease'
              }}>
                <button
                  type="button"
                  onClick={handleParentShare}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    width: '100%',
                    padding: '8px 10px',
                    background: 'transparent',
                    border: 'none',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    color: '#0f172a',
                    fontSize: '0.78rem',
                    fontWeight: 750
                  }}
                >
                  <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a', flexShrink: 0 }}>
                    <Share2 size={13} strokeWidth={2.2} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span>Wochenplan weiterleiten</span>
                    <span style={{ fontSize: '0.65rem', fontWeight: 500, color: '#64748b' }}>AirDrop, Familie, Chat</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={handleCopyText}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    width: '100%',
                    padding: '8px 10px',
                    background: isCopied ? '#f0fdf4' : 'transparent',
                    border: 'none',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    color: isCopied ? '#16a34a' : '#0f172a',
                    fontSize: '0.78rem',
                    fontWeight: 750
                  }}
                >
                  <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: isCopied ? '#dcfce7' : '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isCopied ? '#16a34a' : '#64748b', flexShrink: 0 }}>
                    {isCopied ? <Check size={13} strokeWidth={2.5} /> : <Copy size={13} strokeWidth={2.2} />}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span>{isCopied ? 'Kopiert!' : 'Text kopieren'}</span>
                    <span style={{ fontSize: '0.65rem', fontWeight: 500, color: isCopied ? '#16a34a' : '#64748b' }}>Für Notizen & To-Do-Listen</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => { setIsShareMenuOpen(false); window.print(); }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    width: '100%',
                    padding: '8px 10px',
                    background: 'transparent',
                    border: 'none',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    color: '#0f172a',
                    fontSize: '0.78rem',
                    fontWeight: 750
                  }}
                >
                  <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', flexShrink: 0 }}>
                    <Printer size={13} strokeWidth={2.2} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span>Drucken / PDF sichern</span>
                    <span style={{ fontSize: '0.65rem', fontWeight: 500, color: '#64748b' }}>Für Notenständer & Kühlschrank</span>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '2px 0' }}>
        {/* 💬 POSITION 1: Didaktischer GrooveLab-Yellow Student Question Callout (100% Parity) */}
        {!compressed && currentWeekData.studentQuestion && (
          <div style={{
            background: '#fffdf0',
            border: '1.5px solid #fde047',
            borderRadius: '12px',
            padding: '9px 14px',
            boxShadow: '0 2px 8px rgba(250, 204, 21, 0.12)',
            display: 'flex',
            flexDirection: 'column',
            gap: '5px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px', minWidth: 0, flexWrap: 'wrap' }}>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: '#facc15',
                  color: '#0f172a',
                  fontSize: '0.68rem',
                  fontWeight: 850,
                  textTransform: 'uppercase',
                  letterSpacing: '0.03em',
                  padding: '2px 7px',
                  borderRadius: '100px',
                  boxShadow: '0 1px 3px rgba(250, 204, 21, 0.35)',
                  flexShrink: 0
                }}>
                  <HelpCircle size={11} color="#0f172a" strokeWidth={2.5} />
                  <span>Frage</span>
                </span>
                <span title={`Frage an ${teacherFullName || 'Lehrkraft'}`} style={{ fontSize: '0.76rem', fontWeight: 800, color: '#854d0e', whiteSpace: 'nowrap', flexShrink: 0 }}>
                  an {teacherFullName?.replace(/^deine\s+lehrkraft\b/i, 'Lehrkraft') || 'Lehrkraft'}
                </span>
                <span style={{ color: '#ca8a04', opacity: 0.6, fontSize: '0.72rem', fontWeight: 700, flexShrink: 0 }}>·</span>
                <span title="Für deine nächste Stunde vorgemerkt" style={{ fontSize: '0.72rem', fontWeight: 650, color: '#854d0e', display: 'inline-flex', alignItems: 'center', gap: '4px', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <Sparkles size={11} color="#ca8a04" style={{ flexShrink: 0 }} />
                  <span>Für deine nächste Stunde vorgemerkt</span>
                </span>
              </div>
              <button
                type="button"
                role="button"
                tabIndex={0}
                onClick={() => handleSpeakText(currentWeekData.studentQuestion || '', 'student_q')}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSpeakText(currentWeekData.studentQuestion || '', 'student_q'); } }}
                title="Frage vorlesen"
                aria-label="Frage vorlesen"
                style={{
                  border: '1px solid rgba(250, 204, 21, 0.6)',
                  background: '#ffffff',
                  color: '#0f172a',
                  borderRadius: '8px',
                  width: '30px',
                  height: '30px',
                  padding: 0,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s ease',
                  touchAction: 'manipulation',
                  flexShrink: 0
                }}
                className="hover-scale-mini"
              >
                <Volume2 size={13} color="#0f172a" />
              </button>
            </div>
            <div style={{ fontSize: '0.90rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.4, wordBreak: 'break-word', padding: '1px 0' }}>
              {currentWeekData.studentQuestion}
            </div>
          </div>
        )}

        {/* Lehrwerke Books with Consecutive Page Ranges & 3-Step Status Reflection */}
        {currentWeekData.books.map((b, idx) => {
          const bookColor = CANONICAL_LEHRWERK_COLOR;
          const taskId = `book-${b.title}`;
          const bookSpeechText = `Lehrwerk: ${b.title}${b.pillLabel ? `, ${b.pillLabel}` : ''}`;
          const isSpeakingThisBook = isTtsSpeaking && activeTtsKey === `book_head_${b.title}`;

          return (
            <div
              key={`lw-${idx}`}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                paddingBottom: idx < currentWeekData.books.length - 1 || currentWeekData.songs.length > 0 ? '10px' : '0',
                borderBottom: idx < currentWeekData.books.length - 1 || currentWeekData.songs.length > 0 ? '1px solid rgba(0, 0, 0, 0.06)' : 'none'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                    <div style={{
                      width: '28px',
                      height: '32px',
                      background: `linear-gradient(135deg, ${bookColor.from}, ${bookColor.to})`,
                      borderRadius: '7px',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 2px 5px rgba(225, 29, 72, 0.15)',
                      color: bookColor.text
                    }}>
                      <BookOpen size={14} strokeWidth={2.4} color={bookColor.text} />
                    </div>
                    <span style={{
                      fontSize: '0.94rem',
                      fontWeight: 850,
                      color: '#0f172a',
                      wordBreak: 'break-word',
                      lineHeight: 1.25
                    }}>
                      {b.title}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                    {b.pillLabel && (
                      <span style={{
                        fontSize: '0.78rem',
                        fontWeight: 850,
                        color: '#15803d',
                        background: '#dcfce7',
                        border: '1px solid #bbf7d0',
                        padding: '3px 9px',
                        borderRadius: '99px',
                        whiteSpace: 'nowrap',
                        flexShrink: 0
                      }}>
                        {b.pillLabel}
                      </span>
                    )}
                    <MicroScoreSnippetButton
                      studentId={studentId}
                      taskId={taskId}
                      taskTitle={b.pillLabel ? `${b.title} (${b.pillLabel})` : b.title}
                      defaultInstrument={profile?.instrument}
                      isJunior={false}
                      readOnly={true}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                  <StudentHomeworkStatusButton
                    studentId={studentId}
                    taskId={taskId}
                    label={b.title}
                    variant="standard"
                  />
                  <button
                    type="button"
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isSpeakingThisBook) {
                        handleStopSpeaking();
                      } else {
                        handleSpeakText(bookSpeechText, `book_head_${b.title}`);
                      }
                    }}
                    title={isSpeakingThisBook ? "Vorlesen stoppen" : `Lehrwerk ${b.title} vorlesen`}
                    aria-label={isSpeakingThisBook ? "Vorlesen stoppen" : `Lehrwerk ${b.title} vorlesen`}
                    style={{
                      border: isSpeakingThisBook ? '1px solid #10b981' : '1px solid #cbd5e1',
                      background: isSpeakingThisBook ? '#dcfce7' : '#ffffff',
                      color: isSpeakingThisBook ? '#15803d' : '#64748b',
                      borderRadius: '8px',
                      width: '30px',
                      height: '30px',
                      padding: 0,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.15s ease',
                      touchAction: 'manipulation',
                      flexShrink: 0
                    }}
                    className="hover-scale-mini"
                  >
                    {isSpeakingThisBook ? <VolumeX size={13} strokeWidth={2.4} /> : <Volume2 size={13} strokeWidth={2.2} />}
                  </button>
                </div>
              </div>

              {/* Specific Page Notes */}
              {!compressed && b.notes.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginLeft: '38px', marginTop: '2px' }}>
                  {b.notes.map((noteStr, nIdx) => {
                    const match = noteStr.match(/^S\.\s*(\d+)\s*:\s*(.*)$/);
                    const pageNum = match ? match[1] : null;
                    const noteBody = match ? match[2] : noteStr;
                    const isSpeakingNote = isTtsSpeaking && activeTtsKey === `book_note_${b.title}_${nIdx}`;

                    return (
                      <div
                        key={nIdx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '8px',
                          fontSize: '0.82rem',
                          lineHeight: 1.5,
                          padding: '2px 0'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', minWidth: 0 }}>
                          {pageNum ? (
                            <span style={{ fontWeight: 850, color: '#e11d48', flexShrink: 0 }}>S. {pageNum}:</span>
                          ) : (
                            <span style={{ fontWeight: 850, color: '#e11d48', flexShrink: 0 }}>•</span>
                          )}
                          <span style={{ color: '#0f172a', fontWeight: 550, wordBreak: 'break-word', lineHeight: 1.4 }}>
                            {noteBody}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isSpeakingNote) {
                              handleStopSpeaking();
                            } else {
                              handleSpeakText(noteStr, `book_note_${b.title}_${nIdx}`);
                            }
                          }}
                          style={{
                            border: 'none',
                            background: isSpeakingNote ? '#bbf7d0' : 'none',
                            color: isSpeakingNote ? '#15803d' : '#94a3b8',
                            cursor: 'pointer',
                            padding: '2px 4px',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            transition: 'transform 0.15s ease'
                          }}
                          className="hover-scale-mini"
                          title="Notiz vorlesen"
                        >
                          <Volume2 size={12} strokeWidth={2.4} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* Songs List with 3-Step Status Reflection */}
        {currentWeekData.songs.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {currentWeekData.songs.map((item, idx) => {
              const songColor = getSongColor(item.cleanTitle);
              const taskId = `song-${item.id || item.cleanTitle}`;
              const songSpeechText = `Song: ${item.cleanTitle}${item.artist ? ` von ${item.artist}` : ''}${item.notes ? `. Fahrplan: ${item.notes}` : ''}`;
              const isSpeakingSongHead = isTtsSpeaking && activeTtsKey === `song_head_${idx}`;
              const isSpeakingSongNote = isTtsSpeaking && activeTtsKey === `song_note_${idx}`;

              return (
                <div
                  key={`song-${idx}`}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    paddingBottom: idx < currentWeekData.songs.length - 1 ? '10px' : '0',
                    borderBottom: idx < currentWeekData.songs.length - 1 ? '1px solid rgba(0, 0, 0, 0.06)' : 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1, flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                        <div style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '8px',
                          background: `linear-gradient(135deg, ${songColor.from}, ${songColor.to})`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: songColor.text || '#0f172a',
                          boxShadow: `0 2px 6px ${songColor.shadowFrom || 'rgba(0,0,0,0.06)'}`,
                          flexShrink: 0
                        }}>
                          <Music size={14} strokeWidth={2.4} />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flexWrap: 'wrap' }}>
                          <span style={{
                            fontSize: '0.94rem',
                            fontWeight: 850,
                            color: '#0f172a',
                            wordBreak: 'break-word',
                            lineHeight: 1.25
                          }}>
                            {item.cleanTitle}
                          </span>
                          {item.artist && (
                            <span style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: 650, wordBreak: 'break-word' }}>
                              · {item.artist}
                            </span>
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                        <MicroScoreSnippetButton
                          studentId={studentId}
                          taskId={taskId}
                          taskTitle={item.cleanTitle}
                          defaultInstrument={profile?.instrument}
                          isJunior={false}
                          readOnly={true}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                      <StudentHomeworkStatusButton
                        studentId={studentId}
                        taskId={taskId}
                        label={item.cleanTitle}
                        variant="standard"
                      />
                      <button
                        type="button"
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isSpeakingSongHead) {
                            handleStopSpeaking();
                          } else {
                            handleSpeakText(songSpeechText, `song_head_${idx}`);
                          }
                        }}
                        title={isSpeakingSongHead ? "Vorlesen stoppen" : `Song ${item.cleanTitle} vorlesen`}
                        aria-label={isSpeakingSongHead ? "Vorlesen stoppen" : `Song ${item.cleanTitle} vorlesen`}
                        style={{
                          border: isSpeakingSongHead ? '1px solid #10b981' : '1px solid #cbd5e1',
                          background: isSpeakingSongHead ? '#dcfce7' : '#ffffff',
                          color: isSpeakingSongHead ? '#15803d' : '#64748b',
                          borderRadius: '8px',
                          width: '30px',
                          height: '30px',
                          padding: 0,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.15s ease',
                          touchAction: 'manipulation',
                          flexShrink: 0
                        }}
                        className="hover-scale-mini"
                      >
                        {isSpeakingSongHead ? <VolumeX size={13} strokeWidth={2.4} /> : <Volume2 size={13} strokeWidth={2.2} />}
                      </button>
                    </div>
                  </div>

                  {/* Specific Song Practice Note */}
                  {!compressed && item.notes && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px',
                      fontSize: '0.82rem',
                      lineHeight: 1.5,
                      padding: '2px 0',
                      marginLeft: '38px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', minWidth: 0 }}>
                        <span style={{ fontWeight: 850, color: '#4f46e5', flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Pin size={11} strokeWidth={2.4} />
                          <span>Fahrplan:</span>
                        </span>
                        <span style={{ fontWeight: 600, color: '#334155', wordBreak: 'break-word', lineHeight: 1.4 }}>
                          {item.notes}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isSpeakingSongNote) {
                            handleStopSpeaking();
                          } else {
                            handleSpeakText(`Fahrplan für ${item.cleanTitle}: ${item.notes}`, `song_note_${idx}`);
                          }
                        }}
                        style={{
                          border: 'none',
                          background: isSpeakingSongNote ? '#c7d2fe' : 'none',
                          color: isSpeakingSongNote ? '#4338ca' : '#94a3b8',
                          cursor: 'pointer',
                          padding: '2px 4px',
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          flexShrink: 0,
                          transition: 'transform 0.15s ease'
                        }}
                        className="hover-scale-mini"
                        title="Fahrplan vorlesen"
                      >
                        <Volume2 size={12} strokeWidth={2.4} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Audio Recordings Carousel (Week-Scoped) */}
        {!compressed && currentWeekData.audioTracks.length > 0 && (
          <div style={{ paddingTop: '2px', width: '100%', boxSizing: 'border-box' }}>
            <AudioTrackCarousel
              tracks={currentWeekData.audioTracks}
              readOnly={true}
              hideCarriedOverBadge={true}
              uiLevel={profile?.campus_ui_level || 'pro'}
            />
          </div>
        )}

        {/* Didactic Teacher Notes List */}
        {!compressed && currentWeekData.didacticNotes.length > 0 && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            borderTop: (currentWeekData.books.length > 0 || currentWeekData.songs.length > 0 || currentWeekData.audioTracks.length > 0) ? '1px dashed #e2e8f0' : 'none',
            paddingTop: (currentWeekData.books.length > 0 || currentWeekData.songs.length > 0 || currentWeekData.audioTracks.length > 0) ? '8px' : 0
          }}>
            {currentWeekData.didacticNotes.map((note, idx) => {
              const isSpeakingNote = isTtsSpeaking && activeTtsKey === `didactic_note_${idx}`;
              return (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    padding: '8px 12px',
                    borderRadius: '12px',
                    background: isSpeakingNote ? '#dcfce7' : '#ffffff',
                    border: isSpeakingNote ? '1px solid #10b981' : '1px solid #f1f5f9',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                    fontSize: '0.84rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                    <FileText size={15} style={{ color: '#16a34a', flexShrink: 0 }} />
                    <span style={{ color: '#1e293b', fontWeight: 650, wordBreak: 'break-word', lineHeight: 1.4 }}>
                      {(note.charAt(0).toUpperCase() + note.slice(1)).replace(/\bbemerkung\b/gi, 'Bemerkung')}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isSpeakingNote) {
                        handleStopSpeaking();
                      } else {
                        handleSpeakText(note, `didactic_note_${idx}`);
                      }
                    }}
                    style={{
                      border: 'none',
                      background: isSpeakingNote ? '#bbf7d0' : 'none',
                      color: isSpeakingNote ? '#15803d' : '#94a3b8',
                      cursor: 'pointer',
                      padding: '2px 4px',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      transition: 'transform 0.15s ease',
                      flexShrink: 0
                    }}
                    className="hover-scale-mini"
                    title="Hinweis vorlesen"
                  >
                    <Volume2 size={12} strokeWidth={2.4} />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Empty State */}
        {!currentWeekData.hasActiveHomework && (
          <div style={{
            padding: '16px 12px',
            background: '#ffffff',
            borderRadius: '14px',
            border: '1.5px dashed #cbd5e1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            textAlign: 'center',
            boxSizing: 'border-box'
          }}>
            <span style={{ fontSize: '1.1rem' }}>📖</span>
            <span style={{ fontSize: '0.80rem', color: '#64748b', fontWeight: 650 }}>
              Noch keine Aufgaben für KW {currentKw} erfasst. Zeit für freies Üben! 🎶
            </span>
          </div>
        )}
      </div>
    </div>
  );

  if (compressed) {
    return currentWeekCard;
  }

  // ─── 2. VERLAUF & ARCHIV SECTION (100% Deckungsgleich mit Aufgabenheft-Archiv) ───
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%' }}>
      {currentWeekCard}

      {pastWeeksList.length > 0 && (
        <div style={{
          borderRadius: '20px',
          background: '#ffffff',
          border: '1px solid rgba(0, 0, 0, 0.06)',
          padding: '16px 18px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          boxShadow: '0 8px 24px -4px rgba(0, 0, 0, 0.04), 0 2px 6px -1px rgba(0, 0, 0, 0.02)',
          width: '100%',
          boxSizing: 'border-box'
        }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '26px',
                height: '26px',
                borderRadius: '8px',
                background: '#64748b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 6px rgba(100, 116, 139, 0.25)',
                color: '#ffffff',
                flexShrink: 0
              }}>
                <BookOpen size={14} color="#ffffff" strokeWidth={2.4} />
              </div>
              <span style={{ fontSize: '0.86rem', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Verlauf &amp; Archiv
              </span>
            </div>
            <span style={{
              fontSize: '0.66rem',
              fontWeight: 800,
              color: '#64748b',
              background: '#f1f5f9',
              border: '1px solid #e2e8f0',
              padding: '2px 8px',
              borderRadius: '100px'
            }}>
              Schuljahr
            </span>
          </div>

          {/* List of Past Weeks */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {pastWeeksList.map(pw => {
              const details = getArchivedWeekDetails(pw);
              const pwNum = details.weekNum;
              const isDirectPrevWeek = pw === previousWeekIso;
              const isAccessible = isDirectPrevWeek || isArchiveUnlocked;
              const isExpanded = expandedWeek === pw;

              if (isAccessible) {
                return (
                  <div
                    key={pw}
                    style={{
                      background: '#f8fafc',
                      border: isExpanded ? '1.5px solid #10b981' : '1px solid #e2e8f0',
                      borderRadius: '14px',
                      padding: '12px 14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {/* Header Row */}
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => setExpandedWeek(isExpanded ? null : pw)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setExpandedWeek(isExpanded ? null : pw);
                        }
                      }}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        cursor: 'pointer',
                        userSelect: 'none',
                        touchAction: 'manipulation'
                      }}
                      aria-expanded={isExpanded}
                      aria-label={`Woche KW ${pwNum} aufklappen`}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.86rem', fontWeight: 850, color: '#1e293b' }}>
                          KW {pwNum} {isDirectPrevWeek ? '(Letzte Woche)' : ''}
                        </span>
                        {details.dateRange && (
                          <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
                            · {details.dateRange}
                          </span>
                        )}
                        <span style={{
                          fontSize: '0.68rem',
                          fontWeight: 800,
                          color: '#15803d',
                          background: '#dcfce7',
                          padding: '1px 8px',
                          borderRadius: '6px'
                        }}>
                          {details.totalTasksCount > 0 ? `${details.totalTasksCount} Aufgaben` : 'Dokumentiert'}
                        </span>
                        {details.studentQuestion && (
                          <span style={{
                            fontSize: '0.64rem',
                            fontWeight: 800,
                            color: '#713f12',
                            background: '#fef08a',
                            border: '1px solid #fde047',
                            padding: '1px 6px',
                            borderRadius: '6px'
                          }}>
                            ❓ Frage
                          </span>
                        )}
                        {details.audioTracks.length > 0 && (
                          <span style={{
                            fontSize: '0.64rem',
                            fontWeight: 800,
                            color: '#15803d',
                            background: '#e6f4ea',
                            padding: '1px 6px',
                            borderRadius: '6px'
                          }}>
                            🎙️ {details.audioTracks.length} Audio
                          </span>
                        )}
                      </div>
                      <ChevronDown
                        size={16}
                        color="#64748b"
                        style={{
                          transform: isExpanded ? 'rotate(180deg)' : 'none',
                          transition: 'transform 0.2s ease',
                          flexShrink: 0
                        }}
                      />
                    </div>

                    {/* Expanded Detail Box: 100% Deckungsgleich mit dem Aufgabenheft Archiv! */}
                    {isExpanded && (
                      <div style={{
                        borderTop: '1px solid #e2e8f0',
                        paddingTop: '10px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        animation: 'fadeIn 0.2s ease'
                      }}>
                        {/* 1. Hausaufgaben KW {pwNum} Container */}
                        <div style={{
                          background: '#fffbeb',
                          border: '1px solid #fef08a',
                          borderRadius: '12px',
                          padding: '12px 14px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px'
                        }}>
                          <span style={{ fontSize: '0.80rem', fontWeight: 850, color: '#18181b', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                            Aufgaben KW {pwNum}
                          </span>

                          {details.totalTasksCount === 0 ? (
                            <span style={{ fontSize: '0.78rem', color: '#71717a', fontStyle: 'italic' }}>
                              Keine gesonderten Einträge aus dieser Woche archiviert.
                            </span>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              {/* Lehrwerke */}
                              {Object.entries(details.groupedLehrwerke).map(([title, info]) => (
                                <div key={title} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.86rem', fontWeight: 850, color: '#09090b' }}>
                                    <BookOpen size={13} color="#e11d48" />
                                    <span>{title}</span>
                                    {info.pages.length > 0 && (
                                      <span style={{ color: '#15803d', fontWeight: 800, background: '#dcfce7', padding: '1px 7px', borderRadius: '6px', fontSize: '0.74rem' }}>
                                        S. {info.pages.join(', ')}
                                      </span>
                                    )}
                                  </div>
                                  {info.notes.map((n, nIdx) => (
                                    <div key={nIdx} style={{ fontSize: '0.76rem', color: '#475569', marginLeft: '19px' }}>
                                      {n}
                                    </div>
                                  ))}
                                </div>
                              ))}

                              {/* Songs */}
                              {details.songs.length > 0 && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', borderTop: Object.keys(details.groupedLehrwerke).length > 0 ? '1px solid rgba(251, 191, 36, 0.3)' : 'none', paddingTop: Object.keys(details.groupedLehrwerke).length > 0 ? '6px' : 0 }}>
                                  {details.songs.map((s, sIdx) => (
                                    <div
                                      key={sIdx}
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '5px',
                                        background: '#ffffff',
                                        color: '#334155',
                                        padding: '4px 9px',
                                        borderRadius: '99px',
                                        fontSize: '0.76rem',
                                        fontWeight: 800,
                                        border: '1px solid #fde047'
                                      }}
                                    >
                                      <Music size={11} color="#ca8a04" />
                                      <span>{s.cleanTitle}</span>
                                      {s.artist && <span style={{ color: '#64748b' }}>· {s.artist}</span>}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* 2. Hausaufgaben-Bemerkungen */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#334155', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <FileText size={13} color="#16a34a" />
                            <span>Aufgaben-Bemerkungen</span>
                          </span>
                          <div style={{
                            padding: '10px 12px',
                            background: '#ffffff',
                            borderRadius: '10px',
                            border: '1px solid #e2e8f0',
                            fontSize: '0.80rem',
                            color: '#1e293b',
                            lineHeight: 1.45,
                            whiteSpace: 'pre-wrap'
                          }}>
                            {details.notes.length > 0 ? details.notes.join('\n\n') : 'Keine Bemerkungen hinterlegt.'}
                          </div>
                        </div>

                        {/* 3. Audio-Aufnahmen & Memos */}
                        {details.audioTracks.length > 0 && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#15803d', display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <Headphones size={13} color="#16a34a" />
                              <span>Aufnahmen & Audio-Memos ({details.audioTracks.length})</span>
                            </span>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              {details.audioTracks.map((tr, aIdx) => (
                                <ArchiveAudioPlayerRow key={aIdx} track={tr} aIdx={aIdx} />
                              ))}
                            </div>
                          </div>
                        )}

                        {/* 4. Schülerfrage aus dieser Woche */}
                        {details.studentQuestion && (
                          <div style={{
                            padding: '10px 12px',
                            background: '#fffdf0',
                            borderRadius: '12px',
                            border: '1px solid #fde047',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                              <span style={{
                                background: '#facc15',
                                color: '#0f172a',
                                fontSize: '0.64rem',
                                fontWeight: 850,
                                padding: '1px 6px',
                                borderRadius: '100px'
                              }}>
                                ❓ Frage
                              </span>
                              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#713f12' }}>
                                Im Unterricht besprochen ✓ {details.studentQuestion.timestamp ? `· ${new Date(details.studentQuestion.timestamp).toLocaleDateString('de-DE')}` : ''}
                              </span>
                            </div>
                            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#713f12', lineHeight: 1.4 }}>
                              „{details.studentQuestion.text}“
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              }

              // Locked Past Weeks Row (Gast / Unsubscribed Preview)
              return (
                <div
                  key={pw}
                  role="button"
                  tabIndex={0}
                  onClick={onOpenFullArchive}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onOpenFullArchive?.();
                    }
                  }}
                  style={{
                    background: '#f8fafc',
                    border: '1px dashed #cbd5e1',
                    borderRadius: '12px',
                    padding: '8px 14px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                    userSelect: 'none',
                    touchAction: 'manipulation',
                    transition: 'all 0.15s ease'
                  }}
                  className="hover-scale-mini"
                  title="Schuljahres-Archiv im Campus-Vollzugang öffnen"
                  aria-label={`KW ${pwNum} archiviert - Freischalten`}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Lock size={12} color="#64748b" />
                    <span style={{ fontSize: '0.80rem', fontWeight: 750, color: '#64748b' }}>
                      KW {pwNum} · Archiviert {details.dateRange ? `(${details.dateRange})` : ''}
                    </span>
                  </div>
                  <span style={{
                    fontSize: '0.70rem',
                    fontWeight: 800,
                    color: '#15803d',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <span>Freischalten</span>
                    <ChevronRight size={12} color="#15803d" />
                  </span>
                </div>
              );
            })}
          </div>

          {/* Teaser Button für Eltern (Volles Schuljahres-Archiv) */}
          {!isArchiveUnlocked && onOpenFullArchive && (
            <button
              type="button"
              onClick={onOpenFullArchive}
              style={{
                marginTop: '4px',
                width: '100%',
                padding: '10px 14px',
                borderRadius: '12px',
                border: 'none',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#ffffff',
                fontSize: '0.80rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
                minHeight: '44px',
                boxShadow: '0 2px 6px rgba(16, 185, 129, 0.25)'
              }}
              className="hover-scale-mini"
            >
              <Sparkles size={14} color="#ffffff" />
              <span>Schuljahres-Archiv &amp; Audio-Biografie freischalten</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
