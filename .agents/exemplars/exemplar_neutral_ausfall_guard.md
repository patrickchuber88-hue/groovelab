# ⚖️ Exemplar 5: Neutrale Abwesenheitsmeldung (DSGVO Art. 9 & § 26 BDSG Konformität)
<!--
Bounded Context: Teacher & School Governance / Health Data Privacy
Rules: 0% medical diagnosis tokens (no "krank", "fieber", "attest", "diagnose");
strictly neutral cancellation reason: "cancellation", "teacher_ausfall", "organisatorisch";
authoritative PostgreSQL RPC transaction with audit trail.
-->

### Problemstellung
Eine Lehrkraft oder Schulleitung muss einen Unterrichtsausfall melden. Nach DSGVO Art. 9 und § 26 BDSG dürfen dabei **keinerlei** Gesundheitsdaten oder medizinische Gründe im System erfasst oder an Schüler/Eltern übermittelt werden.

### Konforme 0,1% Goldstandard Implementierung

```tsx
// apps/groovelab/src/services/absenceReportService.ts
import { supabase } from '../lib/supabaseClient';

export interface ReportTeacherAbsenceParams {
  teacherId: string;
  schoolId: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  notifyAffectedStudents: boolean;
}

export interface ReportAbsenceResult {
  success: boolean;
  affectedLessonsCount: number;
  error?: string;
}

// Neutrale Grund-Konstante gem. DSGVO Art. 9 Doktrin
const NEUTRAL_AUSFALL_REASON = 'teacher_ausfall';

export async function reportNeutralTeacherAbsence({
  teacherId,
  schoolId,
  startDate,
  endDate,
  notifyAffectedStudents
}: ReportTeacherAbsenceParams): Promise<ReportAbsenceResult> {
  // Input Validation
  if (!teacherId || !startDate || !endDate) {
    return { success: false, affectedLessonsCount: 0, error: 'Unvollständige Parameter.' };
  }

  try {
    // Autoritativer RPC: Storniert betroffene Slots atomar mit neutralem Status 'teacher_ausfall'
    // Es werden absolut keine Freitext-Krankheitsursachen entgegengenommen oder gespeichert
    const { data, error } = await supabase.rpc('report_teacher_absence', {
      p_teacher_id: teacherId,
      p_school_id: schoolId,
      p_start_date: startDate,
      p_end_date: endDate,
      p_reason: NEUTRAL_AUSFALL_REASON,
      p_notify_students: notifyAffectedStudents
    });

    if (error) {
      console.error('[LEGAL AUDIT] Fehler bei neutraler Abwesenheitsmeldung:', error.message);
      return {
        success: false,
        affectedLessonsCount: 0,
        error: 'Fehler beim Speichern der Abwesenheit in der Datenbank.'
      };
    }

    return {
      success: true,
      affectedLessonsCount: data?.affected_count ?? 0
    };
  } catch (err) {
    console.error('[LEGAL AUDIT] Unerwarteter Fehler bei Abwesenheitsmeldung:', err);
    return {
      success: false,
      affectedLessonsCount: 0,
      error: 'Unerwarteter Systemfehler bei der Ausfallerfassung.'
    };
  }
}
```
