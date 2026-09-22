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
    if (Date.now() - cached.timestamp < CACHE_TTL_MS) {
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
        result = allRooms.filter(r => Boolean(r.is_groovelab_active));
      } else if (activePlatform === 'campus') {
        result = allRooms.filter(r => r.is_campus_active !== false);
      }

      inMemoryRooms.set(memoryKey, { timestamp: Date.now(), data: result });
      setItemWithTTL(persistentKey, result, CACHE_TTL_MS);
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
    if (Date.now() - cached.timestamp < CACHE_TTL_MS) {
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
      const { data, error } = await supabase
        .from('stations')
        .select('*, rooms!stations_room_id_fkey!inner(school_id, is_groovelab_active, is_campus_active)')
        .eq('rooms.school_id', schoolId)
        .order('name');

      if (error) {
        console.warn('[RoomRepository] Error fetching stations:', error);
        return inMemoryStations.get(schoolId)?.data || [];
      }

      const result = data || [];
      inMemoryStations.set(schoolId, { timestamp: Date.now(), data: result });
      setItemWithTTL(persistentKey, result, CACHE_TTL_MS);
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
