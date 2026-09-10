/**
 * 🏛️ CAMPUS-GROOVELAB: TEACHER ABSENCE & AVAILABILITY HELPER
 *
 * Strikte, neutrale und forensische Prüfung des Abwesenheitsstatus von Lehrkräften.
 * Ersetzt naive Boolean(teacher.sick_until)-Prüfungen durch eine präzise
 * Zeitfenster- und Sentinel-Validierung.
 */

export const ABSENCE_RESET_SENTINEL = '1970-01-01T00:00:00.000Z';

/**
 * Prüft, ob eine Lehrkraft gegenwärtig aktiv abwesend gemeldet ist.
 * 
 * Kriterien für eine aktive Abwesenheit:
 * 1. teacher.sick_until ist vorhanden.
 * 2. Das Datum ist ein valider Zeitstempel.
 * 3. Das Jahr liegt NACH 1971 (schließt Sentinel-Werte wie 1970-01-01 aus).
 * 4. Das Enddatum liegt heute oder in der Zukunft (End-of-Day 23:59:59.999).
 */
export function isTeacherCurrentlyAbsent(teacher: { sick_until?: string | null; sick_start?: string | null } | null | undefined): boolean {
  if (!teacher?.sick_until) return false;

  const rawUntil = String(teacher.sick_until).trim();
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
export function formatAbsenceEndDate(sickUntil: string | null | undefined): string {
  if (!sickUntil) return '';
  const d = new Date(sickUntil);
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
  teacher: { sick_start?: string | null; sick_until?: string | null } | null | undefined
): boolean {
  if (!teacher?.sick_until) return false;

  const rawUntil = String(teacher.sick_until).trim();
  if (!rawUntil || rawUntil === 'null' || rawUntil === 'undefined') return false;

  const untilDate = new Date(rawUntil);
  if (isNaN(untilDate.getTime()) || untilDate.getFullYear() <= 1971) return false;

  // Slot-Startzeitpunkt ermitteln
  const cleanTime = (slotStartTimeStr || '00:00').substring(0, 5);
  const slotDateTime = new Date(`${slotDateStr}T${cleanTime.length === 5 ? `${cleanTime}:00` : cleanTime}`);
  if (isNaN(slotDateTime.getTime())) return false;

  // Abwesenheits-Startzeitpunkt ermitteln (volljuristischer Zeitstempel)
  let startDateTime: Date;
  if (teacher.sick_start) {
    const rawStart = String(teacher.sick_start).trim();
    if (rawStart.includes('T')) {
      startDateTime = new Date(rawStart);
    } else {
      // Reines YYYY-MM-DD Datum: Startet um 00:00 Uhr
      startDateTime = new Date(`${rawStart}T00:00:00`);
    }
  } else {
    // Ohne sick_start gilt das Datum von sick_until ab 00:00 Uhr
    const untilDateOnly = rawUntil.substring(0, 10);
    startDateTime = new Date(`${untilDateOnly}T00:00:00`);
  }

  // End-Zeitpunkt: Falls sick_until nur ein Datum ist, bis 23:59:59.999
  let endDateTime: Date;
  if (rawUntil.includes('T') && !rawUntil.endsWith('00:00:00.000Z') && !rawUntil.endsWith('00:00:00')) {
    endDateTime = new Date(rawUntil);
  } else {
    const untilDateOnly = rawUntil.substring(0, 10);
    endDateTime = new Date(`${untilDateOnly}T23:59:59.999`);
  }

  return slotDateTime.getTime() >= startDateTime.getTime() && slotDateTime.getTime() <= endDateTime.getTime();
}
