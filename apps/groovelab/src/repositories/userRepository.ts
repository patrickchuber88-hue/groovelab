import { supabase } from '../lib/supabase';
import { getItemWithTTL, setItemWithTTL } from '../utils/ttlCache';
import { dedupeQuery } from '../utils/dedupeQuery';

export interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
  role: string;
  roles?: string[];
  school_id: string;
  avatar_url?: string;
  photo_url?: string;
  instrument?: string;
  last_seen?: string;
  sick_start?: string | null;
  sick_until?: string | null;
  is_campus_active?: boolean;
  is_groovelab_active?: boolean;
  schools?: any;
  day_of_birth?: string | null;
  briefing_sidebar_collapsed?: boolean;
  is_ghost_mode?: boolean;
  is_observer?: boolean;
  [key: string]: any;
}

export interface SchoolRecord {
  id: string;
  name: string;
  calendar_url?: string;
  has_campus_subscription?: boolean;
  has_groovelab_subscription?: boolean;
  storage_addon_gb?: number;
  storage_addon_status?: string;
  latitude?: number | null;
  longitude?: number | null;
  geofence_radius_meters?: number | null;
  opening_hours?: {
    geofence_bypass?: boolean;
  };
}

export async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  if (!userId) return null;
  return dedupeQuery(`user_profile_${userId}`, async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*, schools(*)')
        .eq('id', userId)
        .maybeSingle();

      if (error || !data) {
        // Fallback: query users directly if join failed
        const { data: fallbackUser } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .maybeSingle();
        return fallbackUser || null;
      }
      return data as UserProfile;
    } catch (err) {
      console.error('[UserRepository] Error fetching user profile:', err);
      return null;
    }
  });
}

export async function fetchSchoolStaff(schoolId: string): Promise<UserProfile[]> {
  if (!schoolId) return [];
  return dedupeQuery(`school_staff_${schoolId}`, async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .in('role', ['teacher', 'admin', 'secretary'])
        .eq('school_id', schoolId);

      if (error) {
        console.warn('[UserRepository] Error fetching school staff:', error);
        return [];
      }
      return (data || []) as UserProfile[];
    } catch (err) {
      console.error('[UserRepository] Unexpected error in fetchSchoolStaff:', err);
      return [];
    }
  });
}

export async function fetchSchoolById(schoolId: string, force = false): Promise<SchoolRecord | null> {
  if (!schoolId) return null;

  const persistentKey = `campus_school_${schoolId}`;
  if (!force) {
    const cached = getItemWithTTL<SchoolRecord>(persistentKey);
    if (cached) return cached;
  }

  return dedupeQuery(`school_${schoolId}`, async () => {
    try {
      const { data, error } = await supabase
        .from('schools')
        .select('*')
        .eq('id', schoolId)
        .maybeSingle();

      if (error) {
        console.warn('[UserRepository] Error fetching school data:', error);
        return null;
      }
      if (data) {
        setItemWithTTL(persistentKey, data, 2 * 60 * 1000); // 2 minutes cache
      }
      return data as SchoolRecord;
    } catch (err) {
      console.error('[UserRepository] Unexpected error in fetchSchoolById:', err);
      return null;
    }
  });
}

export function updateUserPresence(userId: string): void {
  if (!userId || typeof window === 'undefined') return;
  supabase
    .from('users')
    .update({ last_seen: new Date().toISOString() })
    .eq('id', userId)
    .then(() => {});
}
