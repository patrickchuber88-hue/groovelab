import { supabase } from '../lib/supabase';
import { getItemWithTTL, setItemWithTTL } from '../utils/ttlCache';

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

export async function fetchRoomsBySchool(schoolId: string, force = false): Promise<RoomRecord[]> {
  if (!schoolId) return [];

  if (!force && inMemoryRooms.has(schoolId)) {
    const cached = inMemoryRooms.get(schoolId)!;
    if (Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }
  }

  const persistentKey = `campus_rooms_${schoolId}`;
  if (!force) {
    const cached = getItemWithTTL<RoomRecord[]>(persistentKey);
    if (cached && cached.length > 0) {
      inMemoryRooms.set(schoolId, { timestamp: Date.now(), data: cached });
      return cached;
    }
  }

  try {
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('school_id', schoolId)
      .eq('is_groovelab_active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      console.warn('[RoomRepository] Error fetching rooms:', error);
      return inMemoryRooms.get(schoolId)?.data || [];
    }

    const result = data || [];
    inMemoryRooms.set(schoolId, { timestamp: Date.now(), data: result });
    setItemWithTTL(persistentKey, result, CACHE_TTL_MS);
    return result;
  } catch (err) {
    console.error('[RoomRepository] Unexpected error in fetchRoomsBySchool:', err);
    return inMemoryRooms.get(schoolId)?.data || [];
  }
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

  try {
    const { data, error } = await supabase
      .from('stations')
      .select('*, rooms!inner(school_id, is_groovelab_active)')
      .eq('rooms.school_id', schoolId)
      .eq('rooms.is_groovelab_active', true)
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
}
