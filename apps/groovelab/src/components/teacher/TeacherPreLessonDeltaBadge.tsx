import React from 'react';
import { Flame, CheckCircle2, AlertCircle } from 'lucide-react';

/**
 * 🎵 TeacherPreLessonDeltaBadge (FUNC-AUDIT-01 / CAM-153)
 *
 * Autarker 60-Sekunden-Unterrichtswechsel-Satellit für den Lehrer-Tagesplan.
 * Zeigt der Lehrkraft beim Schülerwechsel an der Tür auf einen Blick:
 * - Aktive Übeserie / Fokus-Aktivität des Schülers
 * - Selbstreflexions-Status aus der Aufgaben-Rückmeldung (falls vorhanden)
 *
 * 🛡️ Goldstandard-Axiome:
 * - Rule 9 (Unifarben-Axiom): Farbige Füllung mit `border: 'none'`
 * - Zero-Shadow Flat Paper (`boxShadow: 'none'`)
 * - Clean Dashboard Wording (0 Paragraphenzeichen)
 */

export interface TeacherPreLessonDeltaBadgeProps {
  student: any;
  allStudents?: any[];
}

export const TeacherPreLessonDeltaBadge: React.FC<TeacherPreLessonDeltaBadgeProps> = ({
  student,
  allStudents
}) => {
  if (!student) return null;

  const resolved =
    allStudents?.find((s: any) => s && student.id && s.id === student.id) || student;

  const streakDays = Number(
    resolved?.streak_flame ??
      resolved?.avatar?.streak_flame ??
      resolved?.practice_streak ??
      0
  );

  const practiceMinutesWeek = Number(
    resolved?.weekly_practice_minutes ??
      resolved?.effective_practice_minutes ??
      0
  );

  const reflectionTone: 'challenging' | 'moderate' | 'mastered' | null =
    resolved?.last_task_reflection === 'red'
      ? 'challenging'
      : resolved?.last_task_reflection === 'yellow'
        ? 'moderate'
        : resolved?.last_task_reflection === 'green'
          ? 'mastered'
          : null;

  if (streakDays <= 0 && practiceMinutesWeek <= 0 && !reflectionTone) {
    return null;
  }

  const isChallenging = reflectionTone === 'challenging';
  const bg = isChallenging ? '#fef3c7' : '#dcfce7';
  const fg = isChallenging ? '#92400e' : '#166534';

  const labelParts: string[] = [];
  if (streakDays > 0) {
    labelParts.push(`${streakDays}T Serie`);
  }
  if (practiceMinutesWeek > 0) {
    labelParts.push(`${practiceMinutesWeek} Min.`);
  }
  if (isChallenging) {
    labelParts.push('Wünscht Hilfe');
  } else if (reflectionTone === 'mastered') {
    labelParts.push('Sitzt sicher');
  }

  const summaryText = labelParts.join(' · ');
  if (!summaryText) return null;

  return (
    <span
      title={`Übe-Impuls vor Stundenbeginn: ${summaryText}`}
      aria-label={`Übe-Impuls: ${summaryText}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '2px 8px',
        borderRadius: '100px',
        background: bg,
        color: fg,
        border: 'none',
        boxShadow: 'none',
        fontSize: '0.68rem',
        fontWeight: 850,
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        flexShrink: 0,
        whiteSpace: 'nowrap'
      }}
    >
      {isChallenging ? (
        <AlertCircle size={10} color={fg} strokeWidth={2.6} />
      ) : streakDays > 0 ? (
        <Flame size={10} color={fg} strokeWidth={2.6} />
      ) : (
        <CheckCircle2 size={10} color={fg} strokeWidth={2.6} />
      )}
      <span>{summaryText}</span>
    </span>
  );
};
