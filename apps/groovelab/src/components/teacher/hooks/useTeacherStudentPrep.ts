import { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../../../lib/supabase';
import { maskLastName } from '../../../utils/nameHelper';
import { getISOWeekRaw, getItemWeek } from '../utils/teacherDashboardUtils';
import { parseHomeworkNotesPayload } from '../../../utils/homeworkSnapshotHelper';

// 🏛️ Tier-1 L1-Cache Hydration: Sofortige 0ms-Sichtbarkeit des Tages-Kompasses
export const readInitialStudentPrepMirror = (studentId?: string, weekStr?: string) => {
  if (typeof window === 'undefined' || !studentId) return null;
  try {
    if (weekStr) {
      const raw = localStorage.getItem(`groovelab_student_prep_${studentId}_${weekStr}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.studentId === studentId) return parsed;
      }
    }
    const latestRaw = localStorage.getItem(`groovelab_student_prep_${studentId}_latest`);
    if (latestRaw) {
      const parsedLatest = JSON.parse(latestRaw);
      if (parsedLatest && parsedLatest.studentId === studentId) return parsedLatest;
    }
  } catch (e) {}
  return null;
};

export interface UseTeacherStudentPrepProps {
  activeTimelineSlot: any;
  timeline?: any[];
  isTodayHoliday?: boolean;
  showRealNames?: boolean;
  now: Date;
}

export function useTeacherStudentPrep({
  activeTimelineSlot,
  timeline = [],
  isTodayHoliday = false,
  showRealNames = false,
  now
}: UseTeacherStudentPrepProps) {
  const [selectedGroupStudentId, setSelectedGroupStudentId] = useState<string | null>(null);
  const prepCacheMemoryRef = useRef<Map<string, any>>(new Map());
  const [dynamicPrepMirror, setDynamicPrepMirror] = useState<any>(null);
  const [loadingPrepMirror, setLoadingPrepMirror] = useState(false);

  const isWeekend = useMemo(() => {
    const day = now.getDay();
    return day === 0 || day === 6;
  }, [now]);

  const currentTimeStr = useMemo(() => {
    return now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  }, [now]);

  const isFreeDay = useMemo(() => {
    if (isWeekend) return false;
    if (isTodayHoliday) return true;
    return (!timeline || timeline.length === 0);
  }, [isWeekend, isTodayHoliday, timeline]);

  const firstLessonStartMin = useMemo(() => {
    if (!timeline || timeline.length === 0) return null;
    const sorted = [...timeline]
      .filter((slot: any) => slot.student && slot.status !== 'canceled_by_student' && slot.status !== 'canceled_by_teacher' && slot.status !== 'cancelled')
      .sort((a: any, b: any) => (a.timeSlot || '').localeCompare(b.timeSlot || ''));
    
    if (sorted.length === 0) return null;
    const firstSlotStart = sorted[0].timeSlot;
    if (!firstSlotStart) return null;
    const [h, m] = firstSlotStart.split(':').map(Number);
    return h * 60 + m;
  }, [timeline]);

  const lastLessonEndMin = useMemo(() => {
    if (!timeline || timeline.length === 0) return null;
    const sorted = [...timeline]
      .filter((slot: any) => slot.student && slot.status !== 'canceled_by_student' && slot.status !== 'canceled_by_teacher' && slot.status !== 'cancelled')
      .sort((a: any, b: any) => (a.timeSlot || '').localeCompare(b.timeSlot || ''));

    if (sorted.length === 0) return null;
    const lastSlot = sorted[sorted.length - 1];
    const lastSlotStart = lastSlot.timeSlot;
    if (!lastSlotStart) return null;
    const [h, m] = lastSlotStart.split(':').map(Number);
    return h * 60 + m + (lastSlot.duration || 30);
  }, [timeline]);

  const currentTimeMin = useMemo(() => {
    if (!currentTimeStr) return 0;
    const [h, m] = currentTimeStr.split(':').map(Number);
    return h * 60 + m;
  }, [currentTimeStr]);

  const firstSlotStartStr = useMemo(() => {
    if (!timeline || timeline.length === 0) return '';
    const sorted = [...timeline]
      .filter((slot: any) => slot.student && slot.status !== 'canceled_by_student' && slot.status !== 'canceled_by_teacher' && slot.status !== 'cancelled')
      .sort((a: any, b: any) => (a.timeSlot || '').localeCompare(b.timeSlot || ''));
    return sorted.length > 0 ? sorted[0].timeSlot : '';
  }, [timeline]);

  const widgetState = useMemo<'ACTIVE' | 'VORBEREITUNG' | 'FEIERABEND' | 'WEEKEND'>(() => {
    if (isWeekend) return 'WEEKEND';
    if (firstLessonStartMin === null || lastLessonEndMin === null) return 'FEIERABEND';
    
    const prepCutoffMin = firstLessonStartMin - 15;
    
    if (currentTimeMin < prepCutoffMin) {
      return 'VORBEREITUNG';
    } else if (currentTimeMin >= prepCutoffMin && currentTimeMin < lastLessonEndMin) {
      return 'ACTIVE';
    } else {
      return 'FEIERABEND';
    }
  }, [isWeekend, firstLessonStartMin, lastLessonEndMin, currentTimeMin]);

  const activeGroupStudents = useMemo(() => {
    return activeTimelineSlot?.students || [];
  }, [activeTimelineSlot]);

  const activeStudent = useMemo(() => {
    if (activeGroupStudents.length > 0) {
      if (selectedGroupStudentId && selectedGroupStudentId !== 'both') {
        const found = activeGroupStudents.find((s: any) => s.id === selectedGroupStudentId);
        if (found) return found;
      }
      return activeGroupStudents[0];
    }
    return activeTimelineSlot?.student || null;
  }, [activeGroupStudents, selectedGroupStudentId, activeTimelineSlot]);

  useEffect(() => {
    if (!activeStudent?.id) {
      setDynamicPrepMirror(null);
      return;
    }

    const studentId = activeStudent.id;
    const currentWeekStr = getISOWeekRaw(now, 1);

    // 🏛️ Tier-1 Instant Hydration: Memory Cache & LocalStorage
    let cachedPrep = prepCacheMemoryRef.current.get(studentId);
    if (!cachedPrep) {
      cachedPrep = readInitialStudentPrepMirror(studentId, currentWeekStr);
      if (cachedPrep) {
        prepCacheMemoryRef.current.set(studentId, cachedPrep);
      }
    }

    if (cachedPrep) {
      setDynamicPrepMirror(cachedPrep);
      setLoadingPrepMirror(false); // 0 ms instant paint!
    } else {
      setLoadingPrepMirror(true);
    }

    let isCancelled = false;

    const loadPrepForStudent = async () => {
      try {
        const [avatarRes, progressRes, matrixRes] = await Promise.all([
          supabase
            .from('avatars')
            .select('evolution_level, xp, avatar_style, streak_flame')
            .eq('user_id', studentId)
            .maybeSingle(),
          supabase
            .from('user_progress')
            .select(`
              current_level,
              stage_ready_badge,
              last_updated,
              exercises (title, description)
            `)
            .eq('user_id', studentId)
            .order('last_updated', { ascending: false })
            .limit(3),
          supabase
            .from('progress_matrix')
            .select('*')
            .eq('student_id', studentId)
            .order('updated_at', { ascending: false })
        ]);

        if (isCancelled) return;

        const studentAvatar = avatarRes.data;
        const recentProgress = progressRes.data;
        
        const uniqueMatrixItemsMap = new Map<string, any>();
        (matrixRes.data || []).forEach((item: any) => {
          const name = (item.topic_name || '').trim().toLowerCase();
          if (name && !uniqueMatrixItemsMap.has(name)) {
            uniqueMatrixItemsMap.set(name, item);
          }
        });
        const matrixItems = Array.from(uniqueMatrixItemsMap.values());

        const verifiedSongs = (recentProgress || []).map((p: any) => ({
          title: p.exercises?.title || 'Übungssong',
          status: p.stage_ready_badge ? 'verifiziert' : 'in_progress',
          level: p.current_level || 1,
          note: p.exercises?.description || ''
        }));

        const currentWeekStr = getISOWeekRaw(now, 1);
        const prevWeekDate = new Date(now);
        prevWeekDate.setDate(prevWeekDate.getDate() - 7);
        const prevWeekStr = getISOWeekRaw(prevWeekDate, 1);

        const currentWeekNotesItem = matrixItems.find(item => 
          item.topic_name.startsWith('Hausaufgabe KW ') && 
          (getItemWeek(item) === currentWeekStr || (item.updated_at && getISOWeekRaw(item.updated_at, 1) === currentWeekStr))
        );

        const prevWeekNotesItem = matrixItems.find(item => 
          item.topic_name.startsWith('Hausaufgabe KW ') && 
          item.updated_at && 
          getISOWeekRaw(item.updated_at, 1) === prevWeekStr
        );

        // Parse Snapshots, Audios & Didactic Notes via SSOT Engine
        const currentWeekParsed = parseHomeworkNotesPayload(currentWeekNotesItem?.homework_notes);
        const prevWeekParsed = parseHomeworkNotesPayload(prevWeekNotesItem?.homework_notes);

        // 1. Standalone progress items (legacy / direct items)
        const currentStandaloneItems = matrixItems.filter(item => 
          !item.topic_name.startsWith('Hausaufgabe KW ') && 
          item.status !== 'MASTERED' && 
          item.status !== 'THEORY_DONE' && 
          item.is_current_homework
        );

        const prevStandaloneItems = matrixItems.filter(item => 
          !item.topic_name.startsWith('Hausaufgabe KW ') && 
          item.status !== 'MASTERED' && 
          item.status !== 'THEORY_DONE' && 
          item.updated_at && 
          getISOWeekRaw(item.updated_at, 1) === prevWeekStr
        );

        // 2. Hydrated merged Lehrwerke, Songs & Items
        const currentWeekItems = [
          ...currentWeekParsed.lehrwerke.map(lw => ({
            title: lw.title,
            bookTitle: lw.title,
            pages: lw.pages,
            formattedPages: lw.formattedPages,
            bookColor: lw.bookColor,
            notes: lw.notes,
            status: lw.status,
            isBook: true as const
          })),
          ...currentWeekParsed.songs.map(s => ({
            title: s.title,
            topic_name: s.topic_name,
            status: s.status,
            recording_url: s.recording_url,
            isSong: true as const
          })),
          ...currentStandaloneItems.map(item => ({
            title: item.topic_name,
            status: item.status
          }))
        ];

        const prevWeekItems = [
          ...prevWeekParsed.lehrwerke.map(lw => ({
            title: lw.title,
            bookTitle: lw.title,
            pages: lw.pages,
            formattedPages: lw.formattedPages,
            bookColor: lw.bookColor,
            notes: lw.notes,
            status: lw.status,
            isBook: true as const
          })),
          ...prevWeekParsed.songs.map(s => ({
            title: s.title,
            topic_name: s.topic_name,
            status: s.status,
            recording_url: s.recording_url,
            isSong: true as const
          })),
          ...prevStandaloneItems.map(item => ({
            title: item.topic_name,
            status: item.status
          }))
        ];

        // 3. Audio & Didactic Notes without technical JSON or snapshot leakage
        const prevWeekNotes = [
          ...prevWeekParsed.audioItems.map(a => a.rawToken),
          ...prevWeekParsed.loopItems.map(l => l.rawToken),
          ...prevWeekParsed.didacticNotes
        ];

        const currentWeekNotes = currentWeekNotesItem 
          ? [
              ...currentWeekParsed.audioItems.map(a => a.rawToken),
              ...currentWeekParsed.loopItems.map(l => l.rawToken),
              ...currentWeekParsed.didacticNotes
            ]
          : (currentWeekItems.length > 0 && prevWeekNotes.length > 0 ? prevWeekNotes : []);

        // 🛡️ Privacy Invariant (DSGVO Art. 25): !showRealNames triggers privacy masking ("M.")
        const rawStudentName = activeStudent.first_name 
          ? `${activeStudent.first_name} ${maskLastName(activeStudent.last_name, !showRealNames)}`.trim()
          : (activeStudent.name || 'Schüler');

        const prepPayload = {
          studentId,
          studentName: rawStudentName,
          timeSlot: activeTimelineSlot?.timeSlot || timeline?.find((s: any) => s.student?.id === studentId)?.timeSlot || '',
          streakCount: studentAvatar?.streak_flame || 0,
          evolutionLevel: studentAvatar?.evolution_level || 1,
          verifiedSongs,
          currentWeekNum: currentWeekStr.split('-W')[1] || '',
          currentWeekItems,
          currentWeekNotes,
          prevWeekNum: prevWeekStr.split('-W')[1] || '',
          prevWeekItems,
          prevWeekNotes,
          rawSnapshotLwToken: prevWeekParsed.rawSnapshotLwToken,
          rawSnapshotSongsToken: prevWeekParsed.rawSnapshotSongsToken,
          currentRawSnapshotLwToken: currentWeekParsed.rawSnapshotLwToken,
          currentRawSnapshotSongsToken: currentWeekParsed.rawSnapshotSongsToken,
          parsedPrevLehrwerke: prevWeekParsed.lehrwerke,
          parsedPrevSongs: prevWeekParsed.songs,
          parsedCurrentLehrwerke: currentWeekParsed.lehrwerke,
          parsedCurrentSongs: currentWeekParsed.songs
        };

        if (!isCancelled) {
          setDynamicPrepMirror(prepPayload);
          prepCacheMemoryRef.current.set(studentId, prepPayload);
          try {
            localStorage.setItem(`groovelab_student_prep_${studentId}_${currentWeekStr}`, JSON.stringify(prepPayload));
            localStorage.setItem(`groovelab_student_prep_${studentId}_latest`, JSON.stringify(prepPayload));
          } catch (e) {}
        }

        // 🏛️ Low-Priority Background Prefetch for other students of today's timeline
        const otherStudents = (timeline || [])
          .map((s: any) => s.student)
          .filter((s: any) => s && s.id && s.id !== studentId && !prepCacheMemoryRef.current.has(s.id));

        if (otherStudents.length > 0 && typeof window !== 'undefined') {
          setTimeout(() => {
            for (const other of otherStudents) {
              if (prepCacheMemoryRef.current.has(other.id)) continue;
              const cached = readInitialStudentPrepMirror(other.id, currentWeekStr);
              if (cached) {
                prepCacheMemoryRef.current.set(other.id, cached);
              }
            }
          }, 300);
        }
      } catch (e) {
        console.error('Error loading dynamic prep:', e);
      } finally {
        if (!isCancelled) setLoadingPrepMirror(false);
      }
    };

    loadPrepForStudent();

    return () => {
      isCancelled = true;
    };
  }, [activeStudent?.id, timeline, activeTimelineSlot?.timeSlot, showRealNames, now]);

  return {
    widgetState,
    currentTimeStr,
    isFreeDay,
    isWeekend,
    firstSlotStartStr,
    activeGroupStudents,
    activeStudent,
    dynamicPrepMirror,
    setDynamicPrepMirror,
    loadingPrepMirror,
    setLoadingPrepMirror,
    selectedGroupStudentId,
    setSelectedGroupStudentId
  };
}
