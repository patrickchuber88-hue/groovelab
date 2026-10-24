import React, { useState, useRef, useEffect, useMemo } from 'react';
import { getDailyQuote } from '@groovelab/shared';
import { supabase } from '../../lib/supabase';
import { getTeacherActiveBoards } from './hooks/useTeacherTagesplan';
import { isTeacherCurrentlyAbsent } from '../../utils/teacherAbsenceHelper';
import { resolveCampusStudentAvatar } from '../../utils/avatarResolutionEngine';

const computeSlotStartAndEnd = (slot: any): { startStr: string; endStr: string } => {
  const rawStart = slot?.startTime || slot?.start_time?.substring(0, 5) || slot?.timeSlot?.split('-')?.[0]?.trim() || '14:00';
  const startStr = String(rawStart).substring(0, 5);
  const explicitEnd = slot?.endTime || slot?.end_time?.substring(0, 5) || slot?.timeSlot?.split('-')?.[1]?.trim();
  if (explicitEnd && String(explicitEnd).includes(':')) {
    return { startStr, endStr: String(explicitEnd).substring(0, 5) };
  }
  const [sh, sm] = startStr.split(':').map(Number);
  const durationMin = Number(slot?.duration || slot?.duration_minutes) || 30;
  const totalMin = (Number.isFinite(sh) ? sh : 14) * 60 + (Number.isFinite(sm) ? sm : 0) + durationMin;
  const endStr = `${String(Math.floor(totalMin / 60) % 24).padStart(2, '0')}:${String(totalMin % 60).padStart(2, '0')}`;
  return { startStr, endStr };
};
import {
  parseHomeworkNotesPayload,
  buildHomeworkNotesPayload,
  deleteCurrentHomeworkAuthoritative,
  isPureDidacticNote,
  sanitizeDidacticText
} from '../../utils/homeworkSnapshotHelper';

import {
  TagesKompassHost,
  TagesKompassState,
  NextTeachingDaySummary,
  formatTagesKompassStudentName
} from './tageskompass';

export type { NextTeachingDaySummary } from './tageskompass';

export function resolveNextTeachingDaySummary(
  teacher: any,
  allStudents: any[] = [],
  simulatedNow: Date = new Date(),
  showRealNames: boolean = false
): NextTeachingDaySummary | null {
  const teacherId = teacher?.id;
  const boards = getTeacherActiveBoards(teacherId, teacher);
  if (!Array.isArray(boards) || boards.length === 0) return null;

  // Search upcoming 7 days starting from tomorrow
  for (let offset = 1; offset <= 7; offset++) {
    const targetDate = new Date(simulatedNow);
    targetDate.setDate(simulatedNow.getDate() + offset);
    const jsDay = targetDate.getDay();
    const dbDayOfWeek = jsDay === 0 ? 7 : jsDay;

    // Collect all matching boards for this weekday
    const matchingBoards = boards.filter((b: any) =>
      (b.dayOfWeek === dbDayOfWeek || b.day_of_week === dbDayOfWeek || Number(b.dayOfWeek) === dbDayOfWeek || Number(b.day_of_week) === dbDayOfWeek) &&
      Array.isArray(b.students) &&
      b.students.some((s: any) => !s.isBreak && (s.id || s.student_id || s.studentId || s.name || s.studentName || s.first_name))
    );

    if (matchingBoards.length > 0) {
      const allActiveSlots: any[] = [];
      matchingBoards.forEach((b: any) => {
        (b.students || []).forEach((s: any) => {
          if (!s.isBreak && (s.id || s.student_id || s.studentId || s.name || s.studentName || s.first_name)) {
            allActiveSlots.push({ ...s, defaultRoomName: b.roomName });
          }
        });
      });

      if (allActiveSlots.length === 0) continue;

      const formattedDate = targetDate.toLocaleDateString('de-DE', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
      });

      const dayName = targetDate.toLocaleDateString('de-DE', { weekday: 'long' });

      // Sort slots by time
      const sortedSlots = [...allActiveSlots].sort((a, b) => {
        const timeA = a.assignedTime || a.customStartTime || a.time || '99:99';
        const timeB = b.assignedTime || b.customStartTime || b.time || '99:99';
        return timeA.localeCompare(timeB);
      });

      const slots = sortedSlots.map((s: any) => {
        const time = (s.assignedTime || s.customStartTime || s.time || '').substring(0, 5);
        const studentId = s.student_id || s.studentId || s.id;
        const matchedStudent = (allStudents || []).find((st: any) => st.id === studentId);

        let rawName = '';
        if (matchedStudent) {
          rawName = `${matchedStudent.first_name || ''} ${matchedStudent.last_name || ''}`.trim() || matchedStudent.name || '';
        }
        if (!rawName) {
          rawName = `${s.first_name || ''} ${s.last_name || ''}`.trim() || s.name || s.studentName || 'Schüler';
        }

        const displayName = formatTagesKompassStudentName(matchedStudent || s, rawName);

        const instrument = s.instrument || s.fach || matchedStudent?.instrument || matchedStudent?.fach || 'Instrument';
        const room = s.room || s.roomName || s.defaultRoomName || 'Raum';

        return {
          time,
          studentName: displayName,
          instrument,
          room
        };
      });

      const firstStartTime = slots[0]?.time || '';
      const firstRoom = slots[0]?.room || '';

      return {
        dateStr: formattedDate,
        dayName,
        totalAppointments: slots.length,
        firstStartTime,
        firstRoom,
        slots
      };
    }
  }

  return null;
}

