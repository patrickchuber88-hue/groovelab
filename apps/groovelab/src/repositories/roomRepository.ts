import { supabase } from '../lib/supabase';
import { getItemWithTTL, setItemWithTTL } from '../utils/ttlCache';
import { dedupeQuery } from '../utils/dedupeQuery';

export interface RoomRecord {
  id: string;
  school_id: string;
  name: string;
  sort_order?: number;
  is_groovelab_active?: boolean;
  latitude?: number | null;
  longitude?: number | null;
  geofence_points?: Array<{ lat: number; lng: number }> | null;
}

export interface StationRecord {
  id: string;
  room_id: string;
  name: string;
  instrument?: string;
  color?: string;
  rooms?: {
    school_id: string;
    is_groovelab_active?: boolean;
  };
}

// In-memory runtime cache for 0ms same-tick lookups
const inMemoryRooms = new Map<string, { timestamp: number; data: RoomRecord[] }>();
const inMemoryStations = new Map<string, { timestamp: number; data: StationRecord[] }>();
const CACHE_TTL_MS = 60 * 1000; // 60 seconds TTL

export async function fetchRoomsBySchool(schoolId: string, force = false, activePlatform?: string): Promise<RoomRecord[]> {
  if (!schoolId) return [];

  const persistentKey = activePlatform 
    ? `campus_all_rooms_${schoolId}_${activePlatform}`
    : `campus_all_rooms_${schoolId}`;

  const memoryKey = `${schoolId}_${activePlatform || 'all'}`;

  if (!force && inMemoryRooms.has(memoryKey)) {
    const cached = inMemoryRooms.get(memoryKey)!;
    if (Date.now() - cached.timestamp < CACHE_TTL_MS && cached.data.length > 0) {
      return cached.data;
    }
  }

  if (!force) {
    const cached = getItemWithTTL<RoomRecord[]>(persistentKey);
    if (cached && cached.length > 0) {
      inMemoryRooms.set(memoryKey, { timestamp: Date.now(), data: cached });
      return cached;
    }
  }

  return dedupeQuery(`rooms_${schoolId}_${activePlatform || 'all'}`, async () => {
    try {
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('school_id', schoolId)
        .order('sort_order', { ascending: true });

      if (error) {
        console.warn('[RoomRepository] Error fetching rooms:', error);
        return inMemoryRooms.get(memoryKey)?.data || [];
      }

      const allRooms = data || [];
      let result = allRooms;
      if (activePlatform === 'groovelab') {
        // Tolerant filtering: only exclude explicitly deactivated rooms (true or null/undefined remain active)
        result = allRooms.filter(r => r.is_groovelab_active !== false);
      } else if (activePlatform === 'campus') {
        result = allRooms.filter(r => r.is_campus_active !== false);
      }

      // Fail-open protection: If platform-specific filtering returned 0 rooms but school has rooms, keep all rooms
      if (result.length === 0 && allRooms.length > 0) {
        result = allRooms;
      }

      if (result.length > 0) {
        inMemoryRooms.set(memoryKey, { timestamp: Date.now(), data: result });
        setItemWithTTL(persistentKey, result, CACHE_TTL_MS);
      }
      return result;
    } catch (err) {
      console.error('[RoomRepository] Unexpected error in fetchRoomsBySchool:', err);
      return inMemoryRooms.get(memoryKey)?.data || [];
    }
  });
}

