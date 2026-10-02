import React, { useState, useRef, useEffect, useMemo } from 'react';
import { getDailyQuote } from '@groovelab/shared';
import { supabase } from '../../lib/supabase';
import { getTeacherActiveBoards } from './hooks/useTeacherTagesplan';
import { isTeacherCurrentlyAbsent } from '../../utils/teacherAbsenceHelper';
import {
  parseHomeworkNotesPayload,
  buildHomeworkNotesPayload,
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
      if (updatedStudentId && (updatedStudentId === activeStudent?.id || updatedStudentId === prep?.studentId)) {
        const storageKey = `campus_homework_notes_${updatedStudentId}`;
        try {
          const raw = localStorage.getItem(storageKey);
          if (raw) {
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

    if (typeof window !== 'undefined') {
      window.addEventListener('campus_homework_updated', handleHwUpdate);
      window.addEventListener('campus_homework_notes_updated', handleHwUpdate);
      window.addEventListener('homework-updated', handleHwUpdate);
    }
    return () => {
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
    const textToSave = sanitizeDidacticText(customNote || quickHomeworkText);
    if (!textToSave || !currentPrep?.studentId) return;
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

      const newDidacticNotes = existingPayload && existingPayload.didacticNotes.length > 0
        ? [...existingPayload.didacticNotes, textToSave]
        : [...currentNotes.filter(isPureDidacticNote), textToSave];

      // Build canonical payload preserving snapshots and audios
      const notesJson = buildHomeworkNotesPayload({
        didacticNotes: newDidacticNotes,
        rawSnapshotLwToken: existingPayload?.rawSnapshotLwToken || currentPrep.currentRawSnapshotLwToken || currentPrep.rawSnapshotLwToken,
        rawSnapshotSongsToken: existingPayload?.rawSnapshotSongsToken || currentPrep.currentRawSnapshotSongsToken || currentPrep.rawSnapshotSongsToken,
        audioTokens: existingPayload?.audioItems.map(a => a.rawToken) || currentNotes.filter((n: string) => typeof n === 'string' && n.startsWith('AUDIO:')),
        loopTokens: existingPayload?.loopItems.map(l => l.rawToken) || currentNotes.filter((n: string) => typeof n === 'string' && n.startsWith('LOOP:'))
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
        return {
          ...prev,
          currentWeekNotes: [...(prev.currentWeekNotes || []), textToSave]
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

      const notesJson = buildHomeworkNotesPayload({
        didacticNotes: cleanPrevNotes,
        rawSnapshotLwToken: currentPrep.rawSnapshotLwToken,
        rawSnapshotSongsToken: currentPrep.rawSnapshotSongsToken,
        lehrwerke: currentPrep.parsedPrevLehrwerke,
        songs: currentPrep.parsedPrevSongs,
        audioTokens,
        loopTokens
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
    setDocStudent({
      ...(foundStud || {}),
      id: sId,
      first_name: sName.split(' ')[0] || foundStud?.first_name || 'Schüler',
      last_name: sName.split(' ').slice(1).join(' ') || foundStud?.last_name || '',
      photo_url: (foundStud?.photo_url && !foundStud.photo_url.includes('avatar_ghost')) ? foundStud.photo_url : (studentOrPrep?.photo_url && !studentOrPrep.photo_url.includes('avatar_ghost') ? studentOrPrep.photo_url : '/avatars/gitarre_avatar_new.png'),
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
    setSelectedStudentProfile({
      id: sId,
      first_name: sName.split(' ')[0] || foundStud?.first_name || 'Schüler',
      last_name: sName.split(' ').slice(1).join(' ') || foundStud?.last_name || '',
      photo_url: (foundStud?.photo_url && !foundStud.photo_url.includes('avatar_ghost')) ? foundStud.photo_url : (studentOrPrep?.photo_url && !studentOrPrep.photo_url.includes('avatar_ghost') ? studentOrPrep.photo_url : '/avatars/gitarre_avatar_new.png')
    });
  };

  // Derive active lesson numbers and room
  const { slotIdx, totalSlots, slotStartTime, slotEndTime, currentRoom } = useMemo(() => {
    const slotsWithStudents = briefingData?.timeline?.filter((s: any) => s.student && !s.isBreak && s.status !== 'cancelled' && s.status !== 'canceled_by_student' && s.status !== 'canceled_by_teacher') || [];
    const currentSlotIndex = slotsWithStudents.findIndex((s: any) => s.student?.id === activeStudent?.id || s.student?.name === activeStudent?.name);
    const activeSlot = slotsWithStudents[currentSlotIndex] || slotsWithStudents[0];
    const room = activeSlot?.room || activeSlot?.rooms?.name || 'Raum 4';
    return {
      slotIdx: currentSlotIndex >= 0 ? currentSlotIndex + 1 : 1,
      totalSlots: Math.max(slotsWithStudents.length, 1),
      slotStartTime: activeSlot?.start_time?.substring(0, 5) || activeSlot?.timeSlot?.split('-')?.[0]?.trim() || '13:45',
      slotEndTime: activeSlot?.end_time?.substring(0, 5) || activeSlot?.timeSlot?.split('-')?.[1]?.trim() || '15:15',
      currentRoom: room
    };
  }, [briefingData, activeStudent]);

  // Derive dynamic pause countdown and previous unfinished student
  const { pauseMinutesRemaining, nextPauseSlot, previousUnfinishedStudent } = useMemo(() => {
    const timeline = briefingData?.timeline;
    if (!Array.isArray(timeline) || timeline.length === 0) {
      return { pauseMinutesRemaining: undefined, nextPauseSlot: null, previousUnfinishedStudent: null };
    }

    const now = typeof getSimulatedNow === 'function' ? getSimulatedNow() : new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const activeSlots = timeline.filter((s: any) => s.student && !s.isBreak && s.status !== 'cancelled' && s.status !== 'canceled_by_student' && s.status !== 'canceled_by_teacher');

    let upcomingSlot: any = null;
    let minDiff = Infinity;

    for (const slot of activeSlots) {
      const timeStr = slot.start_time?.substring(0, 5) || slot.timeSlot?.split('-')?.[0]?.trim();
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
      const endStr = slot.end_time?.substring(0, 5) || slot.timeSlot?.split('-')?.[1]?.trim();
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
  }, [briefingData, getSimulatedNow, prep]);



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