export interface TeacherHausaufgabenWidgetProps {
  teacher: any;
  activeStudent: any;
  activeTimelineSlot?: any;
  currentTimeStr?: string;
  activeGroupStudents: any[];
  selectedGroupStudentId: string | null;
  setSelectedGroupStudentId: (id: string | null) => void;
  allStudents: any[];
  bypassAbsenceView?: boolean;
  bypassSickView?: boolean;
  bypassAusfallView?: boolean;
  selectedStudentProfile: any;
  setSelectedStudentProfile: (s: any) => void;
  docStudent: any;
  setDocStudent: (s: any) => void;
  dynamicPrepMirror: any;
  setDynamicPrepMirror: React.Dispatch<React.SetStateAction<any>>;
  loadingPrepMirror: boolean;
  setLoadingPrepMirror: React.Dispatch<React.SetStateAction<boolean>>;
  briefingData: any;
  isFreeDay: boolean;
  isWeekend: boolean;
  isTourDemoScheduleActive: boolean;
  firstSlotStartStr: string;
  getSimulatedNow: () => Date;
  showRealNames: boolean;
  widgetState: any;
  relevantRoomIssuesToday?: any[];
  checkHasStudentQuestion?: (sId: string) => boolean;
  checkHasTodayAudio?: (sId: string) => boolean;
  quickAudioStudent?: any;
  setQuickAudioStudent?: (student: any) => void;
  onOpenStudio?: () => void;
  onOpenNotes?: () => void;
  onOpenToolbox?: () => void;
  onSwitchTab?: (tab: 'briefing' | 'notes' | 'toolbox' | 'studio') => void;
}

