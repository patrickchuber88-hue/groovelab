import { toLocalYYYYMMDD, getSimulatedNow } from '../../studentDateUtils';

/**
 * 🏛️ Campus-Groovelab Student Next Lesson Helper
 * 0.1% Enterprise Goldstandard / Autarker Satellit für StudentBriefingTab & StudentBriefingActionButtons
 * Bounded Context: Student Campus Briefing / Schedule Status Engine
 * Standards: OWASP ASVS Level 3 / BFSG 2025 / WCAG 2.2 AA / Zero Color-Clash Doktrin
 */

export type LessonStatusKind = 'regular' | 'rescheduled' | 'canceled';

export interface NextLessonResult {
  nextOcc: any | null;
  lessonText: string;
  status: LessonStatusKind;
  isCanceled: boolean;
  isRescheduled: boolean;
  isPendingReschedule: boolean;
  timeLabel: string;
  targetDateStr: string;
  finalOccurId: string;
  teacherId: string | undefined;
  ariaLabel: string;
  tooltipTitle: string;
}

/**
 * Prüft autoritativ, ob ein Unterrichtstermin abgesagt ist (Art. 9 DSGVO / § 26 BDSG).
 */
export function isOccurrenceCancelled(occ: any): boolean {
  if (!occ) return false;
  const status = String(occ.status || '').toLowerCase();
  return (
    status === 'canceled_by_student' ||
    status === 'cancelled' ||
    status === 'canceled' ||
    status === 'teacher_ausfall' ||
    status === 'canceled_by_teacher_ausfall' ||
    status === 'absent'
  );
}

/**
 * Prüft autoritativ, ob ein Unterrichtstermin verschoben wurde (Entwurf, Vorschlag oder Bestätigt).
 */
export function isOccurrenceRescheduled(occ: any): boolean {
  if (!occ) return false;
  if (isOccurrenceCancelled(occ)) return false;

  const status = String(occ.status || '').toLowerCase();
  const isStatusMoved = (
    status === 'pending_reschedule' ||
    status === 'rescheduled_confirmed' ||
    status === 'rescheduled' ||
    status === 'reschedule_requested' ||
    status === 'pending_student_approval'
  );

  const isFlagMoved = Boolean(occ.is_moved || occ.is_rescheduled);
  const isDateMoved = Boolean(occ.original_date && occ.date && occ.original_date !== occ.date);
  const isTimeMoved = Boolean(
    occ.original_start_time &&
    occ.start_time &&
    occ.original_start_time.substring(0, 5) !== occ.start_time.substring(0, 5)
  );

  return isStatusMoved || isFlagMoved || isDateMoved || isTimeMoved;
}

/**
 * Prüft, ob ein Verschiebungs-Vorschlag noch auf Bestätigung des Schülers/Elternteils wartet.
 */
export function isOccurrencePendingReschedule(occ: any): boolean {
  if (!occ) return false;
  const status = String(occ.status || '').toLowerCase();
  // 🏛️ 0,1% Goldstandard: Bestätigte oder abgelehnte Termine sind per Definition niemals schwebend!
  if (status === 'rescheduled_confirmed' || status === 'reschedule_rejected' || status === 'confirmed') {
    return false;
  }
  const isAcknowledged = Boolean(occ.student_acknowledged || occ.studentAcknowledged);
  if (isAcknowledged) return false;
  if (!isOccurrenceRescheduled(occ)) return false;
  return status === 'pending_reschedule' || status === 'pending_student_approval' || Boolean(occ.is_moved && !isAcknowledged);
}

/**
 * Ermittelt deterministisch den nächsten Unterrichtstermin chronologisch ab dem Simulationsdatum.
 */
