import { supabase, deleteUserStorageAssets } from '../lib/supabase';

export interface DeleteStudentOptions {
  activePlatform?: 'campus' | 'groovelab' | 'all';
  isCampusActive?: boolean;
  isGroovelabActive?: boolean;
  studentName?: string;
}

/**
 * Safely deletes a student record, cleaning up all foreign key references first 
 * to prevent database constraint errors.
 */
export async function deleteStudentFully(
  studentId: string,
  options: DeleteStudentOptions = {}
): Promise<{ success: boolean; softDeleted?: boolean; error?: string }> {
  try {
    const allTargetIds = new Set<string>();
    if (studentId) allTargetIds.add(studentId);

    let fName: string | undefined = undefined;
    let schId: string | undefined = undefined;

    // 1. Try resolving from users table
    try {
      const { data: uRec } = await supabase
        .from('users')
        .select('id, school_id, first_name, last_name')
        .eq('id', studentId)
        .maybeSingle();

      if (uRec) {
        fName = uRec.first_name;
        schId = uRec.school_id;
      }
    } catch (e) {
      console.warn('[studentDeletionService] Users ID resolution notice:', e);
    }

    // 2. Try resolving from pending_students_decrypted if not found
    if (!fName) {
      try {
        const { data: pRec } = await supabase
          .from('pending_students_decrypted')
          .select('id, school_id, first_name, last_name')
          .eq('id', studentId)
          .maybeSingle();

        if (pRec) {
          fName = pRec.first_name;
          schId = pRec.school_id;
        }
      } catch (e) {
        console.warn('[studentDeletionService] Pending ID resolution notice:', e);
      }
    }

    // 3. Fallback: Parse from options.studentName if provided
    if (!fName && options.studentName) {
      const parts = options.studentName.trim().split(/\s+/);
      if (parts.length > 0) {
        fName = parts[0];
      }
    }

    // 4. If we have a first name, locate all matching student records (users & pending)
    if (fName) {
      try {
        let uQuery = supabase.from('users').select('id, school_id').ilike('first_name', fName);
        if (schId) uQuery = uQuery.eq('school_id', schId);
        const { data: otherUsers } = await uQuery;
        otherUsers?.forEach(u => {
          allTargetIds.add(u.id);
          if (!schId && u.school_id) schId = u.school_id;
        });

        let pQuery = supabase.from('pending_students_decrypted').select('id, school_id').ilike('first_name', fName);
        if (schId) pQuery = pQuery.eq('school_id', schId);
        const { data: otherPend } = await pQuery;
        otherPend?.forEach(p => allTargetIds.add(p.id));
      } catch (e) {
        console.warn('[studentDeletionService] Cross-table resolution notice:', e);
      }
    }

    // 5. Call atomic SECURITY DEFINER RPC
    try {
      const { data: rpcRes, error: rpcErr } = await supabase.rpc('delete_student_fully', {
        p_student_id: studentId,
        p_school_id: schId || null,
        p_first_name: fName || null
      });

      if (!rpcErr && rpcRes === true) {
        const idsArray = Array.from(allTargetIds);
        try {
          await deleteUserStorageAssets(idsArray);
        } catch (e) {}
        return { success: true, softDeleted: false };
      }
      if (rpcErr) {
        console.warn('[studentDeletionService] RPC delete notice (falling back to direct delete):', rpcErr);
      }
    } catch (e) {
      console.warn('[studentDeletionService] RPC invoke warning:', e);
    }

    const idsArray = Array.from(allTargetIds);
    if (idsArray.length === 0) {
      return { success: true, softDeleted: false };
    }

    try {
      await deleteUserStorageAssets(idsArray);
    } catch (e) {
      console.warn('[studentDeletionService] Storage purge warning:', e);
    }

    const safeDeleteIds = async (table: string, column: string = 'user_id') => {
      try {
        const { error } = await supabase.from(table).delete().in(column, idsArray);
        if (error) {
          console.warn(`[studentDeletionService] Warning deleting from ${table}.${column}:`, error);
        }
      } catch (err) {
        console.warn(`[studentDeletionService] Warning deleting from ${table}:`, err);
      }
    };

    const safeNullifyIds = async (table: string, column: string) => {
      try {
        const { error } = await supabase.from(table).update({ [column]: null }).in(column, idsArray);
        if (error) {
          console.warn(`[studentDeletionService] Warning nullifying ${table}.${column}:`, error);
        }
      } catch (err) {
        console.warn(`[studentDeletionService] Warning nullifying ${table}.${column}:`, err);
      }
    };

    // Clean up references in all related tables
    await safeNullifyIds('bands', 'coach_id');
    await safeDeleteIds('user_song_skills', 'user_id');
    await safeNullifyIds('user_song_skills', 'verified_by_id');
    await safeDeleteIds('band_members', 'user_id');
    await safeDeleteIds('sessions', 'user_id');
    await safeNullifyIds('band_songs', 'suggested_by');
    await safeDeleteIds('lab_planning', 'user_id');
    await safeDeleteIds('band_shoutbox', 'user_id');
    await safeDeleteIds('band_song_slots', 'user_id');
    await safeDeleteIds('help_requests', 'user_id');
    await safeDeleteIds('schedule_occurrences', 'student_id');
    await safeDeleteIds('schedule_occurrences', 'teacher_id');
    await safeDeleteIds('student_teachers', 'student_id');
    await safeDeleteIds('student_schedule_preferences', 'student_id');
    await safeDeleteIds('schedules', 'student_id');
    await safeDeleteIds('schedules', 'teacher_id');
    await safeDeleteIds('student_notes', 'student_id');
    await safeDeleteIds('student_logs', 'student_id');
    await safeDeleteIds('meisterwerk_documentation', 'student_id');
    await safeDeleteIds('meisterwerk_logs', 'student_id');
    await safeDeleteIds('chat_messages', 'sender_id');
    await safeDeleteIds('chat_messages', 'recipient_id');
    await safeDeleteIds('direct_messages', 'sender_id');
    await safeDeleteIds('direct_messages', 'recipient_id');
    await safeDeleteIds('kiosks', 'student_id');
    await safeDeleteIds('user_xp', 'user_id');
    await safeDeleteIds('user_badges', 'user_id');
    await safeDeleteIds('activation_days', 'student_id');
    await safeDeleteIds('student_first_names', 'student_id');
    await safeDeleteIds('student_last_names', 'student_id');
    await safeDeleteIds('student_onboarding_tokens', 'student_id');
    await safeDeleteIds('onboarding_attempts', 'student_id');
    await safeDeleteIds('parent_email_prefixes', 'student_id');
    await safeDeleteIds('parent_email_suffixes', 'student_id');
    await safeDeleteIds('user_email_prefixes', 'user_id');
    await safeDeleteIds('user_email_suffixes', 'user_id');
    await safeDeleteIds('pending_students', 'id');
    await safeDeleteIds('users_raw', 'id');
    await safeDeleteIds('students', 'id');
    await safeDeleteIds('users', 'id');

    // Clean up JSON planned_boards across all teachers in the school to prevent orphan drafts
    if (schId) {
      try {
        const { data: teachersWithBoards } = await supabase
          .from('users')
          .select('id, planned_boards')
          .eq('school_id', schId)
          .not('planned_boards', 'is', null);

        if (teachersWithBoards && teachersWithBoards.length > 0) {
          for (const t of teachersWithBoards) {
            let modified = false;
            let rawPlanned = t.planned_boards;
            if (typeof rawPlanned === 'string') {
              try { rawPlanned = JSON.parse(rawPlanned); } catch (e) {}
            }

            if (rawPlanned && typeof rawPlanned === 'object') {
              const cleanBoardsList = (boardsList: any[]) => {
                if (!Array.isArray(boardsList)) return boardsList;
                return boardsList.map(b => {
                  if (!b || !Array.isArray(b.students)) return b;
                  const filteredStudents = b.students.filter((s: any) => {
                    if (s.isBreak || s.isVacant) return true;
                    if (allTargetIds.has(s.id)) {
                      modified = true;
                      return false;
                    }
                    if (fName && s.first_name && s.first_name.trim().toLowerCase() === fName.trim().toLowerCase()) {
                      modified = true;
                      return false;
                    }
                    if (s.groupStudents && Array.isArray(s.groupStudents)) {
                      const prevLen = s.groupStudents.length;
                      s.groupStudents = s.groupStudents.filter((gs: any) => !allTargetIds.has(gs.id) && (!fName || gs.first_name?.trim().toLowerCase() !== fName.trim().toLowerCase()));
                      if (s.groupStudents.length !== prevLen) {
                        modified = true;
                      }
                      if (s.groupStudents.length === 0) return false;
                    }
                    return true;
                  });
                  return { ...b, students: filteredStudents };
                });
              };

              if (Array.isArray(rawPlanned.drafts)) {
                rawPlanned.drafts = rawPlanned.drafts.map((d: any) => ({
                  ...d,
                  boards: cleanBoardsList(d.boards)
                }));
              } else if (Array.isArray(rawPlanned)) {
                rawPlanned = cleanBoardsList(rawPlanned);
              }

              if (modified) {
                await supabase
                  .from('users')
                  .update({ planned_boards: rawPlanned })
                  .eq('id', t.id);
              }
            }
          }
        }
      } catch (err) {
        console.warn('[studentDeletionService] Warning cleaning planned_boards:', err);
      }
    }

    return { success: true, softDeleted: false };
  } catch (err: any) {
    console.error('[studentDeletionService] Failed to delete student:', err);
    return { success: false, error: err.message || 'Fehler beim Löschen des Schülers.' };
  }
}