export const TeacherHausaufgabenWidget: React.FC<TeacherHausaufgabenWidgetProps> = ({
  teacher,
  activeStudent,
  activeTimelineSlot,
  currentTimeStr,
  activeGroupStudents,
  selectedGroupStudentId,
  setSelectedGroupStudentId,
  allStudents,
  bypassAbsenceView,
  bypassSickView,
  bypassAusfallView,
  selectedStudentProfile,
  setSelectedStudentProfile,
  docStudent,
  setDocStudent,
  dynamicPrepMirror,
  setDynamicPrepMirror,
  loadingPrepMirror,
  setLoadingPrepMirror,
  briefingData,
  isFreeDay,
  isWeekend,
  isTourDemoScheduleActive,
  firstSlotStartStr,
  getSimulatedNow,
  showRealNames,
  widgetState,
  relevantRoomIssuesToday,
  checkHasStudentQuestion,
  checkHasTodayAudio,
  quickAudioStudent,
  setQuickAudioStudent,
  onOpenStudio,
  onOpenNotes,
  onOpenToolbox
}) => {
  const [isCopyingPrevWeek, setIsCopyingPrevWeek] = useState(false);
  const [quickHomeworkText, setQuickHomeworkText] = useState('');
  const [isSavingQuickHw, setIsSavingQuickHw] = useState(false);
  const [showQuickAudioRecorder, setShowQuickAudioRecorder] = useState(false);
  const [playingAudioUrl, setPlayingAudioUrl] = useState<string | null>(null);
  const [showMondayPreview, setShowMondayPreview] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const prep = dynamicPrepMirror || briefingData?.prepMirror || null;

  // 🏛️ Real-time Homework In-Memory Synchronization (< 50ms Parity)
  useEffect(() => {
    const handleHwUpdate = (e: any) => {
      const updatedStudentId = e?.detail?.studentId;
      const isDeleted = Boolean(e?.detail?.deleted);
      if (updatedStudentId && (updatedStudentId === activeStudent?.id || updatedStudentId === prep?.studentId)) {
        const storageKey = `campus_homework_notes_${updatedStudentId}`;
        try {
          const raw = localStorage.getItem(storageKey);
          if (isDeleted || !raw) {
            setDynamicPrepMirror((prev: any) => {
              if (!prev) return prev;
              return {
                ...prev,
                currentWeekNotes: [],
                currentWeekItems: [],
                parsedCurrentLehrwerke: [],
                parsedCurrentSongs: [],
                currentRawSnapshotLwToken: undefined,
                currentRawSnapshotSongsToken: undefined
              };
            });
          } else {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              setDynamicPrepMirror((prev: any) => {
                if (!prev) return prev;
                return {
                  ...prev,
                  currentWeekNotes: parsed
                };
              });
            }
          }
        } catch {}
      }
    };

    let bc: BroadcastChannel | null = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        bc = new BroadcastChannel('campus_homework_bus');
        bc.onmessage = (event) => {
          const updatedStudentId = event.data?.studentId;
          const isDeleted = Boolean(event.data?.deleted || event.data?.type === 'HOMEWORK_DELETED');
          if (updatedStudentId && (updatedStudentId === activeStudent?.id || updatedStudentId === prep?.studentId)) {
            handleHwUpdate({ detail: { studentId: updatedStudentId, deleted: isDeleted } });
          }
        };
      } catch {}
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('campus_homework_updated', handleHwUpdate);
      window.addEventListener('campus_homework_notes_updated', handleHwUpdate);
      window.addEventListener('homework-updated', handleHwUpdate);
    }
    return () => {
      if (bc) {
        try { bc.close(); } catch {}
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener('campus_homework_updated', handleHwUpdate);
        window.removeEventListener('campus_homework_notes_updated', handleHwUpdate);
        window.removeEventListener('homework-updated', handleHwUpdate);
      }
    };
  }, [activeStudent?.id, prep?.studentId]);

  const nextDaySummary = useMemo(() => {
    const now = typeof getSimulatedNow === 'function' ? getSimulatedNow() : new Date();
    return resolveNextTeachingDaySummary(teacher, allStudents, now, showRealNames);
  }, [teacher, allStudents, getSimulatedNow, showRealNames]);

  // Determine authoritative 9-state state machine
  const currentState = useMemo<TagesKompassState>(() => {
    if (isTourDemoScheduleActive) return 'TOUR';
    if (isTeacherCurrentlyAbsent(teacher) && !(bypassAbsenceView || bypassSickView || bypassAusfallView)) {
      return 'ABWESENHEIT';
    }
    if (loadingPrepMirror) return 'HYDRATION';
    if (isWeekend || widgetState === 'WEEKEND') return 'WOCHENENDE';
    if (isFreeDay) return 'UNTERRICHTSFREI';
    if (widgetState === 'VORBEREITUNG') return 'VORBEREITUNG';
    if (widgetState === 'ACTIVE') {
      return prep ? 'ACTIVE' : 'PAUSE';
    }
    if (widgetState === 'FEIERABEND') return 'FEIERABEND';
    return 'FEIERABEND';
  }, [
    isTourDemoScheduleActive,
    teacher,
    bypassAbsenceView,
    bypassSickView,
    bypassAusfallView,
    loadingPrepMirror,
    isWeekend,
    widgetState,
    isFreeDay,
    prep
  ]);

  const handleTogglePlayAudio = (url: string) => {
    if (!url) return;
    if (playingAudioUrl === url) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setPlayingAudioUrl(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => setPlayingAudioUrl(null);
      audio.onerror = () => setPlayingAudioUrl(null);
      audio.play().catch(e => {
        console.warn('[TagesKompass] Audio playback error:', e);
        setPlayingAudioUrl(null);
      });
      setPlayingAudioUrl(url);
    }
  };

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const handleSaveQuickHomework = async (currentPrep: any, customNote?: string) => {
    const rawInput = (customNote || quickHomeworkText).trim();
    if (!rawInput || !currentPrep?.studentId) return;

    const isMicroScore = rawInput.startsWith('MICROSCORE:');
    const isAudio = rawInput.startsWith('AUDIO:');
    const isLoop = rawInput.startsWith('LOOP:');
    const textToSave = (isMicroScore || isAudio || isLoop) ? rawInput : sanitizeDidacticText(rawInput);
    if (!textToSave) return;

    setIsSavingQuickHw(true);
    try {
      const curWkNum = currentPrep.currentWeekNum;
      if (!curWkNum) return;

      const activeTId = teacher?.id;

      // 1. Fetch existing row to preserve snapshots if present
      const { data: existingRows, error: fetchErr } = await supabase
        .from('progress_matrix')
        .select('id, homework_notes')
        .eq('student_id', currentPrep.studentId)
        .eq('topic_name', `Hausaufgabe KW ${curWkNum}`)
        .limit(1);

      if (fetchErr) console.warn('[quickHw] fetch warning:', fetchErr);

      const existingPayload = existingRows?.[0]?.homework_notes
        ? parseHomeworkNotesPayload(existingRows[0].homework_notes)
        : null;

      const currentNotes = Array.isArray(currentPrep.currentWeekNotes)
        ? [...currentPrep.currentWeekNotes]
        : [];

      const existingMicroScores = existingPayload?.microScores?.map(m => m.rawToken) || [];
      const newMicroScores = isMicroScore ? [...existingMicroScores, rawInput] : existingMicroScores;

      const existingAudioTokens = existingPayload?.audioItems?.map(a => a.rawToken) || currentNotes.filter((n: string) => typeof n === 'string' && n.startsWith('AUDIO:'));
      let newAudioTokens = existingAudioTokens;
      if (isAudio) {
        const incomingUrl = rawInput.replace('AUDIO:', '').split('|')[0]?.replace(/^["']|["']$/g, '').trim();
        const filteredTokens = existingAudioTokens.filter((tok: string) => {
          const tokUrl = tok.replace('AUDIO:', '').split('|')[0]?.replace(/^["']|["']$/g, '').trim();
          return tokUrl !== incomingUrl;
        });
        newAudioTokens = [...filteredTokens, rawInput];
      }

      const newDidacticNotes = (!isMicroScore && !isAudio && !isLoop)
        ? (existingPayload && existingPayload.didacticNotes.length > 0
            ? [...existingPayload.didacticNotes, textToSave]
            : [...currentNotes.filter(isPureDidacticNote), textToSave])
        : (existingPayload?.didacticNotes || currentNotes.filter(isPureDidacticNote));

      // Build canonical payload preserving snapshots, audios and microscores
      const notesJson = buildHomeworkNotesPayload({
        didacticNotes: newDidacticNotes,
        rawSnapshotLwToken: existingPayload?.rawSnapshotLwToken || currentPrep.currentRawSnapshotLwToken || currentPrep.rawSnapshotLwToken,
        rawSnapshotSongsToken: existingPayload?.rawSnapshotSongsToken || currentPrep.currentRawSnapshotSongsToken || currentPrep.rawSnapshotSongsToken,
        audioTokens: newAudioTokens,
        loopTokens: existingPayload?.loopItems?.map(l => l.rawToken) || currentNotes.filter((n: string) => typeof n === 'string' && n.startsWith('LOOP:')),
        microScores: newMicroScores
      });

      if (existingRows && existingRows.length > 0) {
        const { error: updErr } = await supabase
          .from('progress_matrix')
          .update({
            homework_notes: notesJson,
            is_current_homework: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingRows[0].id);
        if (updErr) throw updErr;
      } else {
        const { error: insErr } = await supabase
          .from('progress_matrix')
          .insert({
            student_id: currentPrep.studentId,
            teacher_id: activeTId,
            topic_name: `Hausaufgabe KW ${curWkNum}`,
            status: 'IN_PROGRESS',
            is_current_homework: true,
            homework_notes: notesJson,
            teacher_notes: '',
            updated_at: new Date().toISOString()
          });
        if (insErr) throw insErr;
      }

      setDynamicPrepMirror((prev: any) => {
        if (!prev) return prev;
        const prevList = prev.currentWeekNotes || [];
        if (isAudio) {
          const incomingUrl = rawInput.replace('AUDIO:', '').split('|')[0]?.replace(/^["']|["']$/g, '').trim();
          const cleanPrev = prevList.filter((n: string) => {
            if (typeof n === 'string' && n.startsWith('AUDIO:')) {
              const u = n.replace('AUDIO:', '').split('|')[0]?.replace(/^["']|["']$/g, '').trim();
              return u !== incomingUrl;
            }
            return true;
          });
          return {
            ...prev,
            currentWeekNotes: [...cleanPrev, textToSave]
          };
        }
        return {
          ...prev,
          currentWeekNotes: [...prevList, textToSave]
        };
      });

      setQuickHomeworkText('');
      setShowQuickAudioRecorder(false);

      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(`campus_homework_notes_${currentPrep.studentId}`, notesJson);
        } catch {}
        window.dispatchEvent(new CustomEvent('campus_homework_updated', { detail: { studentId: currentPrep.studentId } }));
        window.dispatchEvent(new CustomEvent('campus_homework_notes_updated', { detail: { studentId: currentPrep.studentId } }));
        window.dispatchEvent(new CustomEvent('groovelab_student_prep_updated', { detail: { studentId: currentPrep.studentId } }));
        window.dispatchEvent(new CustomEvent('homework-updated', { detail: { studentId: currentPrep.studentId } }));
      }
    } catch (err: any) {
      console.error('[quickHw] Error saving quick homework:', err);
      alert('Fehler beim Speichern der Schnell-Hausaufgabe: ' + (err?.message || err));
    } finally {
      setIsSavingQuickHw(false);
    }
  };

  const handleDeleteHomework = async (currentPrep: any) => {
    if (!currentPrep?.studentId) return;
    const sId = currentPrep.studentId;
    const curWkNum = currentPrep.currentWeekNum;

    try {
      await deleteCurrentHomeworkAuthoritative(sId, curWkNum);

      setDynamicPrepMirror((prev: any) => {
        if (!prev) return prev;
        return {
          ...prev,
          currentWeekNotes: [],
          currentWeekItems: [],
          parsedCurrentLehrwerke: [],
          parsedCurrentSongs: [],
          currentRawSnapshotLwToken: undefined,
          currentRawSnapshotSongsToken: undefined
        };
      });
    } catch (err: any) {
      console.error('[handleDeleteHomework] Error deleting homework:', err);
      alert('Fehler beim Löschen der Hausaufgabe: ' + (err?.message || err));
    }
  };

  const handleDeleteAudioTrack = async (currentPrep: any, trackUrl: string) => {
    if (!currentPrep?.studentId || !trackUrl) return;
    try {
      const curWkNum = currentPrep.currentWeekNum;
      if (!curWkNum) return;

      const { data: existingRows } = await supabase
        .from('progress_matrix')
        .select('id, homework_notes')
        .eq('student_id', currentPrep.studentId)
        .eq('topic_name', `Hausaufgabe KW ${curWkNum}`)
        .limit(1);

      const existingPayload = existingRows?.[0]?.homework_notes
        ? parseHomeworkNotesPayload(existingRows[0].homework_notes)
        : null;

      const currentNotes = Array.isArray(currentPrep.currentWeekNotes)
        ? [...currentPrep.currentWeekNotes]
        : [];

      const remainingAudioTokens = (existingPayload?.audioItems || [])
        .filter(a => a.url !== trackUrl && !a.rawToken.includes(trackUrl))
        .map(a => a.rawToken);

      const remainingCurrentNotes = currentNotes.filter((n: string) => {
        if (typeof n !== 'string') return true;
        if (n.startsWith('AUDIO:')) {
          const u = n.replace('AUDIO:', '').split('|')[0]?.replace(/^["']|["']$/g, '').trim();
          return u !== trackUrl && !n.includes(trackUrl);
        }
        return true;
      });

      const notesJson = buildHomeworkNotesPayload({
        didacticNotes: existingPayload?.didacticNotes || currentNotes.filter(isPureDidacticNote),
        rawSnapshotLwToken: existingPayload?.rawSnapshotLwToken || currentPrep.currentRawSnapshotLwToken || currentPrep.rawSnapshotLwToken,
        rawSnapshotSongsToken: existingPayload?.rawSnapshotSongsToken || currentPrep.currentRawSnapshotSongsToken || currentPrep.rawSnapshotSongsToken,
        audioTokens: remainingAudioTokens,
        loopTokens: existingPayload?.loopItems?.map(l => l.rawToken) || currentNotes.filter((n: string) => typeof n === 'string' && n.startsWith('LOOP:')),
        microScores: existingPayload?.microScores?.map(m => m.rawToken) || [],
        studentQuestions: existingPayload?.studentQuestions?.map(q => q.rawToken || `STUDENT_QUESTION:${q.timestamp || ''}|${q.question}`) || []
      });

      if (existingRows && existingRows.length > 0) {
        await supabase
          .from('progress_matrix')
          .update({
            homework_notes: notesJson,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingRows[0].id);
      }

      setDynamicPrepMirror((prev: any) => {
        if (!prev) return prev;
        return {
          ...prev,
          currentWeekNotes: remainingCurrentNotes
        };
      });

      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(`campus_homework_notes_${currentPrep.studentId}`, notesJson);
        } catch {}
        window.dispatchEvent(new CustomEvent('campus_homework_updated', { detail: { studentId: currentPrep.studentId } }));
        window.dispatchEvent(new CustomEvent('campus_homework_notes_updated', { detail: { studentId: currentPrep.studentId } }));
        window.dispatchEvent(new CustomEvent('groovelab_student_prep_updated', { detail: { studentId: currentPrep.studentId } }));
        window.dispatchEvent(new CustomEvent('homework-updated', { detail: { studentId: currentPrep.studentId } }));
      }
    } catch (err) {
      console.error('[handleDeleteAudioTrack] Error deleting audio track:', err);
    }
  };

  const handleCopyPrevWeekToCurrent = async (currentPrep: any) => {
    if (!currentPrep?.studentId) return;
    setIsCopyingPrevWeek(true);
    try {
      const curWkNum = currentPrep.currentWeekNum;
      if (!curWkNum) return;

      const activeTId = teacher?.id;

      // Clone snapshots and didactic notes from prevWeek
      const cleanPrevNotes = Array.isArray(currentPrep.prevWeekNotes)
        ? currentPrep.prevWeekNotes.filter(isPureDidacticNote)
        : [];
      const audioTokens = Array.isArray(currentPrep.prevWeekNotes)
        ? currentPrep.prevWeekNotes.filter((n: string) => typeof n === 'string' && n.startsWith('AUDIO:'))
        : [];
      const loopTokens = Array.isArray(currentPrep.prevWeekNotes)
        ? currentPrep.prevWeekNotes.filter((n: string) => typeof n === 'string' && n.startsWith('LOOP:'))
        : [];
      const microScores = Array.isArray(currentPrep.prevWeekNotes)
        ? currentPrep.prevWeekNotes.filter((n: string) => typeof n === 'string' && n.startsWith('MICROSCORE:'))
        : [];

      const notesJson = buildHomeworkNotesPayload({
        didacticNotes: cleanPrevNotes,
        rawSnapshotLwToken: currentPrep.rawSnapshotLwToken,
        rawSnapshotSongsToken: currentPrep.rawSnapshotSongsToken,
        lehrwerke: currentPrep.parsedPrevLehrwerke,
        songs: currentPrep.parsedPrevSongs,
        audioTokens,
        loopTokens,
        microScores
      });

      // Check if current week row exists in progress_matrix
      const { data: existingRows, error: fetchErr } = await supabase
        .from('progress_matrix')
        .select('id')
        .eq('student_id', currentPrep.studentId)
        .eq('topic_name', `Hausaufgabe KW ${curWkNum}`)
        .limit(1);

      if (fetchErr) console.warn('[copyPrevWeek] fetch warning:', fetchErr);

      if (existingRows && existingRows.length > 0) {
        const { error: updErr } = await supabase
          .from('progress_matrix')
          .update({
            homework_notes: notesJson,
            is_current_homework: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingRows[0].id);
        if (updErr) throw updErr;
      } else {
        const { error: insErr } = await supabase
          .from('progress_matrix')
          .insert({
            student_id: currentPrep.studentId,
            teacher_id: activeTId,
            topic_name: `Hausaufgabe KW ${curWkNum}`,
            status: 'IN_PROGRESS',
            is_current_homework: true,
            homework_notes: notesJson,
            teacher_notes: '',
            updated_at: new Date().toISOString()
          });
        if (insErr) throw insErr;
      }

      // Re-activate prevWeekItems (books, songs) as current homework if present
      if (currentPrep.prevWeekItems && currentPrep.prevWeekItems.length > 0) {
        for (const it of currentPrep.prevWeekItems) {
          if (it.title && !it.isBook) {
            await supabase
              .from('progress_matrix')
              .update({ is_current_homework: true, updated_at: new Date().toISOString() })
              .eq('student_id', currentPrep.studentId)
              .eq('topic_name', it.title);
          }
        }
      }

      // Update dynamicPrepMirror state immediately with cloned items & tokens
      setDynamicPrepMirror((prev: any) => {
        if (!prev) return prev;
        return {
          ...prev,
          currentWeekNotes: currentPrep.prevWeekNotes,
          currentWeekItems: currentPrep.prevWeekItems && currentPrep.prevWeekItems.length > 0 ? currentPrep.prevWeekItems : (prev.currentWeekItems || []),
          currentRawSnapshotLwToken: currentPrep.rawSnapshotLwToken,
          currentRawSnapshotSongsToken: currentPrep.rawSnapshotSongsToken,
          parsedCurrentLehrwerke: currentPrep.parsedPrevLehrwerke,
          parsedCurrentSongs: currentPrep.parsedPrevSongs
        };
      });

      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(`campus_homework_notes_${currentPrep.studentId}`, notesJson);
        } catch {}
        window.dispatchEvent(new CustomEvent('campus_homework_updated', { detail: { studentId: currentPrep.studentId } }));
        window.dispatchEvent(new CustomEvent('campus_homework_notes_updated', { detail: { studentId: currentPrep.studentId } }));
        window.dispatchEvent(new CustomEvent('groovelab_student_prep_updated', { detail: { studentId: currentPrep.studentId } }));
        window.dispatchEvent(new CustomEvent('homework-updated', { detail: { studentId: currentPrep.studentId } }));
      }
    } catch (err: any) {
      console.error('[copyPrevWeek] Error copying homework:', err);
      alert('Fehler beim Übertragen der Hausaufgaben: ' + (err?.message || err));
    } finally {
      setIsCopyingPrevWeek(false);
    }
  };

  const handleOpenDocStudent = (studentOrPrep: any) => {
    const sId = studentOrPrep?.id || studentOrPrep?.studentId;
    const foundStud = allStudents.find(s => s.id === sId);
    const sName = studentOrPrep?.studentName || (foundStud ? `${foundStud.first_name || ''} ${foundStud.last_name || ''}`.trim() : 'Schüler');
    const safePhotoUrl = resolveCampusStudentAvatar({
      ...(foundStud || studentOrPrep || {}),
      role: 'student',
      instrument: foundStud?.instrument || studentOrPrep?.instrument || teacher?.instrument || 'Gitarre'
    });
    setDocStudent({
      ...(foundStud || {}),
      id: sId,
      first_name: sName.split(' ')[0] || foundStud?.first_name || 'Schüler',
      last_name: sName.split(' ').slice(1).join(' ') || foundStud?.last_name || '',
      photo_url: safePhotoUrl,
      avatar_url: safePhotoUrl,
      is_campus_active: foundStud ? foundStud.is_campus_active : Boolean(studentOrPrep?.is_campus_active),
      school_id: foundStud?.school_id || teacher?.school_id,
      schoolId: foundStud?.school_id || teacher?.school_id,
      schools: foundStud?.schools || (teacher as any)?.schools,
      school_name: foundStud?.schools?.name || foundStud?.school_name || 'Campus Musikschule'
    });
  };

  const handleOpenProfile = (studentOrPrep: any) => {
    const sId = studentOrPrep?.id || studentOrPrep?.studentId;
    const foundStud = allStudents.find(s => s.id === sId);
    const sName = studentOrPrep?.studentName || (foundStud ? `${foundStud.first_name || ''} ${foundStud.last_name || ''}`.trim() : 'Schüler');
    const safePhotoUrl = resolveCampusStudentAvatar({
      ...(foundStud || studentOrPrep || {}),
      role: 'student',
      instrument: foundStud?.instrument || studentOrPrep?.instrument || teacher?.instrument || 'Gitarre'
    });
    setSelectedStudentProfile({
      id: sId,
      first_name: sName.split(' ')[0] || foundStud?.first_name || 'Schüler',
      last_name: sName.split(' ').slice(1).join(' ') || foundStud?.last_name || '',
      photo_url: safePhotoUrl,
      avatar_url: safePhotoUrl
    });
  };

  // Derive active lesson numbers and room
  const { slotIdx, totalSlots, slotStartTime, slotEndTime, currentRoom } = useMemo(() => {
    const slotsWithStudents = briefingData?.timeline?.filter((s: any) =>
      (s.student || (s.students && s.students.length > 0)) &&
      !s.isBreak &&
      !s.is_room_booking &&
      !s.isRoomBooking &&
      !['canceled_by_student', 'teacher_ausfall', 'cancelled', 'canceled_by_teacher', 'canceled_by_teacher_ausfall', 'rescheduled_away'].includes(s.status)
    ) || [];
    let currentSlotIndex = -1;
    if (activeTimelineSlot) {
      currentSlotIndex = slotsWithStudents.findIndex((s: any) =>
        (activeTimelineSlot.id && s.id === activeTimelineSlot.id) ||
        (activeTimelineSlot.timeSlot && s.timeSlot === activeTimelineSlot.timeSlot)
      );
    }
    if (currentSlotIndex < 0 && activeStudent) {
      currentSlotIndex = slotsWithStudents.findIndex((s: any) =>
        s.student?.id === activeStudent?.id ||
        s.student?.name === activeStudent?.name ||
        s.students?.some((st: any) => st.id === activeStudent?.id)
      );
    }
    const activeSlot = slotsWithStudents[currentSlotIndex] || activeTimelineSlot || slotsWithStudents[0];
    const room = activeSlot?.room || activeSlot?.rooms?.name || 'Raum 4';
    const { startStr, endStr } = computeSlotStartAndEnd(activeSlot);
    return {
      slotIdx: currentSlotIndex >= 0 ? currentSlotIndex + 1 : 1,
      totalSlots: Math.max(slotsWithStudents.length, 1),
      slotStartTime: startStr,
      slotEndTime: endStr,
      currentRoom: room
    };
  }, [briefingData, activeStudent, activeTimelineSlot]);

  // Derive dynamic pause countdown and previous unfinished student
  const { pauseMinutesRemaining, nextPauseSlot, previousUnfinishedStudent } = useMemo(() => {
    const timeline = briefingData?.timeline;
    if (!Array.isArray(timeline) || timeline.length === 0) {
      return { pauseMinutesRemaining: undefined, nextPauseSlot: null, previousUnfinishedStudent: null };
    }

    const now = typeof getSimulatedNow === 'function' ? getSimulatedNow() : new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const activeSlots = timeline.filter((s: any) =>
      (s.student || (s.students && s.students.length > 0)) &&
      !s.isBreak &&
      !s.is_room_booking &&
      !s.isRoomBooking &&
      !['canceled_by_student', 'teacher_ausfall', 'cancelled', 'canceled_by_teacher', 'canceled_by_teacher_ausfall', 'rescheduled_away'].includes(s.status)
    );

    let upcomingSlot: any = null;
    let minDiff = Infinity;

    for (const slot of activeSlots) {
      const { startStr: timeStr } = computeSlotStartAndEnd(slot);
      if (timeStr && timeStr.includes(':')) {
        const [h, m] = timeStr.split(':').map(Number);
        const slotMinutes = h * 60 + m;
        const diff = slotMinutes - currentMinutes;
        if (diff > 0 && diff < minDiff) {
          minDiff = diff;
          upcomingSlot = slot;
        }
      }
    }

    let prevSlot: any = null;
    let maxPastMinutes = -1;

    for (const slot of activeSlots) {
      const { endStr } = computeSlotStartAndEnd(slot);
      if (endStr && endStr.includes(':')) {
        const [h, m] = endStr.split(':').map(Number);
        const endMinutes = h * 60 + m;
        if (endMinutes <= currentMinutes && endMinutes > maxPastMinutes) {
          maxPastMinutes = endMinutes;
          prevSlot = slot;
        }
      }
    }

    let unfinishedPrevStudent: any = null;
    if (prevSlot && prevSlot.student) {
      const prevStudentId = prevSlot.student.id;
      if (prep && prep.studentId === prevStudentId) {
        if (!prep.currentWeekNotes || prep.currentWeekNotes.length === 0) {
          unfinishedPrevStudent = prevSlot.student;
        }
      } else {
        unfinishedPrevStudent = prevSlot.student;
      }
    }

    return {
      pauseMinutesRemaining: minDiff !== Infinity ? minDiff : undefined,
      nextPauseSlot: upcomingSlot,
      previousUnfinishedStudent: unfinishedPrevStudent
    };
  }, [briefingData, getSimulatedNow, prep, currentTimeStr]);



  return (
    <div
      className="tageskompass-surface"
      style={{
        width: '100%',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        background: 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRadius: '24px',
        border: '1px solid rgba(226, 232, 240, 0.8)',
        boxShadow: '0 8px 30px -4px rgba(15, 23, 42, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.9)',
        padding: (typeof window !== 'undefined' && window.innerWidth < 768) ? '16px 14px' : '20px',
        opacity: 1,
        boxSizing: 'border-box',
        gap: '16px'
      }}
    >
      {/* 0,1% Goldstandard Tages-Kompass 2027 Host (Zustand 1, 2, 3) */}
      <TagesKompassHost
        currentState={currentState}
        teacher={teacher}
        activeStudent={activeStudent}
        activeGroupStudents={activeGroupStudents}
        prep={prep}
        briefingData={briefingData}
        slotStartTime={slotStartTime}
        slotEndTime={slotEndTime}
        currentRoom={currentRoom}
        slotIdx={slotIdx}
        totalSlots={totalSlots}
        pauseMinutesRemaining={pauseMinutesRemaining}
        nextPauseSlot={nextPauseSlot}
        firstSlotStartStr={firstSlotStartStr}
        nextDaySummary={nextDaySummary}
        playingAudioUrl={playingAudioUrl}
        onTogglePlayAudio={handleTogglePlayAudio}
        onSaveQuickHomework={handleSaveQuickHomework}
        onDeleteHomework={handleDeleteHomework}
        onDeleteAudioTrack={handleDeleteAudioTrack}
        onSaveCatchUpHomework={async (studentId, textOrAudio) => {
          const fakePrep = {
            studentId,
            currentWeekNum: prep?.currentWeekNum || 40,
            currentWeekNotes: [],
            currentWeekItems: []
          };
          await handleSaveQuickHomework(fakePrep as any, textOrAudio);
        }}
        onOpenStudio={onOpenStudio}
        onOpenToolbox={onOpenToolbox}
        onOpenNotes={onOpenNotes}
        onOpenQuickModal={(stud) => {
          if (setQuickAudioStudent) setQuickAudioStudent(stud || activeStudent);
        }}
        onOpenDocument={(stud) => {
          if (setDocStudent) setDocStudent(stud || activeStudent);
        }}
        urgentCancellationsCount={relevantRoomIssuesToday?.length || 0}
      />
    </div>
  );
};