export function resolveNextStudentOccurrence({
  scheduleOccurrences = [],
  schoolYearOccurrences = [],
  briefingData,
  studentId,
  studentUser,
  simNow = getSimulatedNow()
}: {
  scheduleOccurrences?: any[];
  schoolYearOccurrences?: any[];
  briefingData?: any;
  studentId?: string;
  studentUser?: any;
  simNow?: Date;
}): NextLessonResult {
  const todayStr = toLocalYYYYMMDD(simNow);
  const nowTimeStr = simNow.toTimeString().substring(0, 8);

  // 1. Suche nach dem nächsten chronologischen Termin ab heute
  const allList = [...(scheduleOccurrences || []), ...(schoolYearOccurrences || [])];
  
  // Filtern nach künftigen Terminen (oder heute, falls Uhrzeit noch bevorstehend)
  const upcomingCandidates = allList.filter((occ: any) => {
    if (!occ || !occ.date) return false;
    if (occ.date > todayStr) return true;
    if (occ.date === todayStr) {
      const startTime = (occ.start_time || '23:59:59').substring(0, 8);
      return startTime >= nowTimeStr;
    }
    return false;
  });

  // Chronologisch sortieren
  upcomingCandidates.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return (a.start_time || '').localeCompare(b.start_time || '');
  });

  const nextOcc = upcomingCandidates[0] || (scheduleOccurrences || [])[0] || (schoolYearOccurrences || [])[0] || null;

  const hasToday = Boolean(briefingData?.todayLesson);
  const teacherId = hasToday 
    ? briefingData.todayLesson.teacher_id 
    : (nextOcc?.teacher_id || studentUser?.teacher_id);

  const timeLabel = hasToday 
    ? briefingData.todayLesson.time 
    : (nextOcc?.start_time?.substring(0, 5) || '14:00');

  const DAYS_DE = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  const targetDateStr = hasToday ? todayStr : (nextOcc?.date || todayStr);
  const targetDayOfWeek = targetDateStr ? DAYS_DE[new Date(targetDateStr).getDay()] : 'Termin';
  const formattedDate = targetDateStr ? new Date(targetDateStr).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }) : '';
  const finalOccurId = hasToday 
    ? (briefingData?.todayLesson?.id || `today-${teacherId}-${todayStr}`) 
    : (nextOcc?.id || `sched-${studentId}`);

  const lessonText = hasToday
    ? `Heute, ${briefingData.todayLesson.time} Uhr`
    : (nextOcc ? (() => {
        const d = new Date(nextOcc.date);
        const timeStr = (nextOcc.start_time || timeLabel).substring(0, 5);
        return `${d.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit' })} - ${timeStr} Uhr`;
      })() : 'Demnächst');

  // Status-Ermittlung
  const isCanceled = isOccurrenceCancelled(nextOcc);
  const isRescheduled = !isCanceled && isOccurrenceRescheduled(nextOcc);
  const isPendingReschedule = isRescheduled && isOccurrencePendingReschedule(nextOcc);

  let status: LessonStatusKind = 'regular';
  if (isCanceled) status = 'canceled';
  else if (isRescheduled) status = 'rescheduled';

  let ariaLabel = `Nächster Unterricht: ${lessonText}`;
  let tooltipTitle = 'Nächster Unterricht – Klicke für Details & Aktionen';

  if (isCanceled) {
    ariaLabel = `Abgesagter Unterricht: ${lessonText}`;
    tooltipTitle = 'Unterricht abgesagt – Klicke zum Reaktivieren oder Details';
  } else if (isPendingReschedule) {
    ariaLabel = `Verschobener Unterricht (Terminvorschlag): ${lessonText}`;
    tooltipTitle = 'Terminvorschlag prüfen (Bestätigen oder Ablehnen)';
  } else if (isRescheduled) {
    ariaLabel = `Verschobener Unterricht: ${lessonText}`;
    tooltipTitle = 'Verschobener Unterricht – Klicke für Details';
  }

  return {
    nextOcc,
    lessonText,
    status,
    isCanceled,
    isRescheduled,
    isPendingReschedule,
    timeLabel,
    targetDateStr,
    finalOccurId,
    teacherId,
    ariaLabel,
    tooltipTitle
  };
}
