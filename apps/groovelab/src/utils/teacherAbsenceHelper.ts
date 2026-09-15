/**
 * 🏛️ CAMPUS-GROOVELAB: TEACHER ABSENCE & AVAILABILITY HELPER
 *
 * Strikte, neutrale und forensische Prüfung des Abwesenheitsstatus von Lehrkräften.
 * Standard: DSGVO Art. 9 Konformität — vollständige Neutralität ("ausfall" / "abwesend").
 * Ersetzt naive Prüfungen durch eine präzise Zeitfenster- und Sentinel-Validierung.
 */

export const ABSENCE_RESET_SENTINEL = '1970-01-01T00:00:00.000Z';

export interface TeacherAbsenceRecord {
  ausfall_until?: string | null;
  ausfall_start?: string | null;
  [key: string]: any;
}

/**
 * Prüft, ob eine Lehrkraft gegenwärtig aktiv abwesend gemeldet ist.
 * 
 * Kriterien für eine aktive Abwesenheit:
 * 1. teacher.ausfall_until (oder Legacy-Feld) ist vorhanden.
 * 2. Das Datum ist ein valider Zeitstempel.
 * 3. Das Jahr liegt NACH 1971 (schließt Sentinel-Werte wie 1970-01-01 aus).
 * 4. Das Enddatum liegt heute oder in der Zukunft (End-of-Day 23:59:59.999).
 */
export function isTeacherCurrentlyAbsent(teacher: TeacherAbsenceRecord | null | undefined): boolean {
  const rawUntilVal = teacher?.ausfall_until ?? (teacher as any)?.ausfallUntil;
  if (!rawUntilVal) return false;

  const rawUntil = String(rawUntilVal).trim();
  if (!rawUntil || rawUntil === 'null' || rawUntil === 'undefined') return false;

  const untilDate = new Date(rawUntil);
  if (isNaN(untilDate.getTime())) return false;

  // Sentinel-Filter: Werte vor oder um 1970/1971 markieren einen expliziten Reset
  if (untilDate.getFullYear() <= 1971) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const endOfDay = new Date(untilDate);
  endOfDay.setHours(23, 59, 59, 999);

  return today.getTime() <= endOfDay.getTime();
}

/**
 * Formatiert den Abwesenheitszeitraum für die Benutzeroberfläche.
 */
export function formatAbsenceEndDate(ausfallUntil: string | null | undefined): string {
  if (!ausfallUntil) return '';
  const d = new Date(ausfallUntil);
  if (isNaN(d.getTime()) || d.getFullYear() <= 1971) return '';
  return d.toLocaleDateString('de-DE', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

/**
 * Prüft volljuristisch exakt (§ 130 BGB / Treu und Glauben § 242 BGB), 
 * ob ein Unterrichtstermin (Datum + Uhrzeit) in das Abwesenheitszeitfenster fällt.
 * 
 * Invariante:
 * - Termine VOR der Abwesenheitsmeldung (Startuhrzeit) haben bereits stattgefunden 
 *   und dürfen rückwirkend NIEMALS ausfallen.
 * - Termine ab/nach der Startuhrzeit bis zum Ende des Abwesenheitszeitraums fallen aus.
 */
export function isSlotCancelledByAbsence(
  slotDateStr: string,
  slotStartTimeStr: string,
  teacher: TeacherAbsenceRecord | null | undefined
): boolean {
  const rawUntilVal = teacher?.ausfall_until ?? (teacher as any)?.ausfallUntil;
  if (!rawUntilVal) return false;

  const rawUntil = String(rawUntilVal).trim();
  if (!rawUntil || rawUntil === 'null' || rawUntil === 'undefined') return false;

  const untilDate = new Date(rawUntil);
  if (isNaN(untilDate.getTime())) return false;
  if (untilDate.getFullYear() <= 1971) return false;

  // Slot-Startzeitpunkt ermitteln (Lokale Zeit)
  const cleanTime = (slotStartTimeStr || '00:00').substring(0, 5);
  const [slotH, slotM] = cleanTime.split(':').map(Number);
  const [sYear, sMonth, sDay] = slotDateStr.substring(0, 10).split('-').map(Number);
  const slotDateTime = new Date(sYear, (sMonth || 1) - 1, sDay || 1, slotH || 0, slotM || 0, 0, 0);
  if (isNaN(slotDateTime.getTime())) return false;

  // Abwesenheits-Startzeitpunkt ermitteln (volljuristischer Zeitstempel)
  const rawStartVal = teacher?.ausfall_start ?? (teacher as any)?.ausfallStart;
  let startDateTime: Date;
  if (rawStartVal) {
    const rawStart = String(rawStartVal).trim();
    if (rawStart.includes('T')) {
      startDateTime = new Date(rawStart);
    } else {
      const [stYear, stMonth, stDay] = rawStart.substring(0, 10).split('-').map(Number);
      startDateTime = new Date(stYear, (stMonth || 1) - 1, stDay || 1, 0, 0, 0, 0);
    }
  } else {
    const untilDateOnly = rawUntil.substring(0, 10);
    const [uYear, uMonth, uDay] = untilDateOnly.split('-').map(Number);
    startDateTime = new Date(uYear, (uMonth || 1) - 1, uDay || 1, 0, 0, 0, 0);
  }

  // End-Zeitpunkt: Falls ausfall_until nur ein Datum ist, bis 23:59:59.999
  let endDateTime: Date;
  if (rawUntil.includes('T') && !rawUntil.endsWith('00:00:00.000Z') && !rawUntil.endsWith('00:00:00')) {
    endDateTime = new Date(rawUntil);
  } else {
    const untilDateOnly = rawUntil.substring(0, 10);
    const [uYear, uMonth, uDay] = untilDateOnly.split('-').map(Number);
    endDateTime = new Date(uYear, (uMonth || 1) - 1, uDay || 1, 23, 59, 59, 999);
  }

  return slotDateTime.getTime() >= startDateTime.getTime() && slotDateTime.getTime() <= endDateTime.getTime();
}
