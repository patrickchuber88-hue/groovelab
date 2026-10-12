/**
 * Student Audio Share Service (Zero-Trust ReBAC)
 * 
 * Verwaltet Opt-In Freigaben von Schüleraufnahmen an zugewiesene Lehrkräfte.
 * Vollständige Einhaltung von OWASP ASVS Level 3, § 201 StGB, § 73 UrhG und Art. 25 DSGVO.
 */

import { supabase } from '../lib/supabase';

export interface StudentAudioShareInfo {
  teacher_id: string;
  teacher_name?: string;
  is_active: boolean;
  shared_at: string;
  revoked_at?: string | null;
}

export interface TeacherAssignment {
  id: string;
  first_name: string;
  last_name: string;
  instrument?: string;
}

/**
 * Ruft den aktuellen Sharing-Status einer Audiodatei autoritativ von der Datenbank ab.
 */
export async function fetchStudentAudioShares(filePath: string): Promise<{
  role: string;
  shares: StudentAudioShareInfo[];
  is_shared?: boolean;
}> {
  try {
    const { data, error } = await supabase.rpc('get_student_audio_shares', {
      p_file_path: filePath
    });

    if (error) {
      console.warn('[studentAudioShareService] Error fetching audio shares:', error.message);
      return { role: 'unknown', shares: [] };
    }

    return (data as any) || { role: 'unknown', shares: [] };
  } catch (err) {
    console.error('[studentAudioShareService] Failed to fetch audio shares:', err);
    return { role: 'unknown', shares: [] };
  }
}

/**
 * Schaltet die Freigabe einer Schüleraufnahme für eine zugewiesene Lehrkraft aktiv um (Opt-In / Opt-Out).
 */
export async function toggleStudentAudioShare(
  filePath: string,
  teacherId: string,
  isShared: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('set_student_audio_share', {
      p_file_path: filePath,
      p_teacher_id: teacherId,
      p_is_shared: isShared
    });

    if (error) {
      console.error('[studentAudioShareService] RPC error setting audio share:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error('[studentAudioShareService] Exception setting audio share:', err);
    return { success: false, error: err?.message || 'Unerwarteter Fehler' };
  }
}

/**
 * Ermittelt alle zugewiesenen Lehrkräfte für einen Schüler zur Auswahl im Sharing-Dialog.
 */
export async function getAssignedTeachersForStudent(
  studentId: string,
  schoolId: string
): Promise<TeacherAssignment[]> {
  if (!studentId || !schoolId) return [];

  try {
    // 1. Zuweisung über Stundenplan (schedules)
    const { data: scheduleData } = await supabase
      .from('schedules')
      .select('teacher_id, users!schedules_teacher_id_fkey(id, first_name, last_name)')
      .eq('student_id', studentId)
      .eq('school_id', schoolId);

    const teacherMap = new Map<string, TeacherAssignment>();

    if (scheduleData && Array.isArray(scheduleData)) {
      scheduleData.forEach((row: any) => {
        const t = row.users;
        if (t?.id && !teacherMap.has(t.id)) {
          teacherMap.set(t.id, {
            id: t.id,
            first_name: t.first_name || '',
            last_name: t.last_name || ''
          });
        }
      });
    }

    // 2. Zuweisung über Schülerprofil (students)
    const { data: studentProfile } = await supabase
      .from('students')
      .select('teacher_id')
      .eq('id', studentId)
      .maybeSingle();

    if (studentProfile?.teacher_id && !teacherMap.has(studentProfile.teacher_id)) {
      const { data: teacherUser } = await supabase
        .from('users')
        .select('id, first_name, last_name')
        .eq('id', studentProfile.teacher_id)
        .maybeSingle();

      if (teacherUser?.id) {
        teacherMap.set(teacherUser.id, {
          id: teacherUser.id,
          first_name: teacherUser.first_name || '',
          last_name: teacherUser.last_name || ''
        });
      }
    }

    return Array.from(teacherMap.values());
  } catch (err) {
    console.warn('[studentAudioShareService] Failed to load assigned teachers:', err);
    return [];
  }
}
