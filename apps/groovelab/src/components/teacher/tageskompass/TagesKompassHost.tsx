import React, { useMemo } from 'react';
import { 
  TagesKompassState,
  TagesKompassTeacher,
  TagesKompassStudent,
  TagesKompassPrep,
  TagesKompassBriefingData,
  TagesKompassTimelineSlot,
  NextTeachingDaySummary
} from './types';
import { TagesKompassPreflight } from './TagesKompassPreflight';
import { TagesKompassLive } from './TagesKompassLive';
import { TagesKompassWrapUp } from './TagesKompassWrapUp';
import { TagesKompassOffDayState } from './TagesKompassOffDayState';

export interface TagesKompassHostProps {
  currentState: TagesKompassState;
  teacher: TagesKompassTeacher;
  activeStudent: TagesKompassStudent | null;
  activeGroupStudents?: TagesKompassStudent[];
  prep: TagesKompassPrep | null;
  briefingData: TagesKompassBriefingData | null;
  slotStartTime?: string;
  slotEndTime?: string;
  currentRoom?: string;
  slotIdx?: number;
  totalSlots?: number;
  pauseMinutesRemaining?: number;
  nextPauseSlot?: TagesKompassTimelineSlot | null;
  firstSlotStartStr?: string;
  nextDaySummary?: NextTeachingDaySummary | null;
  playingAudioUrl?: string | null;
  onTogglePlayAudio?: (url: string) => void;
  onSaveQuickHomework: (prep: TagesKompassPrep, customNote?: string) => Promise<void>;
  onDeleteHomework?: (prep: TagesKompassPrep) => Promise<void>;
  onDeleteAudioTrack?: (prep: TagesKompassPrep, url: string) => Promise<void>;
  onSaveCatchUpHomework?: (studentId: string, textOrAudio: string, isAudio?: boolean) => Promise<void>;
  onOpenStudio?: () => void;
  onOpenToolbox?: () => void;
  onOpenNotes?: () => void;
  onOpenQuickModal?: (student?: any) => void;
  onOpenDocument?: (student?: any) => void;
  urgentCancellationsCount?: number;
}

