import { useState, useRef, useMemo, useEffect } from 'react';
import { supabase } from '../../../../lib/supabase';
import { Student } from '../../meisterwerk.types';
import {
  isInternalMetadataNote,
  ALL_STICKERS
} from '../../../../domain/stickersAndTresor';
import {
  getSimulatedNow,
  getWeekDateRange
} from '../../studentDateUtils';
import {
  extractSongArtistAndTitle,
  areSongsIdentical
} from '../MeisterwerkDocumentTab';

export const isSongMatch = (a: any, b: any) => areSongsIdentical(a, b);
export const getCanonicalSongKey = (s: any) => extractSongArtistAndTitle(s).canonical;
export const getNormalizedSongTitle = (s: any) => {
  const info = extractSongArtistAndTitle(s);
  return (info.artist && info.title) ? `${info.artist} - ${info.title}` : info.canonical;
};
import { harmonizeAudioList } from '../../../../utils/audioNamingHelper';

export interface UseMeisterwerkHomeworkParams {
  student: Student;
  readOnly: boolean;
  activeItem: any;
  topicName: string;
  setTopicName: (val: string) => void;
  status: string;
  setStatus: (status: any) => void;
  isCurrentHomework: boolean;
  setIsCurrentHomework: (val: boolean) => void;
  activeInputTab: string;
  setActiveInputTab: (tab: any) => void;
  activeSubView: string;
  setActiveSubView: (view: any) => void;
  activeLehrwerkId: string | null;
  activePageNumber: number | null;
  selectedActiveSongId: string | null;
  songProgressPercent?: number;
  assignedLehrwerke: any[];
  setAssignedLehrwerke: (arr: any[]) => void;
  globalLehrwerke: any[];
  progressItems: any[];
  setProgressItems: React.Dispatch<React.SetStateAction<any[]>>;
  activeSongSkills: any[];
  setActiveSongSkills: React.Dispatch<React.SetStateAction<any[]>>;
  fetchProgress: () => Promise<void>;
  loadLehrwerke: () => Promise<void>;
  loadActiveSongSkills: () => Promise<void>;
  notifyHomeworkChange: () => void;
  getCurrentTeacherId: () => Promise<string | null>;
  effectiveGroupStudents: any[];
  setShowMatchConfetti: (val: boolean) => void;
  setStudentNotesSavedToast: (val: boolean) => void;
  getLehrwerkColor: (title: string) => any;
  getItemWeek: (item: any) => string;
}

