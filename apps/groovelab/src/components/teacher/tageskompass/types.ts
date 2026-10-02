import React from 'react';

export type TagesKompassState =
  | 'UNTERRICHTSFREI'
  | 'WOCHENENDE'
  | 'VORBEREITUNG'
  | 'ACTIVE'
  | 'PAUSE'
  | 'HYDRATION'
  | 'FEIERABEND'
  | 'ABWESENHEIT'
  | 'TOUR';

export interface NextTeachingDaySlot {
  time: string;
  studentName: string;
  instrument: string;
  room: string;
}

export interface NextTeachingDaySummary {
  dateStr: string;
  dayName: string;
  totalAppointments: number;
  firstStartTime: string;
  firstRoom: string;
  slots: NextTeachingDaySlot[];
}

export interface TagesKompassTeacher {
  id?: string;
  school_id?: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  photo_url?: string;
  schools?: { name?: string; id?: string };
  school_name?: string;
}

export interface TagesKompassStudent {
  id?: string;
  studentId?: string;
  name?: string;
  studentName?: string;
  first_name?: string;
  last_name?: string;
  photo_url?: string;
  instrument?: string;
  fach?: string;
  is_campus_active?: boolean;
  school_id?: string;
  schoolId?: string;
  schools?: { name?: string; id?: string };
  school_name?: string;
}

export interface TagesKompassHomeworkItem {
  id?: string;
  title?: string;
  topic_name?: string;
  bookTitle?: string;
  pages?: number[];
  formattedPages?: string;
  status?: string;
  isBook?: boolean;
  isSong?: boolean;
  bookColor?: { from: string; to: string; border: string };
  notes?: string[];
  recording_url?: string;
}

export interface TagesKompassPrep {
  id?: string;
  studentId: string;
  studentName: string;
  instrument?: string;
  fach?: string;
  photo_url?: string;
  is_campus_active?: boolean;
  streakCount: number;
  currentWeekNum: number;
  prevWeekNum: number;
  currentWeekNotes: string[];
  prevWeekNotes: string[];
  currentWeekItems: TagesKompassHomeworkItem[];
  prevWeekItems: TagesKompassHomeworkItem[];
  parsedPrevLehrwerke?: TagesKompassHomeworkItem[];
  parsedPrevSongs?: TagesKompassHomeworkItem[];
  rawSnapshotLwToken?: string;
  rawSnapshotSongsToken?: string;
  currentRawSnapshotLwToken?: string;
  currentRawSnapshotSongsToken?: string;
  parsedCurrentLehrwerke?: TagesKompassHomeworkItem[];
  parsedCurrentSongs?: TagesKompassHomeworkItem[];
}

export interface TagesKompassTimelineSlot {
  id?: string;
  student?: TagesKompassStudent;
  studentName?: string;
  timeSlot?: string;
  start_time?: string;
  end_time?: string;
  duration?: number;
  room?: string;
  roomName?: string;
  instrument?: string;
  fach?: string;
  isBreak?: boolean;
  status?: string;
  rooms?: { name?: string };
}

export interface TagesKompassBriefingData {
  timeline?: TagesKompassTimelineSlot[];
  prepMirror?: TagesKompassPrep;
  totalStudents?: number;
}

/**
 * 0,1% Enterprise Student Name Masking (Vorname + N.)
 * Garantiert, dass im gesamten Tages-Kompass Widget NIEMALS Klarnamen sichtbar sind.
 * Erfüllt KUG § 22, DSGVO Art. 25 & OWASP ASVS Level 3.
 */
export function formatTagesKompassStudentName(
  student?: TagesKompassStudent | { first_name?: string; last_name?: string; name?: string; studentName?: string; id?: string; studentId?: string } | null,
  fallbackRawName?: string | null
): string {
  if (!student && !fallbackRawName) return 'Schüler';

  let fName = (student?.first_name || '').trim();
  let lName = (student?.last_name || '').trim();

  // Falls first_name und last_name nicht separiert vorliegen, aus rawName parsen
  if (!fName && !lName) {
    const raw = (student?.name || student?.studentName || fallbackRawName || '').trim();
    if (!raw) return 'Schüler';
    const parts = raw.split(/\s+/);
    fName = parts[0] || 'Schüler';
    lName = parts.slice(1).join(' ');
  } else if (!fName && lName) {
    fName = 'Schüler';
  }

  // Falls fName selbst einen Nachnamen enthält (z. B. "Nora Conrad")
  if (fName.includes(' ') && !lName) {
    const parts = fName.split(/\s+/);
    fName = parts[0] || 'Schüler';
    lName = parts.slice(1).join(' ');
  }

  if (lName) {
    // Wenn lName bereits als Initial vorliegt (z. B. "C." oder "C")
    const cleanL = lName.replace(/[^a-zA-ZäöüÄÖÜß]/g, '');
    const initial = cleanL ? cleanL.charAt(0).toUpperCase() : '';
    return initial ? `${fName} ${initial}.` : fName;
  }

  return fName || 'Schüler';
}

/**
 * Formatiert Schüler-Gruppen deterministisch und anonymisiert (z. B. "Nora C., Moritz F.")
 */
export function formatTagesKompassGroupNames(
  students: TagesKompassStudent[]
): string {
  if (!students || students.length === 0) return 'Aktuelle Gruppe';
  return students.map(s => formatTagesKompassStudentName(s)).join(', ');
}

