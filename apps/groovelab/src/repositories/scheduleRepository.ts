import { supabase } from '../lib/supabase';
import { dedupeQuery } from '../utils/dedupeQuery';

export interface ScheduleSlot {
  id: string;
  teacher_id: string;
  student_id?: string;
  day_of_week: number;
  time_slot: string;
  duration_minutes?: number;
  room_id?: string;
  instrument?: string;
  status?: string;
  students?: any;
  rooms?: any;
}

export interface CrisisNotification {
  id: string;
  teacher_id?: string;
  student_id?: string;
  school_id?: string;
  slot_start_datetime: string;
  status: string;
  teacher_contact_status?: string;
  teacher_contacted_at?: string;
  student?: {
    id: string;
    first_name: string;
    last_name: string;
  };
}

export async function fetchTeacherSchedules(teacherId: string, schoolId: string): Promise<ScheduleSlot[]> {
  if (!teacherId) return [];
  return dedupeQuery(`schedules_${teacherId}`, async () => {
    try {
      const { data, error } = await supabase
        .from('schedules')
        .select('*, students:users!schedules_student_id_fkey(*), rooms(*)')
        .eq('teacher_id', teacherId);

      if (error) {
        console.warn('[ScheduleRepository] Error fetching teacher schedules:', error);
        return [];
      }
      return data || [];
    } catch (err) {
      console.error('[ScheduleRepository] Unexpected error in fetchTeacherSchedules:', err);
      return [];
    }
  });
}

export async function fetchCrisisNotifications(targetId: string, isSchoolLevel = false): Promise<CrisisNotification[]> {
  if (!targetId) return [];
  return dedupeQuery(`crisis_${targetId}_${isSchoolLevel}`, async () => {
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const query = supabase
        .from('crisis_notifications')
        .select('*, student:users!crisis_notifications_student_id_fkey(id, first_name, last_name)')
        .gte('slot_start_datetime', sevenDaysAgo)
        .order('slot_start_datetime', { ascending: true });

      if (isSchoolLevel) {
        query.eq('school_id', targetId);
      } else {
        query.eq('teacher_id', targetId);
      }

      const { data, error } = await query;
      if (error) {
        console.warn('[ScheduleRepository] Error fetching crisis notifications:', error);
        return [];
      }
      return (data || []) as CrisisNotification[];
    } catch (err) {
      console.error('[ScheduleRepository] Unexpected error in fetchCrisisNotifications:', err);
      return [];
    }
  });
}

// In-memory runtime cache for 0ms same-tick lookups and SWR tab-switching
const inMemoryActiveSessions = new Map<string, { timestamp: number; data: any[] }>();
const SESSIONS_CACHE_TTL_MS = 15 * 1000; // 15 seconds SWR TTL

export async function fetchActiveSessions(schoolId: string, force = false): Promise<any[]> {
  if (!schoolId) return [];

  if (!force && inMemoryActiveSessions.has(schoolId)) {
    const cached = inMemoryActiveSessions.get(schoolId)!;
    if (Date.now() - cached.timestamp < SESSIONS_CACHE_TTL_MS) {
      return cached.data;
    }
  }

  return dedupeQuery(`active_sessions_${schoolId}`, async () => {
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select(`
          id, user_id, station_id, check_in_time, check_out_time,
          users!inner(id, first_name, last_name, instrument, photo_url, role, school_id),
          stations(id, name, color, instrument, pos_x, pos_y, room_id)
        `)
        .is('check_out_time', null)
        .eq('users.school_id', schoolId);

      if (error) {
        console.warn('[ScheduleRepository] Error fetching active sessions:', error);
        return inMemoryActiveSessions.get(schoolId)?.data || [];
      }
      const result = data || [];
      inMemoryActiveSessions.set(schoolId, { timestamp: Date.now(), data: result });
      return result;
    } catch (err) {
      console.error('[ScheduleRepository] Unexpected error in fetchActiveSessions:', err);
      return inMemoryActiveSessions.get(schoolId)?.data || [];
    }
  });
}

/**
 * Synchronously retrieves cached active sessions from in-memory cache.
 * Returns null if not cached or expired.
 */
export function getCachedActiveSessionsSync(schoolId: string): any[] | null {
  if (!schoolId) return null;
  const cached = inMemoryActiveSessions.get(schoolId);
  if (cached && Date.now() - cached.timestamp < SESSIONS_CACHE_TTL_MS) {
    return cached.data;
  }
  return null;
}