export async function fetchStationsBySchool(schoolId: string, force = false): Promise<StationRecord[]> {
  if (!schoolId) return [];

  if (!force && inMemoryStations.has(schoolId)) {
    const cached = inMemoryStations.get(schoolId)!;
    if (Date.now() - cached.timestamp < CACHE_TTL_MS && cached.data.length > 0) {
      return cached.data;
    }
  }

  const persistentKey = `campus_stations_${schoolId}`;
  if (!force) {
    const cached = getItemWithTTL<StationRecord[]>(persistentKey);
    if (cached && cached.length > 0) {
      inMemoryStations.set(schoolId, { timestamp: Date.now(), data: cached });
      return cached;
    }
  }

  return dedupeQuery(`stations_${schoolId}`, async () => {
    try {
      // ⚡ 0,1% Goldstandard 3-Tier Resilient Station Query:
      // Tier 1: Direct query by school_id (standard in modern tenant schema)
      let { data, error } = await supabase
        .from('stations')
        .select('*')
        .eq('school_id', schoolId)
        .order('name');

      // Tier 2: Relational join via rooms if direct school_id query returned 0 rows or errored
      if (error || !data || data.length === 0) {
        const joinRes = await supabase
          .from('stations')
          .select('*, rooms!inner(school_id, is_groovelab_active, is_campus_active)')
          .eq('rooms.school_id', schoolId)
          .order('name');
        if (!joinRes.error && joinRes.data && joinRes.data.length > 0) {
          data = joinRes.data;
          error = null;
        }
      }

      // Tier 3: Query stations matching known room IDs of the school
      if (error || !data || data.length === 0) {
        const roomsRes = await supabase.from('rooms').select('id').eq('school_id', schoolId);
        const roomIds = (roomsRes.data || []).map((r: any) => r.id);
        if (roomIds.length > 0) {
          const byRoomsRes = await supabase
            .from('stations')
            .select('*')
            .in('room_id', roomIds)
            .order('name');
          if (!byRoomsRes.error && byRoomsRes.data && byRoomsRes.data.length > 0) {
            data = byRoomsRes.data;
            error = null;
          }
        }
      }

      if (error) {
        console.warn('[RoomRepository] Error fetching stations:', error);
        return inMemoryStations.get(schoolId)?.data || [];
      }

      const result = data || [];
      if (result.length > 0) {
        inMemoryStations.set(schoolId, { timestamp: Date.now(), data: result });
        setItemWithTTL(persistentKey, result, CACHE_TTL_MS);
      }
      return result;
    } catch (err) {
      console.error('[RoomRepository] Unexpected error in fetchStationsBySchool:', err);
      return inMemoryStations.get(schoolId)?.data || [];
    }
  });
}

/**
 * Synchronously retrieves cached rooms from in-memory cache or localStorage TTL cache.
 * Returns null if not cached or expired.
 */
export function getCachedRoomsSync(schoolId: string, activePlatform?: string): RoomRecord[] | null {
  if (!schoolId) return null;
  const memoryKey = `${schoolId}_${activePlatform || 'all'}`;
  const mem = inMemoryRooms.get(memoryKey);
  if (mem && Date.now() - mem.timestamp < CACHE_TTL_MS) {
    return mem.data;
  }
  const persistentKey = activePlatform 
    ? `campus_all_rooms_${schoolId}_${activePlatform}`
    : `campus_all_rooms_${schoolId}`;
  const cached = getItemWithTTL<RoomRecord[]>(persistentKey);
  if (cached && cached.length > 0) {
    inMemoryRooms.set(memoryKey, { timestamp: Date.now(), data: cached });
    return cached;
  }
  return null;
}

/**
 * Synchronously retrieves cached stations from in-memory cache or localStorage TTL cache.
 * Returns null if not cached or expired.
 */
export function getCachedStationsSync(schoolId: string): StationRecord[] | null {
  if (!schoolId) return null;
  const mem = inMemoryStations.get(schoolId);
  if (mem && Date.now() - mem.timestamp < CACHE_TTL_MS) {
    return mem.data;
  }
  const persistentKey = `campus_stations_${schoolId}`;
  const cached = getItemWithTTL<StationRecord[]>(persistentKey);
  if (cached && cached.length > 0) {
    inMemoryStations.set(schoolId, { timestamp: Date.now(), data: cached });
    return cached;
  }
  return null;
}