export const useMeisterwerkHomework = (params: UseMeisterwerkHomeworkParams) => {
  const {
    student,
    readOnly,
    activeItem,
    topicName,
    setTopicName,
    status,
    setStatus,
    isCurrentHomework,
    setIsCurrentHomework,
    activeInputTab,
    setActiveInputTab,
    activeSubView,
    setActiveSubView,
    activeLehrwerkId,
    activePageNumber,
    selectedActiveSongId,
    songProgressPercent,
    assignedLehrwerke,
    setAssignedLehrwerke,
    globalLehrwerke,
    progressItems,
    setProgressItems,
    activeSongSkills,
    setActiveSongSkills,
    fetchProgress,
    loadLehrwerke,
    loadActiveSongSkills,
    notifyHomeworkChange,
    getCurrentTeacherId,
    effectiveGroupStudents,
    setShowMatchConfetti,
    setStudentNotesSavedToast,
    getLehrwerkColor,
    getItemWeek
  } = params;

  // Calendar week navigation state
  const [viewingWeekOffset, setViewingWeekOffset] = useState<number>(0);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState<boolean>(false);

  // Homework notes state
  const [generalHomeworkNotes, setGeneralHomeworkNotes] = useState<string>('');
  const [teacherNotes, setTeacherNotes] = useState<string>('');
  const [homeworkNotesList, setHomeworkNotesList] = useState<string[]>([]);
  const [pageHomeworkNotes, setPageHomeworkNotes] = useState<string>('');
  const [songHomeworkNotes, setSongHomeworkNotes] = useState<string>('');
  const [studentNotes, setStudentNotes] = useState<string>('');
  const [isStudentNotePrivate, setIsStudentNotePrivate] = useState<boolean>(false);
  const [activeNoteTarget, setActiveNoteTarget] = useState<'student' | 'teacher'>('student');

  const latestGeneralHomeworkNotesRef = useRef<string>(generalHomeworkNotes);
  const latestTeacherNotesRef = useRef<string>(teacherNotes);
  useEffect(() => {
    latestGeneralHomeworkNotesRef.current = generalHomeworkNotes;
  }, [generalHomeworkNotes]);
  useEffect(() => {
    latestTeacherNotesRef.current = teacherNotes;
  }, [teacherNotes]);

  // Autosave and change tracking state
  const [hasChanges, setHasChanges] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const autoSaveDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const songSaveDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const teacherNoteDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // ISO Week helpers
  const getISOWeek = (date?: Date | string): string => {
    const d = date ? new Date(date) : getSimulatedNow();
    if (isNaN(d.getTime())) return '';
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
    const week1 = new Date(d.getFullYear(), 0, 4);
    const weekNum = 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
    return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
  };

  const getTargetWeekIso = (offset: number): string => {
    const d = getSimulatedNow();
    d.setDate(d.getDate() + offset * 7);
    return getISOWeek(d);
  };

  // Direct song save
  const triggerDirectSongSave = async (
    skillId: string,
    targetStatus: 'IN_PROGRESS' | 'THEORY_DONE' | 'MASTERED',
    targetHomework: boolean,
    songNoteOverride?: string,
    teacherNoteOverride?: string
  ) => {
    try {
      const skill = activeSongSkills.find(s => s.id === skillId || s.song_id === skillId || s.songs?.id === skillId);
      const skillPercent = songProgressPercent !== undefined ? songProgressPercent : (skill?.progress_percent || 0);

      const songArtist = skill?.songs?.artist || skill?.artist || '';
      const songTitle = skill?.songs?.title || skill?.title || skill?.song_title || topicName.replace(/\s*\([^)]*\)\s*$/, '').trim() || 'Song';
      const songInstrument = skill?.instrument ? ` (${skill.instrument})` : '';
      const fullTitle = songArtist ? `${songArtist} - ${songTitle}${songInstrument}` : `${songTitle}${songInstrument}`;

      const noteToSave = songNoteOverride !== undefined
        ? songNoteOverride
        : (songHomeworkNotes !== undefined ? songHomeworkNotes : '');

      const teacherNoteToSave = teacherNoteOverride !== undefined
        ? teacherNoteOverride
        : (teacherNotes !== undefined ? teacherNotes : '');

      try {
        if (skillId) {
          localStorage.setItem(`song_hw_${student.id}_${skillId}`, targetHomework ? 'true' : 'false');
          localStorage.setItem(`song_note_${student.id}_${skillId}`, noteToSave);
          localStorage.setItem(`song_teacher_note_${student.id}_${skillId}`, teacherNoteToSave);
        }
        if (skill?.id) {
          localStorage.setItem(`song_hw_${student.id}_${skill.id}`, targetHomework ? 'true' : 'false');
          localStorage.setItem(`song_note_${student.id}_${skill.id}`, noteToSave);
          localStorage.setItem(`song_teacher_note_${student.id}_${skill.id}`, teacherNoteToSave);
        }
        if (skill?.song_id) {
          localStorage.setItem(`song_hw_${student.id}_${skill.song_id}`, targetHomework ? 'true' : 'false');
          localStorage.setItem(`song_note_${student.id}_${skill.song_id}`, noteToSave);
          localStorage.setItem(`song_teacher_note_${student.id}_${skill.song_id}`, teacherNoteToSave);
        }
      } catch (e) {}

      if (skillId && !String(skillId).startsWith('temp-')) {
        await supabase
          .from('user_song_skills')
          .update({
            is_stage_ready: targetStatus === 'MASTERED',
            progress_percent: skillPercent,
            is_current_homework: targetHomework,
            homework_notes: noteToSave,
            teacher_notes: teacherNoteToSave,
            status: targetStatus
          })
          .eq('id', skillId);
      }

      setTopicName(fullTitle);
      setStatus(targetStatus);
      setIsCurrentHomework(targetHomework);

      const activeTId = await getCurrentTeacherId();
      const matchingExistingItems = progressItems.filter(item => isSongMatch(item, skill || { topic_name: fullTitle }));
      const existingItem = matchingExistingItems[0];

      const row = {
        student_id: student.id,
        teacher_id: activeTId,
        topic_name: fullTitle,
        status: targetStatus,
        is_current_homework: targetHomework,
        teacher_notes: teacherNoteToSave,
        homework_notes: noteToSave,
        updated_at: new Date().toISOString()
      };

      const validMatchingIds = matchingExistingItems
        .map(i => i.id)
        .filter(id => id && !String(id).startsWith('temp-'));

      let savedItem: any = null;
      if (validMatchingIds.length > 0) {
        const { data, error } = await supabase
          .from('progress_matrix')
          .update(row)
          .in('id', validMatchingIds)
          .select();
        if (!error && data && data.length > 0) {
          savedItem = data[0];
        }
      } else {
        const { data, error } = await supabase
          .from('progress_matrix')
          .insert(row)
          .select()
          .single();
        if (!error && data) {
          savedItem = data;
        }
      }

      const currentWeek = getISOWeek();
      const currentWeekNum = currentWeek.split('-W')[1];
      const weeklySnapshotItem = progressItems.find(item => 
        item.topic_name.startsWith('Hausaufgabe KW ') && 
        (getItemWeek(item) === currentWeek || item.topic_name === `Hausaufgabe KW ${currentWeekNum}` || item.topic_name === `Hausaufgabe KW ${parseInt(currentWeekNum, 10)}`)
      );

      const targetSongObj = {
        id: skillId || existingItem?.id || ('song-' + Date.now()),
        song_id: skill?.song_id || skill?.songs?.id || skillId,
        topic_name: fullTitle,
        title: songTitle,
        artist: songArtist,
        instrument: skill?.instrument || '',
        is_current_homework: targetHomework,
        status: targetStatus,
        homework_notes: noteToSave,
        teacher_notes: teacherNoteToSave
      };

      let currentSnapSongs: any[] = [];
      let existingNotesArr: string[] = [];
      if (weeklySnapshotItem && weeklySnapshotItem.homework_notes) {
        try {
          const rawNotes = weeklySnapshotItem.homework_notes;
          existingNotesArr = typeof rawNotes === 'string' ? JSON.parse(rawNotes) : rawNotes;
          if (!Array.isArray(existingNotesArr)) existingNotesArr = [String(rawNotes)];
          const snapEntry = existingNotesArr.find(n => typeof n === 'string' && n.startsWith('SNAPSHOT_SONGS:'));
          if (snapEntry) {
            currentSnapSongs = JSON.parse(snapEntry.substring('SNAPSHOT_SONGS:'.length));
          }
        } catch {}
      }

      let updatedSnapSongs = (Array.isArray(currentSnapSongs) ? currentSnapSongs : []).filter(
        s => !isSongMatch(s, skill || { topic_name: fullTitle })
      );
      if (targetHomework) {
        updatedSnapSongs.push(targetSongObj);
      }

      const cleanedWeeklyNotes = existingNotesArr.filter(
        n => typeof n === 'string' && !n.startsWith('SNAPSHOT_SONGS:')
      );
      if (updatedSnapSongs.length > 0) {
        cleanedWeeklyNotes.push(`SNAPSHOT_SONGS:${JSON.stringify(updatedSnapSongs)}`);
      }

      const snapPayloadJson = JSON.stringify(cleanedWeeklyNotes);

      if (weeklySnapshotItem) {
        await supabase
          .from('progress_matrix')
          .update({
            homework_notes: snapPayloadJson,
            updated_at: new Date().toISOString()
          })
          .eq('id', weeklySnapshotItem.id);

        setProgressItems(prev => (prev || []).map(p => 
          p.id === weeklySnapshotItem.id ? { ...p, homework_notes: snapPayloadJson, updated_at: new Date().toISOString() } : p
        ));
      } else if (targetHomework) {
        const { data: newSnap } = await supabase
          .from('progress_matrix')
          .insert({
            student_id: student.id,
            teacher_id: activeTId,
            topic_name: `Hausaufgabe KW ${currentWeekNum}`,
            status: 'IN_PROGRESS',
            is_current_homework: true,
            teacher_notes: teacherNoteToSave,
            homework_notes: snapPayloadJson,
            updated_at: new Date().toISOString()
          })
          .select()
          .maybeSingle();

        if (newSnap) {
          setProgressItems(prev => [newSnap, ...(prev || [])]);
        }
      }

      const finalItem = savedItem || { id: existingItem?.id || ('temp-' + Date.now()), ...row };
      setProgressItems(prev => {
        const remaining = prev.filter(item => !isSongMatch(item, skill || { topic_name: fullTitle }));
        return [finalItem, ...remaining];
      });

      setActiveSongSkills(prev => (prev || []).map(s => {
        if (s.id === skillId || s.song_id === skill?.song_id || (skill?.songs?.id && s.song_id === skill.songs.id)) {
          return {
            ...s,
            is_current_homework: targetHomework,
            homework_notes: noteToSave,
            teacher_notes: teacherNoteToSave,
            status: targetStatus
          };
        }
        return s;
      }));

      notifyHomeworkChange();
    } catch (err) {
      console.error('[useMeisterwerkHomework] triggerDirectSongSave error:', err);
    }
  };

  const triggerDebouncedSongSave = (val: string, isHw: boolean = isCurrentHomework) => {
    if (readOnly) return;
    setHasChanges(true);
    if (songSaveDebounceTimerRef.current) {
      clearTimeout(songSaveDebounceTimerRef.current);
    }
    songSaveDebounceTimerRef.current = setTimeout(() => {
      if (selectedActiveSongId) {
        triggerDirectSongSave(selectedActiveSongId, status as any, isHw, val, teacherNotes);
      }
    }, 350);
  };

  const triggerDebouncedTeacherNoteSave = (val: string) => {
    if (readOnly) return;
    setHasChanges(true);
    if (teacherNoteDebounceTimerRef.current) {
      clearTimeout(teacherNoteDebounceTimerRef.current);
    }
    teacherNoteDebounceTimerRef.current = setTimeout(() => {
      if (activeInputTab === 'active_song' && selectedActiveSongId) {
        triggerDirectSongSave(selectedActiveSongId, status as any, isCurrentHomework, songHomeworkNotes, val);
      } else {
        triggerImmediateAutoSave();
      }
    }, 450);
  };

  const triggerDebouncedAutoSave = (delayMs: number = 350) => {
    if (readOnly) return;
    setHasChanges(true);
    if (autoSaveDebounceTimerRef.current) {
      clearTimeout(autoSaveDebounceTimerRef.current);
    }
    autoSaveDebounceTimerRef.current = setTimeout(() => {
      handleSave(true);
    }, delayMs);
  };

  const triggerImmediateAutoSave = () => {
    if (readOnly) return;
    if (autoSaveDebounceTimerRef.current) {
      clearTimeout(autoSaveDebounceTimerRef.current);
    }
    handleSave(true);
  };

  const syncHomeworkNotes = async (notesList: string[]) => {
    if (student.id === 'teacher-self') {
      return;
    }
    const currentWeek = getISOWeek();

    const dummyWeeklyItem = progressItems.find(item => 
      item.topic_name.startsWith('Hausaufgabe KW ') && 
      getItemWeek(item) === currentWeek
    );

    const effectiveMergedList = [...notesList];
    if (dummyWeeklyItem && dummyWeeklyItem.homework_notes) {
      try {
        const rawExisting = dummyWeeklyItem.homework_notes;
        let existingArr: string[] = [];
        if (typeof rawExisting === 'string') {
          try { existingArr = JSON.parse(rawExisting); } catch { existingArr = [rawExisting]; }
        } else if (Array.isArray(rawExisting)) {
          existingArr = rawExisting;
        }
        if (Array.isArray(existingArr)) {
          existingArr.forEach(exNote => {
            if (typeof exNote === 'string' && exNote.includes('AUDIO:')) {
              const exParts = exNote.substring(exNote.indexOf('AUDIO:') + 6).split('|');
              const exUrl = exParts[0]?.trim();
              const alreadyPresent = effectiveMergedList.some(m => typeof m === 'string' && m.includes('AUDIO:') && m.includes(exUrl));
              if (!alreadyPresent && exUrl) {
                effectiveMergedList.push(exNote);
              }
            } else if (typeof exNote === 'string' && (exNote.startsWith('SNAPSHOT_LEHRWERKE:') || exNote.startsWith('SNAPSHOT_SONGS:'))) {
              const prefix = exNote.startsWith('SNAPSHOT_LEHRWERKE:') ? 'SNAPSHOT_LEHRWERKE:' : 'SNAPSHOT_SONGS:';
              const alreadyHasSnap = effectiveMergedList.some(m => typeof m === 'string' && m.startsWith(prefix));
              if (!alreadyHasSnap) {
                effectiveMergedList.push(exNote);
              }
            }
          });
        }
      } catch (mergeErr) {
        console.warn('[syncHomeworkNotes] Safe-merge inspection notice:', mergeErr);
      }
    }

    const allNotesJson = JSON.stringify(effectiveMergedList);

    try {
      const candidateStudentIds = Array.from(new Set([
        student.id,
        (student as any)?.student_id,
        (student as any)?.studentId,
        (student as any)?.canonical_uuid,
        (student as any)?.slot_id
      ].filter(Boolean))) as string[];

      candidateStudentIds.forEach(cid => {
        localStorage.setItem(`campus_homework_notes_${cid}`, allNotesJson);
        localStorage.setItem(`campus_homework_week_${cid}`, currentWeek);
        localStorage.setItem(`campus_teacher_notes_${cid}`, teacherNotes.trim());

        const teacherVaultKey = `campus_teacher_audio_vault_${cid}`;
        const existingVaultStr = localStorage.getItem(teacherVaultKey);
        let existingVault: string[] = [];
        if (existingVaultStr) {
          try {
            const parsed = JSON.parse(existingVaultStr);
            if (Array.isArray(parsed)) existingVault = parsed;
          } catch {}
        }
        const audioNotesToKeep = effectiveMergedList.filter(n => typeof n === 'string' && n.startsWith('AUDIO:'));
        let vaultChanged = false;
        audioNotesToKeep.forEach(an => {
          if (!existingVault.includes(an)) {
            existingVault.push(an);
            vaultChanged = true;
          }
        });
        if (vaultChanged) {
          localStorage.setItem(teacherVaultKey, JSON.stringify(existingVault));
        }
      });
    } catch (lsErr) {
      console.warn('[useMeisterwerkHomework] localStorage cache notice:', lsErr);
    }

    try {
      if (dummyWeeklyItem) {
        const { error } = await supabase
          .from('progress_matrix')
          .update({ homework_notes: allNotesJson, teacher_notes: teacherNotes.trim(), updated_at: new Date().toISOString() })
          .eq('id', dummyWeeklyItem.id);
        if (error) console.warn('[syncHomeworkNotes] Supabase update warning:', error);
        else {
          setProgressItems(prev => (prev || []).map(p => p.id === dummyWeeklyItem.id ? { ...p, homework_notes: allNotesJson, teacher_notes: teacherNotes.trim(), updated_at: new Date().toISOString() } : p));
        }
      } else {
        const activeTId = await getCurrentTeacherId();
        const { data: insertedData, error } = await supabase
          .from('progress_matrix')
          .insert({
            student_id: student.id,
            teacher_id: activeTId,
            topic_name: `Hausaufgabe KW ${currentWeek.split('-W')[1]}`,
            status: 'IN_PROGRESS',
            is_current_homework: true,
            teacher_notes: teacherNotes.trim(),
            homework_notes: allNotesJson,
            updated_at: new Date().toISOString()
          })
          .select();
        if (error) console.warn('[syncHomeworkNotes] Supabase insert warning:', error);
        else if (insertedData && insertedData[0]) {
          setProgressItems(prev => [insertedData[0], ...(prev || [])]);
        }
      }
    } catch (dbErr) {
      console.warn('[syncHomeworkNotes] Supabase sync notice:', dbErr);
    }
    notifyHomeworkChange();
  };

  const handleSave = async (e?: React.FormEvent | boolean, keepOpenParam?: boolean) => {
    let keepOpen = false;
    if (typeof e === 'boolean') {
      keepOpen = e;
    } else {
      e?.preventDefault();
      if (typeof keepOpenParam === 'boolean') {
        keepOpen = keepOpenParam;
      }
    }
    const currentWeekNum = getISOWeek().split('-W')[1] || '';
    const defaultTitle = `Hausaufgabe KW ${currentWeekNum}`;
    const finalTopicName = topicName.trim() || defaultTitle;

    setSaving(true);
    setError(null);

    let targetHomework = isCurrentHomework;
    if (activeInputTab === 'lehrwerk_page' && activeLehrwerkId && activePageNumber !== null) {
      try {
        const stored = localStorage.getItem('student_lehrwerke_progress');
        const parsed = stored ? JSON.parse(stored) : [];

        let pageStatus: 'locked' | 'homework' | 'mastered' | 'purple' = 'locked';
        if (status === 'MASTERED') {
          pageStatus = 'mastered';
        } else if (status === 'THEORY_DONE') {
          pageStatus = 'purple';
        } else if (isCurrentHomework || (status === 'IN_PROGRESS' && pageHomeworkNotes.trim().length > 0)) {
          pageStatus = 'homework';
          targetHomework = true;
        }

        const globalStored = localStorage.getItem('campus_lehrwerke');
        if (globalStored) {
          const books = JSON.parse(globalStored);
          const updatedBooks = books.map((b: any) => {
            if (b.id === activeLehrwerkId) {
              const globalPageStates = b.globalPageStates || {};
              if (pageStatus === 'purple') {
                globalPageStates[activePageNumber] = 'purple';
              } else {
                delete globalPageStates[activePageNumber];
              }
              return { ...b, globalPageStates };
            }
            return b;
          });
          localStorage.setItem('campus_lehrwerke', JSON.stringify(updatedBooks));
        }

        const updated = parsed.map((item: any) => {
          if (item.studentId === student.id && item.lehrwerkId === activeLehrwerkId) {
            const existingPageState = item.pageStates?.[activePageNumber] || {};
            return {
              ...item,
              pageStates: {
                ...item.pageStates,
                [activePageNumber]: {
                  ...existingPageState,
                  status: pageStatus,
                  notes: teacherNotes.trim(),
                  homeworkNotes: pageHomeworkNotes.trim(),
                  studentNotes: studentNotes.trim(),
                  studentNotesIsPrivate: isStudentNotePrivate,
                  updatedAt: new Date(Date.now() + 10000).toISOString()
                }
              }
            };
          }
          return item;
        });

        localStorage.setItem('student_lehrwerke_progress', JSON.stringify(updated));
        setAssignedLehrwerke(updated.filter((item: any) => item.studentId === student.id));
      } catch (err) {
        console.error('Error saving textbook local progress:', err);
      }
    }

    if (activeInputTab === 'active_song' && selectedActiveSongId) {
      try {
        const noteToSave = songHomeworkNotes.trim();
        const finalHw = isCurrentHomework || noteToSave.length > 0;
        await triggerDirectSongSave(selectedActiveSongId, status as any, finalHw, noteToSave);
        setStudentNotesSavedToast(true);
        setTimeout(() => setStudentNotesSavedToast(false), 2500);
        if (!keepOpen) {
          setActiveSubView('hub');
          setActiveInputTab('free');
        }
        setSaving(false);
        return;
      } catch (err) {
        console.error('Error updating song skill and notes:', err);
      }
    }

    const isLehrwerkPage = (activeInputTab === 'lehrwerk_page');
    const isSong = (activeInputTab === 'active_song');

    const effectiveGeneralNotes = latestGeneralHomeworkNotesRef.current !== undefined
      ? latestGeneralHomeworkNotesRef.current
      : generalHomeworkNotes;
    const effectiveTeacherNotes = latestTeacherNotesRef.current !== undefined
      ? latestTeacherNotesRef.current
      : teacherNotes;

    const specialNotes = homeworkNotesList.filter(n => typeof n === 'string' && (n.startsWith('AUDIO:') || n.startsWith('STICKER:') || n.startsWith('FEEDBACK:') || n.startsWith('STUDENT_NOTE_')));
    const finalNotesList = [...specialNotes];
    if (!isLehrwerkPage && !isSong && effectiveGeneralNotes.trim().length > 0) {
      const noteLines = effectiveGeneralNotes.split('\n').map(s => s.trim()).filter(Boolean);
      noteLines.forEach(line => {
        if (!finalNotesList.includes(line)) {
          finalNotesList.push(line);
        }
      });
    }
    if (!isLehrwerkPage && !isSong) {
      if (sourceTransferData.sourceLW.length > 0) {
        finalNotesList.push(`SNAPSHOT_LEHRWERKE:${JSON.stringify(sourceTransferData.sourceLW)}`);
      }
      if (sourceTransferData.sourceS.length > 0) {
        finalNotesList.push(`SNAPSHOT_SONGS:${JSON.stringify(sourceTransferData.sourceS)}`);
      }
    }
    const combinedHomeworkNotes = JSON.stringify(finalNotesList);

    const hasHomeworkText = isSong ? songHomeworkNotes.trim().length > 0 : (isLehrwerkPage ? pageHomeworkNotes.trim().length > 0 : finalNotesList.length > 0);
    const isExplicitHomework = targetHomework !== undefined ? targetHomework : isCurrentHomework;
    const finalIsCurrentHomework = isSong 
      ? (isCurrentHomework || songHomeworkNotes.trim().length > 0)
      : (isLehrwerkPage
          ? (isCurrentHomework || pageHomeworkNotes.trim().length > 0)
          : (isExplicitHomework || hasHomeworkText));

    try {
      const unassignedHWItems = progressItems.filter(item => {
        if (!item.is_current_homework) return false;
        if (item.topic_name.includes(' - Seite ')) {
          const parts = item.topic_name.split(' - Seite ');
          const bookTitle = parts[0].trim();
          const book = globalLehrwerke.find(g => g.title === bookTitle);
          const isBookAssigned = book && assignedLehrwerke.some(a => a.lehrwerkId === book.id);
          return !isBookAssigned;
        }
        return false;
      });

      if (unassignedHWItems.length > 0) {
        const unassignedIds = unassignedHWItems.map(item => item.id).filter(Boolean);
        if (unassignedIds.length > 0) {
          await supabase
            .from('progress_matrix')
            .update({ is_current_homework: false })
            .in('id', unassignedIds);
        }
      }

      const activeTId = await getCurrentTeacherId();
      const currentWeek = getISOWeek();

      const rowHomeworkNotes = isSong
        ? songHomeworkNotes.trim()
        : (isLehrwerkPage
            ? pageHomeworkNotes.trim()
            : combinedHomeworkNotes);

      const row = {
        student_id: student.id,
        teacher_id: activeTId,
        topic_name: finalTopicName,
        status,
        is_current_homework: finalIsCurrentHomework,
        teacher_notes: effectiveTeacherNotes.trim(),
        homework_notes: rowHomeworkNotes,
        updated_at: new Date().toISOString()
      };

      if (!isLehrwerkPage && !isSong) {
        try {
          localStorage.setItem(`campus_homework_notes_${student.id}`, combinedHomeworkNotes);
          localStorage.setItem(`campus_homework_week_${student.id}`, currentWeek);
          localStorage.setItem(`campus_teacher_notes_${student.id}`, effectiveTeacherNotes.trim());
        } catch (lsErr) {
          console.warn('[useMeisterwerkHomework] localStorage backup notice:', lsErr);
        }
      }

      let dbError;
      if (activeItem?.id) {
        const { error } = await supabase
          .from('progress_matrix')
          .update(row)
          .eq('id', activeItem.id);
        dbError = error;
      } else {
        const existingThisWeek = progressItems.find(item => 
          item.topic_name === finalTopicName && 
          item.updated_at && 
          getISOWeek(item.updated_at) === currentWeek
        );

        if (existingThisWeek?.id) {
          const { error } = await supabase
            .from('progress_matrix')
            .update(row)
            .eq('id', existingThisWeek.id);
          dbError = error;
        } else {
          const { error } = await supabase
            .from('progress_matrix')
            .insert(row);
          dbError = error;
        }
      }

      if (dbError) throw dbError;

      if (effectiveGroupStudents.length > 1) {
        const otherStudents = effectiveGroupStudents.filter(s => s.id && s.id !== student.id);
        for (const otherStud of otherStudents) {
          try {
            if (!isLehrwerkPage && !isSong) {
              localStorage.setItem(`campus_homework_notes_${otherStud.id}`, combinedHomeworkNotes);
              localStorage.setItem(`campus_homework_week_${otherStud.id}`, currentWeek);
            }
            const otherRow = {
              student_id: otherStud.id,
              teacher_id: activeTId,
              topic_name: finalTopicName,
              status,
              is_current_homework: finalIsCurrentHomework,
              teacher_notes: effectiveTeacherNotes.trim(),
              homework_notes: rowHomeworkNotes,
              updated_at: new Date().toISOString()
            };
            const { data: existingSiblingRows } = await supabase
              .from('progress_matrix')
              .select('id, updated_at')
              .eq('student_id', otherStud.id)
              .eq('topic_name', finalTopicName);

            const siblingMatch = existingSiblingRows?.find((r: any) => r.updated_at && getISOWeek(r.updated_at) === currentWeek) || existingSiblingRows?.[0];
            if (siblingMatch?.id) {
              await supabase
                .from('progress_matrix')
                .update(otherRow)
                .eq('id', siblingMatch.id);
            } else {
              await supabase
                .from('progress_matrix')
                .insert(otherRow);
            }
          } catch (grpErr) {
            console.warn('[useMeisterwerkHomework] Group student sync notice:', otherStud.id, grpErr);
          }
        }
      }

      if (!isLehrwerkPage && !isSong) {
        await syncHomeworkNotes(finalNotesList);
      }

      if (targetHomework && !isCurrentHomework) {
        setIsCurrentHomework(true);
      }

      await fetchProgress();
      notifyHomeworkChange();
      setStudentNotesSavedToast(true);
      setTimeout(() => setStudentNotesSavedToast(false), 2500);

      setHomeworkNotesList(finalNotesList);
      setHasChanges(false);
    } catch (err: any) {
      console.error('Error saving progress:', err);
      setError('Fehler beim Speichern des Fortschritts.');
    } finally {
      setSaving(false);
    }
  };

  // Transfer Data Computation
  const sourceTransferData = useMemo(() => {
    const lwMap: Record<string, { pages: number[]; notes: string[]; bookColor?: any }> = {};
    (assignedLehrwerke || []).forEach((assignment: any) => {
      const book = globalLehrwerke.find(g => g.id === assignment.lehrwerkId);
      if (!book || !assignment.pageStates) return;
      Object.entries(assignment.pageStates).forEach(([pStr, pState]: [string, any]) => {
        if (pState?.status === 'homework' || pState?.isCurrentHomework) {
          const pNum = parseInt(pStr, 10);
          if (!isNaN(pNum)) {
            if (!lwMap[book.title]) lwMap[book.title] = { pages: [], notes: [], bookColor: getLehrwerkColor(book.title) };
            if (!lwMap[book.title].pages.includes(pNum)) lwMap[book.title].pages.push(pNum);
          }
        }
      });
    });

    (progressItems || []).forEach((item: any) => {
      if (item.topic_name && item.topic_name.includes(' - Seite ') && item.is_current_homework) {
        const parts = item.topic_name.split(' - Seite ');
        const bTitle = parts[0].trim();
        const pNum = parseInt(parts[1], 10);
        if (!lwMap[bTitle]) lwMap[bTitle] = { pages: [], notes: [], bookColor: getLehrwerkColor(bTitle) };
        if (!isNaN(pNum) && !lwMap[bTitle].pages.includes(pNum)) lwMap[bTitle].pages.push(pNum);
      }
    });

    const sourceLW = Object.entries(lwMap).map(([title, info]) => ({
      title,
      pages: info.pages.sort((a, b) => a - b),
      notes: info.notes,
      bookColor: info.bookColor
    }));

    const sourceS: any[] = [];
    (progressItems || []).forEach((item: any) => {
      if (item.is_current_homework && !item.topic_name?.includes(' - Seite ') && !item.topic_name?.startsWith('Hausaufgabe KW ')) {
        const cleanTopic = getNormalizedSongTitle(item);
        const canKey = getCanonicalSongKey(item);
        if (cleanTopic && !sourceS.some(x => getCanonicalSongKey(x) === canKey || getNormalizedSongTitle(x) === cleanTopic)) {
          sourceS.push({
            id: item.id,
            topic_name: item.topic_name,
            homework_notes: item.homework_notes
          });
        }
      }
    });

    (activeSongSkills || []).forEach((skill: any) => {
      const isHwInLs = localStorage.getItem(`song_hw_${student.id}_${skill.id}`) === 'true' ||
                       localStorage.getItem(`song_hw_${student.id}_${skill.song_id}`) === 'true';
      const isMarkedHw = isHwInLs || skill.is_current_homework === true || skill.is_homework === true;
      if (isMarkedHw) {
        const cleanTopic = getNormalizedSongTitle(skill);
        const canKey = getCanonicalSongKey(skill);
        if (!sourceS.some(x => getCanonicalSongKey(x) === canKey || getNormalizedSongTitle(x) === cleanTopic)) {
          const songArtist = skill.songs?.artist || skill.artist || '';
          const songTitle = skill.songs?.title || skill.title || skill.song_title || 'Song';
          const songInstrument = skill.instrument ? ` (${skill.instrument})` : '';
          const fullTitle = songArtist ? `${songArtist} - ${songTitle}${songInstrument}` : `${songTitle}${songInstrument}`;
          sourceS.push({
            id: skill.id,
            topic_name: fullTitle,
            homework_notes: skill.homework_notes
          });
        }
      }
    });

    const rawAudioList = (homeworkNotesList || [])
      .map((note, idx) => ({ note: typeof note === 'string' ? note : String(note || ''), idx }))
      .filter(item => item.note.includes("AUDIO:"))
      .map((item, index) => {
        const cleanStr = item.note.startsWith('[') ? item.note.replace(/[\[\]"]/g, '') : item.note;
        const parts = cleanStr.substring(cleanStr.indexOf('AUDIO:') + 6).split('|');
        return {
          url: parts[0]?.trim(),
          duration: parseInt(parts[1] || '0', 10),
          date: parts[2]?.trim(),
          label: parts[3]?.trim() || `Aufnahme #${index + 1}`,
          author: parts[4]?.trim() || 'teacher',
          uniqueRecId: parts[6]?.trim(),
          songTag: parts[7]?.trim(),
          originalIdx: item.idx,
          idx: item.idx
        };
      })
      .filter(a => !!a.url);

    const harmonizedSourceAudios = harmonizeAudioList(rawAudioList, true, topicName);
    const sourceA = harmonizedSourceAudios.map(aud => ({
      ...aud,
      label: aud.harmonizedTitle || aud.label
    }));

    return { sourceLW, sourceS, sourceA };
  }, [assignedLehrwerke, globalLehrwerke, progressItems, activeSongSkills, homeworkNotesList, student.id, topicName, getLehrwerkColor]);

  const hasTransferableHomework = useMemo(() => {
    const hasLW = (sourceTransferData.sourceLW || []).length > 0;
    const hasSongs = (sourceTransferData.sourceS || []).length > 0;
    const hasAudios = (sourceTransferData.sourceA || []).length > 0;

    const hasNotesInList = (homeworkNotesList || []).some(n => 
      typeof n === 'string' && 
      !isInternalMetadataNote(n) && 
      !n.startsWith('AUDIO:') && 
      !n.startsWith('STICKER:') && 
      !n.startsWith('FEEDBACK:') && 
      n.trim().length > 0
    );
    const hasGeneralNote = (generalHomeworkNotes || '').trim().length > 0;

    return hasLW || hasSongs || hasAudios || hasNotesInList || hasGeneralNote;
  }, [sourceTransferData, homeworkNotesList, generalHomeworkNotes]);

  // Direct actions for textbook and song homework
  const handleRemoveSinglePageHomework = async (bookTitle: string, pageNum: number) => {
    try {
      const book = globalLehrwerke.find(b => b.title === bookTitle);
      if (book) {
        const stored = localStorage.getItem('student_lehrwerke_progress');
        const parsed = stored ? JSON.parse(stored) : [];
        
        const updated = parsed.map((item: any) => {
          if (item.studentId === student.id && item.lehrwerkId === book.id) {
            const pageStates = { ...item.pageStates };
            pageStates[pageNum] = {
              ...pageStates[pageNum],
              status: 'locked',
              isCurrentHomework: false,
              updatedAt: new Date().toISOString()
            };
            return { ...item, pageStates };
          }
          return item;
        });
        
        localStorage.setItem('student_lehrwerke_progress', JSON.stringify(updated));
        setAssignedLehrwerke(updated.filter((item: any) => item.studentId === student.id));
        
        const globalStored = localStorage.getItem('campus_lehrwerke');
        if (globalStored) {
          const books = JSON.parse(globalStored);
          const updatedBooks = books.map((b: any) => {
            if (b.id === book.id) {
              const globalPageStates = { ...b.globalPageStates };
              delete globalPageStates[pageNum];
              return { ...b, globalPageStates };
            }
            return b;
          });
          localStorage.setItem('campus_lehrwerke', JSON.stringify(updatedBooks));
        }

        loadLehrwerke();
      }

      const pageTopic = `${bookTitle} - Seite ${pageNum}`;
      const matchingItems = progressItems.filter(item => item.topic_name === pageTopic);
      const matchingIds = matchingItems.map(i => i.id).filter(id => id && !String(id).startsWith('temp-'));
      if (matchingIds.length > 0) {
        await supabase
          .from('progress_matrix')
          .update({ is_current_homework: false, status: 'IN_PROGRESS' })
          .in('id', matchingIds);
      }

      setProgressItems(prev => prev.map(item => {
        if (item.topic_name === pageTopic) {
          return { ...item, is_current_homework: false, status: 'IN_PROGRESS' };
        }
        return item;
      }));

      await fetchProgress();
      notifyHomeworkChange();
    } catch (e) {
      console.error('Error removing single page homework:', e);
    }
  };

  const handleRemoveBookHomework = async (bookTitle: string) => {
    try {
      const book = globalLehrwerke.find(b => b.title === bookTitle);
      if (book) {
        const stored = localStorage.getItem('student_lehrwerke_progress');
        const parsed = stored ? JSON.parse(stored) : [];
        
        const updated = parsed.map((item: any) => {
          if (item.studentId === student.id && item.lehrwerkId === book.id) {
            const pageStates = { ...item.pageStates };
            Object.keys(pageStates).forEach(pKey => {
              if (pageStates[pKey]?.status === 'homework' || pageStates[pKey]?.isCurrentHomework) {
                pageStates[pKey] = {
                  ...pageStates[pKey],
                  status: 'locked',
                  isCurrentHomework: false,
                  updatedAt: new Date().toISOString()
                };
              }
            });
            return { ...item, pageStates };
          }
          return item;
        });
        
        localStorage.setItem('student_lehrwerke_progress', JSON.stringify(updated));
        setAssignedLehrwerke(updated.filter((item: any) => item.studentId === student.id));
        loadLehrwerke();
      }

      const matchingItems = progressItems.filter(item => item.topic_name && item.topic_name.startsWith(`${bookTitle} - Seite `));
      const matchingIds = matchingItems.map(i => i.id).filter(id => id && !String(id).startsWith('temp-'));
      if (matchingIds.length > 0) {
        await supabase
          .from('progress_matrix')
          .update({ is_current_homework: false, status: 'IN_PROGRESS' })
          .in('id', matchingIds);
      }

      setProgressItems(prev => prev.map(item => {
        if (item.topic_name && item.topic_name.startsWith(`${bookTitle} - Seite `)) {
          return { ...item, is_current_homework: false, status: 'IN_PROGRESS' };
        }
        return item;
      }));

      await fetchProgress();
      notifyHomeworkChange();
    } catch (e) {
      console.error('Error removing book homework:', e);
    }
  };

  const handleRemoveSongHomework = async (songItemOrSkill: any) => {
    try {
      const matchingSkill = activeSongSkills.find(s => isSongMatch(s, songItemOrSkill));
      const skillId = matchingSkill?.id || songItemOrSkill?.id;

      try {
        if (student?.id) {
          if (skillId) localStorage.setItem(`song_hw_${student.id}_${skillId}`, 'false');
          if (matchingSkill?.id) localStorage.setItem(`song_hw_${student.id}_${matchingSkill.id}`, 'false');
          if (matchingSkill?.song_id) localStorage.setItem(`song_hw_${student.id}_${matchingSkill.song_id}`, 'false');
        }
      } catch (e) {}

      const matchingItems = progressItems.filter(item => isSongMatch(item, songItemOrSkill));
      const matchingIds = matchingItems.map(i => i.id).filter(id => id && !String(id).startsWith('temp-'));

      if (matchingIds.length > 0) {
        await supabase
          .from('progress_matrix')
          .update({ is_current_homework: false, status: 'IN_PROGRESS' })
          .in('id', matchingIds);
      }

      if (selectedActiveSongId && matchingSkill && (selectedActiveSongId === matchingSkill.id || selectedActiveSongId === matchingSkill.song_id)) {
        setIsCurrentHomework(false);
        setStatus('IN_PROGRESS');
      }

      setProgressItems(prev => prev.map(item => {
        if (isSongMatch(item, songItemOrSkill)) {
          return { ...item, is_current_homework: false, status: 'IN_PROGRESS' };
        }
        return item;
      }));

      await fetchProgress();
      await loadActiveSongSkills();
      notifyHomeworkChange();
    } catch (err) {
      console.error('Error removing song homework:', err);
    }
  };

  const handleRemoveHomeworkItem = async (itemId: string, bookTitle?: string, pageNum?: number) => {
    try {
      if (bookTitle && pageNum !== undefined) {
        await handleRemoveSinglePageHomework(bookTitle, pageNum);
        return;
      }
      const item = progressItems.find(i => i.id === itemId);
      if (item) {
        await handleRemoveSongHomework(item);
        return;
      }

      const { error } = await supabase
        .from('progress_matrix')
        .update({ is_current_homework: false, status: 'IN_PROGRESS' })
        .eq('id', itemId);

      if (error) throw error;

      await fetchProgress();
      notifyHomeworkChange();
    } catch (e) {
      console.error('Error removing homework item:', e);
    }
  };

  const handleMasterSongDirect = async (songItemOrSkill: any) => {
    try {
      const matchingSkill = activeSongSkills.find(s => isSongMatch(s, songItemOrSkill));
      const skillId = matchingSkill?.id || songItemOrSkill?.id;

      try {
        if (student?.id) {
          if (skillId) localStorage.setItem(`song_hw_${student.id}_${skillId}`, 'false');
          if (matchingSkill?.id) localStorage.setItem(`song_hw_${student.id}_${matchingSkill.id}`, 'false');
          if (matchingSkill?.song_id) localStorage.setItem(`song_hw_${student.id}_${matchingSkill.song_id}`, 'false');
        }
      } catch (e) {}

      const matchingItems = progressItems.filter(item => isSongMatch(item, songItemOrSkill));
      const matchingIds = matchingItems.map(i => i.id).filter(id => id && !String(id).startsWith('temp-'));

      if (matchingIds.length > 0) {
        await supabase
          .from('progress_matrix')
          .update({ is_current_homework: false, status: 'MASTERED', updated_at: new Date().toISOString() })
          .in('id', matchingIds);
      }

      if (selectedActiveSongId && matchingSkill && (selectedActiveSongId === matchingSkill.id || selectedActiveSongId === matchingSkill.song_id)) {
        setIsCurrentHomework(false);
        setStatus('MASTERED');
      }

      setProgressItems(prev => prev.map(item => {
        if (isSongMatch(item, songItemOrSkill)) {
          return { ...item, is_current_homework: false, status: 'MASTERED' };
        }
        return item;
      }));

      setShowMatchConfetti(true);
      setTimeout(() => setShowMatchConfetti(false), 3500);

      await fetchProgress();
      await loadActiveSongSkills();
      notifyHomeworkChange();
    } catch (err) {
      console.error('Error mastering song homework:', err);
    }
  };

  const handleReactivateSongDirect = async (songItemOrSkill: any, targetWeekIso?: string) => {
    try {
      const matchingSkill = activeSongSkills.find(s => isSongMatch(s, songItemOrSkill));
      const skillId = matchingSkill?.id || songItemOrSkill?.id;

      try {
        if (student?.id) {
          if (skillId) localStorage.setItem(`song_hw_${student.id}_${skillId}`, 'true');
          if (matchingSkill?.id) localStorage.setItem(`song_hw_${student.id}_${matchingSkill.id}`, 'true');
          if (matchingSkill?.song_id) localStorage.setItem(`song_hw_${student.id}_${matchingSkill.song_id}`, 'true');
        }
      } catch (e) {}

      const targetIso = targetWeekIso || getTargetWeekIso(viewingWeekOffset);
      const songTopic = songItemOrSkill.topic_name || getNormalizedSongTitle(songItemOrSkill);
      const activeTId = await getCurrentTeacherId();

      const existingInTargetWeek = progressItems.find(item => 
        isSongMatch(item, songItemOrSkill) && 
        item.updated_at && 
        getISOWeek(item.updated_at) === targetIso
      );

      if (existingInTargetWeek?.id && !String(existingInTargetWeek.id).startsWith('temp-')) {
        await supabase
          .from('progress_matrix')
          .update({ is_current_homework: true, status: 'IN_PROGRESS', updated_at: new Date().toISOString() })
          .eq('id', existingInTargetWeek.id);
      } else {
        await supabase
          .from('progress_matrix')
          .insert({
            student_id: student.id,
            teacher_id: activeTId,
            topic_name: songTopic,
            status: 'IN_PROGRESS',
            is_current_homework: true,
            homework_notes: songItemOrSkill.homework_notes || '',
            teacher_notes: '',
            updated_at: new Date().toISOString()
          });
      }

      const pastMatching = progressItems.filter(item => 
        isSongMatch(item, songItemOrSkill) && 
        item.updated_at && 
        getISOWeek(item.updated_at) !== targetIso && 
        item.is_current_homework
      );
      const pastIds = pastMatching.map(i => i.id).filter(id => id && !String(id).startsWith('temp-'));
      if (pastIds.length > 0) {
        await supabase.from('progress_matrix').update({ is_current_homework: false }).in('id', pastIds);
      }

      if (selectedActiveSongId && matchingSkill && (selectedActiveSongId === matchingSkill.id || selectedActiveSongId === matchingSkill.song_id)) {
        setIsCurrentHomework(true);
        setStatus('IN_PROGRESS');
      }

      setProgressItems(prev => prev.map(item => {
        if (isSongMatch(item, songItemOrSkill)) {
          return { ...item, is_current_homework: true, status: 'IN_PROGRESS' };
        }
        return item;
      }));

      await fetchProgress();
      await loadActiveSongSkills();
      notifyHomeworkChange();
    } catch (err) {
      console.error('Error reactivating song homework:', err);
    }
  };

  const handleMasterBookDirect = async (bookTitle: string) => {
    try {
      const book = globalLehrwerke.find(b => b.title === bookTitle);
      if (book) {
        const stored = localStorage.getItem('student_lehrwerke_progress');
        const parsed = stored ? JSON.parse(stored) : [];
        
        const updated = parsed.map((item: any) => {
          if (item.studentId === student.id && item.lehrwerkId === book.id) {
            const pageStates = { ...item.pageStates };
            Object.keys(pageStates).forEach(pKey => {
              if (pageStates[pKey]?.status === 'homework' || pageStates[pKey]?.isCurrentHomework) {
                pageStates[pKey] = {
                  ...pageStates[pKey],
                  status: 'mastered',
                  isCurrentHomework: false,
                  updatedAt: new Date().toISOString()
                };
              }
            });
            return { ...item, pageStates };
          }
          return item;
        });
        
        localStorage.setItem('student_lehrwerke_progress', JSON.stringify(updated));
        setAssignedLehrwerke(updated.filter((item: any) => item.studentId === student.id));
        loadLehrwerke();
      }

      const matchingItems = progressItems.filter(item => item.topic_name && item.topic_name.startsWith(`${bookTitle} - Seite `));
      const matchingIds = matchingItems.map(i => i.id).filter(id => id && !String(id).startsWith('temp-'));
      if (matchingIds.length > 0) {
        await supabase
          .from('progress_matrix')
          .update({ is_current_homework: false, status: 'MASTERED', updated_at: new Date().toISOString() })
          .in('id', matchingIds);
      }

      setProgressItems(prev => prev.map(item => {
        if (item.topic_name && item.topic_name.startsWith(`${bookTitle} - Seite `)) {
          return { ...item, is_current_homework: false, status: 'MASTERED' };
        }
        return item;
      }));

      setShowMatchConfetti(true);
      setTimeout(() => setShowMatchConfetti(false), 3500);

      await fetchProgress();
      notifyHomeworkChange();
    } catch (e) {
      console.error('Error mastering book homework:', e);
    }
  };

  const handleReactivateBookDirect = async (bookTitle: string, targetWeekIso?: string) => {
    try {
      const book = globalLehrwerke.find(b => b.title === bookTitle);
      if (book) {
        const stored = localStorage.getItem('student_lehrwerke_progress');
        const parsed = stored ? JSON.parse(stored) : [];
        
        const updated = parsed.map((item: any) => {
          if (item.studentId === student.id && item.lehrwerkId === book.id) {
            const pageStates = { ...item.pageStates };
            Object.keys(pageStates).forEach(pKey => {
              pageStates[pKey] = {
                ...pageStates[pKey],
                status: 'homework',
                isCurrentHomework: true,
                updatedAt: new Date().toISOString()
              };
            });
            return { ...item, pageStates };
          }
          return item;
        });
        
        localStorage.setItem('student_lehrwerke_progress', JSON.stringify(updated));
        setAssignedLehrwerke(updated.filter((item: any) => item.studentId === student.id));
        loadLehrwerke();
      }

      const targetIso = targetWeekIso || getTargetWeekIso(viewingWeekOffset);
      const activeTId = await getCurrentTeacherId();

      const matchingItems = progressItems.filter(item => item.topic_name && item.topic_name.startsWith(`${bookTitle} - Seite `));
      const targetItems = matchingItems.filter(item => item.updated_at && getISOWeek(item.updated_at) === targetIso);
      const targetIds = targetItems.map(i => i.id).filter(id => id && !String(id).startsWith('temp-'));

      if (targetIds.length > 0) {
        await supabase
          .from('progress_matrix')
          .update({ is_current_homework: true, status: 'IN_PROGRESS', updated_at: new Date().toISOString() })
          .in('id', targetIds);
      } else {
        const pagesToCopy = matchingItems.map(item => {
          const parts = item.topic_name.split(' - Seite ');
          return parts[1] ? parseInt(parts[1], 10) : NaN;
        }).filter(p => !isNaN(p));
        const uniquePages = Array.from(new Set(pagesToCopy));
        
        for (const pNum of uniquePages) {
          await supabase.from('progress_matrix').insert({
            student_id: student.id,
            teacher_id: activeTId,
            topic_name: `${bookTitle} - Seite ${pNum}`,
            status: 'IN_PROGRESS',
            is_current_homework: true,
            homework_notes: '',
            teacher_notes: '',
            updated_at: new Date().toISOString()
          });
        }
      }

      const pastMatching = matchingItems.filter(item => item.updated_at && getISOWeek(item.updated_at) !== targetIso && item.is_current_homework);
      const pastIds = pastMatching.map(i => i.id).filter(id => id && !String(id).startsWith('temp-'));
      if (pastIds.length > 0) {
        await supabase.from('progress_matrix').update({ is_current_homework: false }).in('id', pastIds);
      }

      setProgressItems(prev => prev.map(item => {
        if (item.topic_name && item.topic_name.startsWith(`${bookTitle} - Seite `)) {
          return { ...item, is_current_homework: true, status: 'IN_PROGRESS' };
        }
        return item;
      }));

      await fetchProgress();
      notifyHomeworkChange();
    } catch (e) {
      console.error('Error reactivating book homework:', e);
    }
  };

  const handleMasterSinglePageDirect = async (bookTitle: string, pageNum: number) => {
    try {
      const book = globalLehrwerke.find(b => b.title === bookTitle);
      if (book) {
        const stored = localStorage.getItem('student_lehrwerke_progress');
        const parsed = stored ? JSON.parse(stored) : [];
        
        const updated = parsed.map((item: any) => {
          if (item.studentId === student.id && item.lehrwerkId === book.id) {
            const pageStates = { ...item.pageStates };
            pageStates[pageNum] = {
              ...pageStates[pageNum],
              status: 'mastered',
              isCurrentHomework: false,
              updatedAt: new Date().toISOString()
            };
            return { ...item, pageStates };
          }
          return item;
        });
        
        localStorage.setItem('student_lehrwerke_progress', JSON.stringify(updated));
        setAssignedLehrwerke(updated.filter((item: any) => item.studentId === student.id));
        loadLehrwerke();
      }

      const pageTopic = `${bookTitle} - Seite ${pageNum}`;
      const matchingItems = progressItems.filter(item => item.topic_name === pageTopic);
      const matchingIds = matchingItems.map(i => i.id).filter(id => id && !String(id).startsWith('temp-'));
      if (matchingIds.length > 0) {
        await supabase
          .from('progress_matrix')
          .update({ is_current_homework: false, status: 'MASTERED', updated_at: new Date().toISOString() })
          .in('id', matchingIds);
      }

      setProgressItems(prev => prev.map(item => {
        if (item.topic_name === pageTopic) {
          return { ...item, is_current_homework: false, status: 'MASTERED' };
        }
        return item;
      }));

      setShowMatchConfetti(true);
      setTimeout(() => setShowMatchConfetti(false), 3500);

      await fetchProgress();
      notifyHomeworkChange();
    } catch (e) {
      console.error('Error mastering single page:', e);
    }
  };

  const handleReactivateSinglePageDirect = async (bookTitle: string, pageNum: number, targetWeekIso?: string) => {
    try {
      const book = globalLehrwerke.find(b => b.title === bookTitle);
      if (book) {
        const stored = localStorage.getItem('student_lehrwerke_progress');
        const parsed = stored ? JSON.parse(stored) : [];
        
        const updated = parsed.map((item: any) => {
          if (item.studentId === student.id && item.lehrwerkId === book.id) {
            const pageStates = { ...item.pageStates };
            pageStates[pageNum] = {
              ...pageStates[pageNum],
              status: 'homework',
              isCurrentHomework: true,
              updatedAt: new Date().toISOString()
            };
            return { ...item, pageStates };
          }
          return item;
        });
        
        localStorage.setItem('student_lehrwerke_progress', JSON.stringify(updated));
        setAssignedLehrwerke(updated.filter((item: any) => item.studentId === student.id));
        loadLehrwerke();
      }

      const targetIso = targetWeekIso || getTargetWeekIso(viewingWeekOffset);
      const pageTopic = `${bookTitle} - Seite ${pageNum}`;
      const activeTId = await getCurrentTeacherId();

      const existingInTargetWeek = progressItems.find(item => 
        item.topic_name === pageTopic && 
        item.updated_at && 
        getISOWeek(item.updated_at) === targetIso
      );

      if (existingInTargetWeek?.id && !String(existingInTargetWeek.id).startsWith('temp-')) {
        await supabase
          .from('progress_matrix')
          .update({ is_current_homework: true, status: 'IN_PROGRESS', updated_at: new Date().toISOString() })
          .eq('id', existingInTargetWeek.id);
      } else {
        await supabase
          .from('progress_matrix')
          .insert({
            student_id: student.id,
            teacher_id: activeTId,
            topic_name: pageTopic,
            status: 'IN_PROGRESS',
            is_current_homework: true,
            homework_notes: '',
            teacher_notes: '',
            updated_at: new Date().toISOString()
          });
      }

      const pastMatching = progressItems.filter(item => 
        item.topic_name === pageTopic && 
        item.updated_at && 
        getISOWeek(item.updated_at) !== targetIso && 
        item.is_current_homework
      );
      const pastIds = pastMatching.map(i => i.id).filter(id => id && !String(id).startsWith('temp-'));
      if (pastIds.length > 0) {
        await supabase.from('progress_matrix').update({ is_current_homework: false }).in('id', pastIds);
      }

      setProgressItems(prev => prev.map(item => {
        if (item.topic_name === pageTopic) {
          return { ...item, is_current_homework: true, status: 'IN_PROGRESS' };
        }
        return item;
      }));

      await fetchProgress();
      notifyHomeworkChange();
    } catch (e) {
      console.error('Error reactivating single page:', e);
    }
  };

  const handleKeepAudioTrack = async (_originalIdx: number, _url?: string) => {
    setShowMatchConfetti(true);
    setTimeout(() => setShowMatchConfetti(false), 2000);
    notifyHomeworkChange();
  };

  const handleHideAudioTrack = async (noteIndexOrUrl: number | string, optionalUrl?: string) => {
    try {
      const targetUrl: string | undefined = typeof noteIndexOrUrl === 'string' ? noteIndexOrUrl : optionalUrl;
      const targetIndex: number = typeof noteIndexOrUrl === 'number' ? noteIndexOrUrl : -1;

      const updatedList = (homeworkNotesList || []).filter((item, idx) => {
        if (targetIndex >= 0 && idx === targetIndex) return false;
        if (targetUrl && typeof item === 'string' && item.includes(targetUrl)) return false;
        return true;
      });

      setHomeworkNotesList(updatedList);
      await syncHomeworkNotes(updatedList);
      notifyHomeworkChange();
    } catch (err) {
      console.error('Error hiding audio track:', err);
    }
  };

  // Batch transfer execution
  const handleExecuteBatchTransfer = async (decisions: {
    lehrwerke: Record<string, 'master' | 'reactivate' | 'park'>;
    lehrwerkePages?: Record<string, Record<number, 'master' | 'reactivate' | 'park'>>;
    songs: Record<string, 'master' | 'reactivate' | 'park'>;
    audios: Record<string, 'keep' | 'hide'>;
  }) => {
    try {
      const targetIso = getTargetWeekIso(viewingWeekOffset);
      const targetNum = targetIso.split('-W')[1] || '';
      const prevTarget = getSimulatedNow();
      prevTarget.setDate(prevTarget.getDate() + ((viewingWeekOffset - 1) * 7));
      const sourceIso = getISOWeek(prevTarget);
      const sourceNum = sourceIso.split('-W')[1] || '';
      const activeTId = await getCurrentTeacherId();

      try {
        const existingSourceSnap = progressItems.find(it => it.topic_name === `Hausaufgabe KW ${sourceNum}`);
        const sourceAudios = (sourceTransferData.sourceA || []).map(a => 
          `AUDIO:${a.url}|${a.duration || 0}|${a.date || new Date().toISOString()}|${a.label}|${(a as any).author || 'teacher'}|shared_with_teacher|${(a as any).uniqueRecId || ''}|${(a as any).songTag || ''}`
        );

        if (existingSourceSnap) {
          let existingNotesList: string[] = [];
          try {
            const p = typeof existingSourceSnap.homework_notes === 'string' 
              ? JSON.parse(existingSourceSnap.homework_notes) 
              : existingSourceSnap.homework_notes;
            if (Array.isArray(p)) existingNotesList = p;
          } catch {}

          const cleanExisting = existingNotesList.filter((n: string) => 
            typeof n === 'string' && !n.startsWith('SNAPSHOT_LEHRWERKE:') && !n.startsWith('SNAPSHOT_SONGS:')
          );
          const enrichedSourceNotes = [
            ...cleanExisting,
            ...(sourceTransferData.sourceLW.length > 0 ? [`SNAPSHOT_LEHRWERKE:${JSON.stringify(sourceTransferData.sourceLW)}`] : []),
            ...(sourceTransferData.sourceS.length > 0 ? [`SNAPSHOT_SONGS:${JSON.stringify(sourceTransferData.sourceS)}`] : [])
          ];

          await supabase
            .from('progress_matrix')
            .update({
              homework_notes: JSON.stringify(enrichedSourceNotes)
            })
            .eq('id', existingSourceSnap.id);
        } else {
          const sourceSnapNotes = [
            ...sourceAudios,
            ...(sourceTransferData.sourceLW.length > 0 ? [`SNAPSHOT_LEHRWERKE:${JSON.stringify(sourceTransferData.sourceLW)}`] : []),
            ...(sourceTransferData.sourceS.length > 0 ? [`SNAPSHOT_SONGS:${JSON.stringify(sourceTransferData.sourceS)}`] : [])
          ];
          await supabase
            .from('progress_matrix')
            .insert({
              student_id: student.id,
              teacher_id: activeTId,
              topic_name: `Hausaufgabe KW ${sourceNum}`,
              status: 'IN_PROGRESS',
              is_current_homework: false,
              teacher_notes: '',
              homework_notes: JSON.stringify(sourceSnapNotes),
              updated_at: prevTarget.toISOString()
            });
        }
      } catch (snapErr) {
        console.warn('[handleExecuteBatchTransfer] Notice preserving source snapshot:', snapErr);
      }

      for (const [title, action] of Object.entries(decisions.lehrwerke)) {
        const bookPagesDecision = decisions.lehrwerkePages?.[title];
        if (bookPagesDecision && Object.keys(bookPagesDecision).length > 0) {
          for (const [pNumStr, pAction] of Object.entries(bookPagesDecision)) {
            const pageNum = parseInt(pNumStr, 10);
            if (isNaN(pageNum)) continue;
            if (pAction === 'master') {
              await handleMasterSinglePageDirect(title, pageNum);
            } else if (pAction === 'park') {
              await handleRemoveSinglePageHomework(title, pageNum);
            } else if (pAction === 'reactivate') {
              await handleReactivateSinglePageDirect(title, pageNum, targetIso);
            }
          }
        } else {
          if (action === 'master') {
            await handleMasterBookDirect(title);
          } else if (action === 'park') {
            await handleRemoveBookHomework(title);
          } else if (action === 'reactivate') {
            await handleReactivateBookDirect(title, targetIso);
          }
        }
      }

      for (const [songKey, action] of Object.entries(decisions.songs)) {
        const songItem = sourceTransferData.sourceS.find(s => (s.id === songKey || s.topic_name === songKey));
        if (!songItem) continue;
        if (action === 'master') {
          await handleMasterSongDirect(songItem);
        } else if (action === 'park') {
          await handleRemoveSongHomework(songItem);
        } else if (action === 'reactivate') {
          await handleReactivateSongDirect(songItem, targetIso);
        }
      }

      for (const [url, action] of Object.entries(decisions.audios)) {
        const aItem = sourceTransferData.sourceA.find(a => a.url === url);
        if (action === 'keep') {
          if (aItem) await handleKeepAudioTrack(aItem.originalIdx, url);
        } else if (action === 'hide') {
          if (aItem) await handleHideAudioTrack(aItem.originalIdx, url);
        }
      }

      localStorage.setItem(`week_transferred_${student.id}_${targetIso}`, 'true');

      const existingSnap = progressItems.find(it => it.topic_name === `Hausaufgabe KW ${targetNum}`);
      const keptAudios = sourceTransferData.sourceA
        .filter(a => decisions.audios[a.url] === 'keep')
        .map(a => `AUDIO:${a.url}|${a.duration || 0}|${new Date().toISOString()}|${a.label}|${(a as any).author || 'teacher'}|shared_with_teacher|${(a as any).uniqueRecId || ''}|${(a as any).songTag || ''}`);

      const targetLwList = sourceTransferData.sourceLW
        .map(lw => {
          const pagesDecision = decisions.lehrwerkePages?.[lw.title];
          const keptPages = pagesDecision 
            ? lw.pages.filter(p => pagesDecision[p] === 'reactivate')
            : (decisions.lehrwerke[lw.title] === 'reactivate' ? lw.pages : []);
          return {
            ...lw,
            pages: keptPages
          };
        })
        .filter(lw => lw.pages.length > 0);

      const targetSongsList = sourceTransferData.sourceS.filter(s => decisions.songs[s.id || s.topic_name] === 'reactivate');

      const targetSnapNotes = [
        ...keptAudios,
        ...(targetLwList.length > 0 ? [`SNAPSHOT_LEHRWERKE:${JSON.stringify(targetLwList)}`] : []),
        ...(targetSongsList.length > 0 ? [`SNAPSHOT_SONGS:${JSON.stringify(targetSongsList)}`] : [])
      ];
      const snapNotesJson = JSON.stringify(targetSnapNotes);

      if (existingSnap) {
        await supabase
          .from('progress_matrix')
          .update({ homework_notes: snapNotesJson, is_current_homework: true, updated_at: new Date().toISOString() })
          .eq('id', existingSnap.id);
      } else {
        await supabase
          .from('progress_matrix')
          .insert({
            student_id: student.id,
            teacher_id: activeTId,
            topic_name: `Hausaufgabe KW ${targetNum}`,
            status: 'IN_PROGRESS',
            is_current_homework: true,
            teacher_notes: '',
            homework_notes: snapNotesJson,
            updated_at: new Date().toISOString()
          });
      }

      notifyHomeworkChange();
      await fetchProgress();
      await loadLehrwerke();
      await loadActiveSongSkills();
      setIsTransferModalOpen(false);
    } catch (err) {
      console.error('[handleExecuteBatchTransfer] Error:', err);
    }
  };

  return {
    viewingWeekOffset,
    setViewingWeekOffset,
    isTransferModalOpen,
    setIsTransferModalOpen,
    generalHomeworkNotes,
    setGeneralHomeworkNotes,
    teacherNotes,
    setTeacherNotes,
    homeworkNotesList,
    setHomeworkNotesList,
    pageHomeworkNotes,
    setPageHomeworkNotes,
    songHomeworkNotes,
    setSongHomeworkNotes,
    studentNotes,
    setStudentNotes,
    isStudentNotePrivate,
    setIsStudentNotePrivate,
    activeNoteTarget,
    setActiveNoteTarget,
    latestGeneralHomeworkNotesRef,
    latestTeacherNotesRef,
    hasChanges,
    setHasChanges,
    saving,
    setSaving,
    error,
    setError,
    getISOWeek,
    getTargetWeekIso,
    triggerDirectSongSave,
    triggerDebouncedSongSave,
    triggerDebouncedTeacherNoteSave,
    triggerDebouncedAutoSave,
    triggerImmediateAutoSave,
    syncHomeworkNotes,
    handleSave,
    sourceTransferData,
    hasTransferableHomework,
    handleExecuteBatchTransfer,
    handleRemoveSinglePageHomework,
    handleRemoveBookHomework,
    handleRemoveSongHomework,
    handleRemoveHomeworkItem,
    handleMasterSongDirect,
    handleReactivateSongDirect,
    handleMasterBookDirect,
    handleReactivateBookDirect,
    handleMasterSinglePageDirect,
    handleReactivateSinglePageDirect,
    handleKeepAudioTrack,
    handleHideAudioTrack
  };
};