export const TagesKompassHost: React.FC<TagesKompassHostProps> = ({
  currentState,
  teacher,
  activeStudent,
  activeGroupStudents = [],
  prep,
  briefingData,
  slotStartTime = '13:45',
  slotEndTime = '14:15',
  currentRoom = 'Raum 4',
  slotIdx = 1,
  totalSlots = 7,
  pauseMinutesRemaining = 0,
  nextPauseSlot,
  firstSlotStartStr = '13:15',
  nextDaySummary,
  playingAudioUrl,
  onTogglePlayAudio,
  onSaveQuickHomework,
  onDeleteHomework,
  onDeleteAudioTrack,
  onSaveCatchUpHomework,
  onOpenStudio,
  onOpenToolbox,
  onOpenNotes,
  onOpenQuickModal,
  onOpenDocument,
  urgentCancellationsCount = 0
}) => {
  const timeline = briefingData?.timeline || [];

  // Berechne ersten Schüler des Tages für Zustand 1
  const firstSlot = timeline.find(s => !s.isBreak && s.student);
  const firstStudent = firstSlot?.student || null;

  // Berechne Folgetermin für Zustand 2 Smart Transition
  const currentSlotIndex = timeline.findIndex(s => s.start_time === slotStartTime || s.timeSlot === slotStartTime);
  const nextSlot = currentSlotIndex >= 0 && currentSlotIndex + 1 < timeline.length
    ? timeline.slice(currentSlotIndex + 1).find(s => !s.isBreak && s.student)
    : null;

  // Letzte Endzeit des Tages
  const lastSlot = [...timeline].reverse().find(s => !s.isBreak && (s.end_time || s.timeSlot));
  const lastSlotEndStr = lastSlot?.end_time || lastSlot?.timeSlot?.split('-')?.[1]?.trim() || '16:45';

  // Berechne unfertige Schüler für Zustand 3 (Feierabend)
  const unfinishedStudents = useMemo(() => {
    const list: TagesKompassStudent[] = [];
    const seenIds = new Set<string>();

    timeline.forEach(slot => {
      if (slot.isBreak || !slot.student) return;
      const sId = slot.student.id || slot.student.studentId;
      if (!sId || seenIds.has(sId)) return;
      seenIds.add(sId);

      // Prüfe, ob für diesen Schüler heute bereits eine Hausaufgabe erfasst wurde
      // (z. B. wenn prep für diesen Schüler existiert und currentWeekNotes hat)
      if (prep && (prep.studentId === sId) && prep.currentWeekNotes && prep.currentWeekNotes.length > 0) {
        return; // Hat Hausaufgabe
      }
      
      // Falls im BriefingData Vermerk vorliegt
      const slotHasNote = Boolean((slot as any).hasCurrentHomework || (slot as any).hasHomework);
      if (!slotHasNote) {
        list.push(slot.student);
      }
    });

    return list;
  }, [timeline, prep]);

  // Fallback-Zustände (Wochenende, Feiertag, Abwesenheit) - 0,1% Goldstandard
  if (currentState === 'WOCHENENDE' || currentState === 'UNTERRICHTSFREI' || currentState === 'ABWESENHEIT') {
    return (
      <TagesKompassOffDayState
        currentState={currentState}
        teacher={teacher}
        nextDaySummary={nextDaySummary}
      />
    );
  }

  // 1. ZUSTAND 1: Morgen vor der 1. Einheit (Pre-Flight)
  if (currentState === 'VORBEREITUNG') {
    return (
      <TagesKompassPreflight
        teacher={teacher}
        totalSlots={totalSlots}
        firstSlotStartStr={firstSlotStartStr}
        lastSlotEndStr={lastSlotEndStr}
        currentRoom={currentRoom}
        firstStudent={firstStudent}
        firstStudentPrep={firstStudent?.id === prep?.studentId ? prep : null}
        playingAudioUrl={playingAudioUrl}
        onTogglePlayAudio={onTogglePlayAudio}
        urgentCancellationsCount={urgentCancellationsCount}
      />
    );
  }

  // 2. ZUSTAND 3: Feierabend (Nach letztem Schüler)
  if (currentState === 'FEIERABEND') {
    return (
      <TagesKompassWrapUp
        teacher={teacher}
        totalSlots={totalSlots}
        unfinishedStudents={unfinishedStudents}
        nextDaySummary={nextDaySummary}
        onSaveHomeworkForStudent={onSaveCatchUpHomework || (async () => {})}
        onOpenQuickModal={onOpenQuickModal}
      />
    );
  }

  // 3. ZUSTAND 2: Live Focus Session (oder Pause)
  return (
    <TagesKompassLive
      isPause={currentState === 'PAUSE'}
      pauseMinutesRemaining={pauseMinutesRemaining}
      nextPauseSlot={nextPauseSlot}
      activeStudent={activeStudent}
      activeGroupStudents={activeGroupStudents}
      prep={prep}
      slotStartTime={slotStartTime}
      slotEndTime={slotEndTime}
      currentRoom={currentRoom}
      slotIdx={slotIdx}
      totalSlots={totalSlots}
      nextSlot={nextSlot}
      playingAudioUrl={playingAudioUrl}
      onTogglePlayAudio={onTogglePlayAudio}
      onSaveQuickHomework={onSaveQuickHomework}
      onDeleteHomework={onDeleteHomework}
      onDeleteAudioTrack={onDeleteAudioTrack}
      onOpenStudio={onOpenStudio}
      onOpenToolbox={onOpenToolbox}
      onOpenNotes={onOpenNotes}
      onOpenQuickModal={onOpenQuickModal}
      onOpenDocument={onOpenDocument}
      teacher={teacher}
    />
  );
};
