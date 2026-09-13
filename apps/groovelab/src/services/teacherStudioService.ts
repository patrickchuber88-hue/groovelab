/**
 * 🏛️ Campus-Groovelab: Teacher Studio & Sandbox Service
 * Bounded Context: Teacher Dashboard & Preparations
 * Adheres strictly to OWASP ASVS Level 3 & Multi-Tenancy Invariant
 */

import { supabase } from '../lib/supabase';
import { isUUID } from '../utils/uuidValidator';
import { LehrwerkReference, SongReference, AudioReference } from '../types/databaseRoster';
import { getErrorMessage } from '../utils/errorHelper';

export interface TeacherSandboxEntry {
  id: string;
  school_id: string;
  teacher_id: string;
  topic_name: string;
  category: 'lesson_prep' | 'template' | 'recording';
  homework_notes: string;
  teacher_notes: string;
  assigned_lehrwerke: Array<{
    id?: string;
    title: string;
    pages: number[];
    notes?: string[];
    bookColor?: { from: string; to: string; text: string };
  }>;
  assigned_songs: Array<{
    id: string;
    topic_name: string;
    artist?: string;
    homework_notes?: string;
    key?: string;
    bpm?: number;
  }>;
  audio_recordings: Array<{
    url: string;
    label: string;
    duration?: number;
    date?: string;
    author?: string;
  }>;
  created_at?: string;
  updated_at?: string;
}

export interface AssignTeacherHomeworkParams {
  teacherId: string;
  schoolId: string;
  targetStudentIds: string[];
  targetWeekIso: string;
  topicName?: string;
  notesContent?: string;
  lehrwerke?: LehrwerkReference[];
  songs?: SongReference[];
  audios?: AudioReference[];
  appendMode?: boolean;
}

export interface AssignTeacherHomeworkResult {
  success: boolean;
  assigned_count: number;
  topic_name: string;
  error?: string;
}

const LOCAL_STORAGE_KEY_PREFIX = 'campus_teacher_sandbox_';

/**
 * Loads the active sandbox preparation entry for a teacher.
 * Offline-first with Supabase cloud hydration.
 */
export async function fetchTeacherSandboxEntry(
  teacherId: string,
  schoolId: string
): Promise<TeacherSandboxEntry> {
  const defaultEntry: TeacherSandboxEntry = {
    id: `local-sandbox-${teacherId}`,
    school_id: schoolId,
    teacher_id: teacherId,
    topic_name: 'Unterrichts-Vorbereitung',
    category: 'lesson_prep',
    homework_notes: '',
    teacher_notes: '',
    assigned_lehrwerke: [],
    assigned_songs: [],
    audio_recordings: []
  };

  if (!teacherId) return defaultEntry;

  // 1. Check LocalStorage fallback first for instant load
  const localCacheKey = `${LOCAL_STORAGE_KEY_PREFIX}${teacherId}`;
  if (typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem(localCacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && typeof parsed === 'object') {
          // Merge with default to guarantee all properties exist
          Object.assign(defaultEntry, parsed);
        }
      }
    } catch (e) {
      console.warn('[teacherStudioService] Local storage hydration notice:', e);
    }
  }

  // 2. Query Supabase
  try {
    const { data, error } = await supabase
      .from('teacher_sandbox_entries')
      .select('*')
      .eq('teacher_id', teacherId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn('[teacherStudioService] Could not fetch remote sandbox:', error.message);
      return defaultEntry;
    }

    if (data) {
      const remoteEntry: TeacherSandboxEntry = {
        id: data.id,
        school_id: data.school_id,
        teacher_id: data.teacher_id,
        topic_name: data.topic_name || 'Unterrichts-Vorbereitung',
        category: data.category || 'lesson_prep',
        homework_notes: data.homework_notes || '',
        teacher_notes: data.teacher_notes || '',
        assigned_lehrwerke: Array.isArray(data.assigned_lehrwerke) ? data.assigned_lehrwerke : [],
        assigned_songs: Array.isArray(data.assigned_songs) ? data.assigned_songs : [],
        audio_recordings: Array.isArray(data.audio_recordings) ? data.audio_recordings : [],
        created_at: data.created_at,
        updated_at: data.updated_at
      };

      // Update LocalStorage cache
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(localCacheKey, JSON.stringify(remoteEntry));
        } catch {}
      }

      return remoteEntry;
    }
  } catch (err) {
    console.warn('[teacherStudioService] Remote fetch error, using local:', err);
  }

  return defaultEntry;
}

/**
 * Saves teacher sandbox entry locally and remotely in Supabase.
 */
