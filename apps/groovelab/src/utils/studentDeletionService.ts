import { supabase, deleteUserStorageAssets } from '../lib/supabase';

export interface DeleteStudentOptions {
  activePlatform?: 'campus' | 'groovelab' | 'all';
  isCampusActive?: boolean;
  isGroovelabActive?: boolean;
}

/**
 * Safely deletes a student record, cleaning up all foreign key references first 
 * to prevent database constraint errors.
 */
export async function deleteStudentFully(
  studentId: string,
  options: DeleteStudentOptions = {}
): Promise<{ success: boolean; softDeleted?: boolean; error?: string }> {
  const { activePlatform = 'all', isCampusActive, isGroovelabActive } = options;

  try {
    const isCampus = activePlatform === 'campus';
    const isGroovelab = activePlatform === 'groovelab';

    const currentPlatformActive = isCampus ? !!isCampusActive : (isGroovelab ? !!isGroovelabActive : true);
    const siblingPlatformActive = isCampus ? !!isGroovelabActive : (isGroovelab ? !!isCampusActive : false);

    // Only soft-delete (deactivate current platform) if the student is active on BOTH platforms.
    // If the student is already inactive on the current platform (e.g. isCampusActive = false),
    // soft-deactivating would be a no-op, so we must hard-delete the student.
    if (activePlatform !== 'all' && currentPlatformActive && siblingPlatformActive) {
      const updatePayload = isCampus
        ? { is_campus_active: false }
        : { is_groovelab_active: false };
      const { error } = await supabase.from('users').update(updatePayload).eq('id', studentId);
      if (error) throw error;
      return { success: true, softDeleted: true };
    }

    // Hard delete: purge storage assets and clean up all foreign key references
    try {
      await deleteUserStorageAssets([studentId]);
    } catch (e) {
      console.warn('[studentDeletionService] Storage purge warning:', e);
    }

    const safeDelete = async (table: string, column: string = 'user_id') => {
      try {
        await supabase.from(table).delete().eq(column, studentId);
      } catch (err) {
        console.warn(`[studentDeletionService] Warning deleting from ${table}:`, err);
      }
    };

    const safeNullify = async (table: string, column: string) => {
      try {
        await supabase.from(table).update({ [column]: null }).eq(column, studentId);
      } catch (err) {
        console.warn(`[studentDeletionService] Warning nullifying ${table}.${column}:`, err);
      }
    };

    // Clean up references in all related tables
    await safeNullify('bands', 'coach_id');
    await safeDelete('user_song_skills', 'user_id');
    await safeNullify('user_song_skills', 'verified_by_id');
    await safeDelete('band_members', 'user_id');
    await safeDelete('sessions', 'user_id');
    await safeNullify('band_songs', 'suggested_by');
    await safeDelete('lab_planning', 'user_id');
    await safeDelete('band_shoutbox', 'user_id');
    await safeDelete('band_song_slots', 'user_id');
    await safeDelete('help_requests', 'user_id');
    await safeDelete('schedule_occurrences', 'student_id');
    await safeDelete('student_teachers', 'student_id');
    await safeDelete('student_schedule_preferences', 'student_id');
    await safeDelete('schedules', 'student_id');
    await safeDelete('student_notes', 'student_id');
    await safeDelete('student_logs', 'student_id');
    await safeDelete('meisterwerk_documentation', 'student_id');
    await safeDelete('meisterwerk_logs', 'student_id');
    await safeDelete('chat_messages', 'sender_id');
    await safeDelete('chat_messages', 'recipient_id');
    await safeDelete('direct_messages', 'sender_id');
    await safeDelete('direct_messages', 'recipient_id');
    await safeDelete('kiosks', 'student_id');
    await safeDelete('user_xp', 'user_id');
    await safeDelete('user_badges', 'user_id');

    // Delete from users table (view/table)
    const { error: userError } = await supabase.from('users').delete().eq('id', studentId);
    
    // Delete from students table (cascades to names, activation_days, prefixes, suffixes)
    const { error: studentError } = await supabase.from('students').delete().eq('id', studentId);

    if (userError && studentError) {
      throw userError || studentError;
    }

    return { success: true, softDeleted: false };
  } catch (err: any) {
    console.error('[studentDeletionService] Failed to delete student:', err);
    return { success: false, error: err.message || 'Fehler beim Löschen des Schülers.' };
  }
}
