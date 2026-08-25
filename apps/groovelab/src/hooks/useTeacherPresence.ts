import { useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { getDistanceFromLatLonInM } from '../utils/geo';
import { RoomRecord, StationRecord } from '../repositories/roomRepository';
import { UserProfile, SchoolRecord } from '../repositories/userRepository';

export interface UseTeacherPresenceOptions {
  userId: string;
  teacher: UserProfile | null;
  rooms: RoomRecord[];
  stations: StationRecord[];
  selectedRoomId: string | null;
  onSessionChange?: (session: any) => void;
  onLocationModeChange?: (mode: 'lab' | 'home') => void;
  onDataRefresh?: () => Promise<void>;
}

export function useTeacherPresence({
  userId,
  teacher,
  rooms,
  stations,
  selectedRoomId,
  onSessionChange,
  onLocationModeChange,
  onDataRefresh
}: UseTeacherPresenceOptions) {
  const [checkingInStatus, setCheckingInStatus] = useState<'idle' | 'locating' | 'verifying' | 'success' | 'error'>('idle');
  const [geoErrorMsg, setGeoErrorMsg] = useState('');
  const [localCheckedIn, setLocalCheckedIn] = useState(false);
  const localCheckedInRef = useRef(false);

  const performDirectTeacherCheckin = useCallback(async () => {
    if (!userId) return;
    setCheckingInStatus('verifying');
    const now = new Date().toISOString();

    try {
      // 1. Terminate existing sessions in DB
      await supabase.from('sessions').update({ check_out_time: now }).eq('user_id', userId).is('check_out_time', null);

      // Find the Lehrer iPad station for the selected room
      const lehrerStation = (stations || []).find(s => 
        s.room_id === selectedRoomId && 
        ((s.name || '').toLowerCase().includes('lehrer') || (s.name || '').toLowerCase().includes('teacher'))
      );
      let targetStationId = lehrerStation ? lehrerStation.id : null;

      // Defensive: Query DB directly if not in memory
      if (!targetStationId && selectedRoomId) {
        const { data: dbStations } = await supabase
          .from('stations')
          .select('id, name')
          .eq('room_id', selectedRoomId);

        const dbLehrer = (dbStations || []).find(s => 
          (s.name || '').toLowerCase().includes('lehrer') || (s.name || '').toLowerCase().includes('teacher')
        );
        if (dbLehrer) {
          targetStationId = dbLehrer.id;
        }
      }

      // 2. Insert session associated with Lehrer iPad station if found
      const { data: sessData, error: sessErr } = await supabase
        .from('sessions')
        .insert({
          user_id: userId,
          station_id: targetStationId,
          gps_verified: true,
          check_in_time: now
        })
        .select('*, stations(name)')
        .single();

      if (sessErr) {
        console.error('[useTeacherPresence] Session insert error:', sessErr);
        if (sessErr.message?.includes('DATABASE_CIRCUIT_OPEN') || sessErr.message?.includes('Failed to fetch') || sessErr.message?.includes('NetworkError')) {
          console.warn('[useTeacherPresence] Offline/Circuit mode active. Enabling optimistic local check-in.');
          setCheckingInStatus('success');
          sessionStorage.setItem('groovelab_location_mode', 'lab');
          localCheckedInRef.current = true;
          setLocalCheckedIn(true);
          if (onLocationModeChange) onLocationModeChange('lab');
        } else {
          setCheckingInStatus('error');
        }
      } else {
        setCheckingInStatus('success');
        sessionStorage.setItem('groovelab_location_mode', 'lab');
        localCheckedInRef.current = true;
        setLocalCheckedIn(true);

        if (onSessionChange) onSessionChange(sessData);
        if (onLocationModeChange) onLocationModeChange('lab');
        if (onDataRefresh) await onDataRefresh();
      }
    } catch (e: any) {
      console.error('[useTeacherPresence] Unexpected error during checkin:', e);
      if (e?.message?.includes('DATABASE_CIRCUIT_OPEN') || e?.message?.includes('Failed to fetch') || e?.message?.includes('NetworkError')) {
        setCheckingInStatus('success');
        sessionStorage.setItem('groovelab_location_mode', 'lab');
        localCheckedInRef.current = true;
        setLocalCheckedIn(true);
        if (onLocationModeChange) onLocationModeChange('lab');
      } else {
        setCheckingInStatus('error');
      }
    }
  }, [userId, selectedRoomId, stations, onSessionChange, onLocationModeChange, onDataRefresh]);

  const verifyGeofenceAndCheckin = useCallback((schoolData?: SchoolRecord | null) => {
    const isLocalhost = typeof window !== 'undefined' && (
      window.location.hostname === 'localhost' || 
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname.endsWith('.local') ||
      /^192\.168\./.test(window.location.hostname) ||
      /^10\./.test(window.location.hostname)
    );

    const hasGeofenceBypass = !!(schoolData?.opening_hours?.geofence_bypass);
    if (isLocalhost || hasGeofenceBypass) {
      performDirectTeacherCheckin();
      return;
    }

    setCheckingInStatus('locating');
    setGeoErrorMsg('');

    if (!navigator.geolocation) {
      setCheckingInStatus('error');
      setGeoErrorMsg('Geolocation wird von deinem Browser nicht unterstützt.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        setCheckingInStatus('verifying');
        const currentPos = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };

        let isWithinAnyRoom = false;
        if (rooms && rooms.length > 0) {
          for (const room of rooms) {
            const points = Array.isArray(room.geofence_points) ? room.geofence_points : [];
            const allCoords = [...points];
            if (room.latitude && room.longitude) {
              allCoords.push({ lat: room.latitude, lng: room.longitude });
            }

            for (const pt of allCoords) {
              if (pt && pt.lat && pt.lng) {
                const dist = getDistanceFromLatLonInM(currentPos.lat, currentPos.lng, Number(pt.lat), Number(pt.lng));
                if (dist < 100) {
                  isWithinAnyRoom = true;
                  break;
                }
              }
            }
            if (isWithinAnyRoom) break;
          }
        }

        if (isWithinAnyRoom) {
          performDirectTeacherCheckin();
        } else {
          setCheckingInStatus('error');
          setGeoErrorMsg('Du befindest dich anscheinend nicht vor Ort in der Musikschule.');
        }
      },
      () => {
        setCheckingInStatus('error');
        setGeoErrorMsg('Standortzugriff wurde verweigert oder ist nicht verfügbar.');
      }
    );
  }, [rooms, performDirectTeacherCheckin]);

  return {
    checkingInStatus,
    setCheckingInStatus,
    geoErrorMsg,
    localCheckedIn,
    setLocalCheckedIn,
    localCheckedInRef,
    performDirectTeacherCheckin,
    verifyGeofenceAndCheckin
  };
}