export async function saveTeacherSandboxEntry(
  entry: Partial<TeacherSandboxEntry> & { teacher_id: string; school_id: string }
): Promise<TeacherSandboxEntry> {
  const localCacheKey = `${LOCAL_STORAGE_KEY_PREFIX}${entry.teacher_id}`;
  const nowIso = new Date().toISOString();

  const merged: TeacherSandboxEntry = {
    id: entry.id || `local-sandbox-${entry.teacher_id}`,
    school_id: entry.school_id,
    teacher_id: entry.teacher_id,
    topic_name: entry.topic_name || 'Unterrichts-Vorbereitung',
    category: entry.category || 'lesson_prep',
    homework_notes: entry.homework_notes || '',
    teacher_notes: entry.teacher_notes || '',
    assigned_lehrwerke: entry.assigned_lehrwerke || [],
    assigned_songs: entry.assigned_songs || [],
    audio_recordings: entry.audio_recordings || [],
    updated_at: nowIso
  };

  // 1. Instant save to LocalStorage
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(localCacheKey, JSON.stringify(merged));
    } catch {}
  }

  // 2. Persist to Supabase if UUID is valid
  if (isUUID(entry.teacher_id) && isUUID(entry.school_id)) {
    try {
      const isRemoteId = entry.id && isUUID(entry.id);
      if (isRemoteId) {
        const { data, error } = await supabase
          .from('teacher_sandbox_entries')
          .update({
            topic_name: merged.topic_name,
            category: merged.category,
            homework_notes: merged.homework_notes,
            teacher_notes: merged.teacher_notes,
            assigned_lehrwerke: merged.assigned_lehrwerke,
            assigned_songs: merged.assigned_songs,
            audio_recordings: merged.audio_recordings,
            updated_at: nowIso
          })
          .eq('id', entry.id)
          .select()
          .maybeSingle();

        if (!error && data) {
          return { ...merged, id: data.id, updated_at: data.updated_at };
        }
      } else {
        const { data, error } = await supabase
          .from('teacher_sandbox_entries')
          .insert({
            school_id: entry.school_id,
            teacher_id: entry.teacher_id,
            topic_name: merged.topic_name,
            category: merged.category,
            homework_notes: merged.homework_notes,
            teacher_notes: merged.teacher_notes,
            assigned_lehrwerke: merged.assigned_lehrwerke,
            assigned_songs: merged.assigned_songs,
            audio_recordings: merged.audio_recordings,
            updated_at: nowIso
          })
          .select()
          .maybeSingle();

        if (!error && data) {
          merged.id = data.id;
          if (typeof window !== 'undefined') {
            localStorage.setItem(localCacheKey, JSON.stringify(merged));
          }
          return { ...merged, id: data.id, updated_at: data.updated_at };
        }
      }
    } catch (dbErr) {
      console.warn('[teacherStudioService] DB save notice:', dbErr);
    }
  }

  return merged;
}

/**
 * Autoritativer RPC: assignTeacherHomeworkToStudents
 * Kopiert vorbereitete Inhalte deterministisch in die Hausaufgabenhefte der Zielschüler.
 */
export async function assignTeacherHomeworkToStudents(
  params: AssignTeacherHomeworkParams
): Promise<AssignTeacherHomeworkResult> {
  const {
    teacherId,
    targetStudentIds,
    targetWeekIso,
    topicName,
    notesContent = '',
    lehrwerke = [],
    songs = [],
    audios = [],
    appendMode = true
  } = params;

  if (!teacherId || !targetStudentIds || targetStudentIds.length === 0) {
    return {
      success: false,
      assigned_count: 0,
      topic_name: topicName || 'Hausaufgabe',
      error: 'Keine Zielschüler ausgewählt.'
    };
  }

  try {
    const { data, error } = await supabase.rpc('assign_teacher_homework_to_students', {
      p_teacher_id: teacherId,
      p_target_student_ids: targetStudentIds,
      p_target_week_iso: targetWeekIso,
      p_topic_name: topicName || `Hausaufgabe ${targetWeekIso}`,
      p_notes_content: notesContent,
      p_lehrwerke_json: lehrwerke,
      p_songs_json: songs,
      p_audios_json: audios,
      p_append_mode: appendMode
    });

    if (error) {
      console.error('[teacherStudioService] RPC error:', error);
      return {
        success: false,
        assigned_count: 0,
        topic_name: topicName || 'Hausaufgabe',
        error: error.message
      };
    }

    // Trigger local broadcast so open modals update immediately
    if (typeof window !== 'undefined') {
      targetStudentIds.forEach(sId => {
        window.dispatchEvent(new CustomEvent('homework-updated', { detail: { studentId: sId } }));
      });
    }

    return {
      success: true,
      assigned_count: data?.assigned_count || targetStudentIds.length,
      topic_name: data?.topic_name || topicName || 'Hausaufgabe'
    };
  } catch (err: unknown) {
    console.error('[teacherStudioService] Unexpected assignment error:', err);
    return {
      success: false,
      assigned_count: 0,
      topic_name: topicName || 'Hausaufgabe',
      error: getErrorMessage(err, 'Unbekannter Fehler bei der Zuweisung.')
    };
  }
}
