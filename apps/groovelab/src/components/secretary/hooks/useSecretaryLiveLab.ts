import { useState, useEffect, useCallback } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';

export interface UseSecretaryLiveLabProps {
  schoolId: string;
  userId?: string;
  supabase: SupabaseClient<any, 'public', any>;
}

export function useSecretaryLiveLab({
  schoolId,
  userId,
  supabase
}: UseSecretaryLiveLabProps) {
  // Live session and monitoring states
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [helpRequests, setHelpRequests] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [liveSearchQuery, setLiveSearchQuery] = useState<string>('');

  // Notification and Toast state
  const [realtimeToast, setRealtimeToast] = useState<{ message: string; visible: boolean }>({
    message: '',
    visible: false
  });

  // Holiday Bonus XP state
  const [holidayXpActive, setHolidayXpActive] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && schoolId) {
      return localStorage.getItem(`groovelab_holiday_xp_active_${schoolId}`) === 'true';
    }
    return false;
  });

  // Viewport Zoom and Active Room Selection
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [zoomFactor, setZoomFactor] = useState<number>(1.0);

  // Sync zoom factor with localStorage per room and user
  useEffect(() => {
    if (selectedRoomId && userId && typeof window !== 'undefined') {
      const savedZoom = localStorage.getItem(`groovelab_room_zoom_${userId}_${selectedRoomId}`);
      if (savedZoom) {
        const parsed = parseFloat(savedZoom);
        if (!isNaN(parsed)) {
          setZoomFactor(parsed);
          return;
        }
      }
    }
    setZoomFactor(1.0);
  }, [selectedRoomId, userId]);

  const handleZoomChange = useCallback((value: number) => {
    setZoomFactor(value);
    if (selectedRoomId && userId && typeof window !== 'undefined') {
      localStorage.setItem(`groovelab_room_zoom_${userId}_${selectedRoomId}`, value.toString());
    }
  }, [selectedRoomId, userId]);

  const handleToggleHolidayXp = useCallback((newValue: boolean) => {
    setHolidayXpActive(newValue);
    if (typeof window !== 'undefined' && schoolId) {
      localStorage.setItem(`groovelab_holiday_xp_active_${schoolId}`, newValue ? 'true' : 'false');
    }
    alert(`Ferien Bonus XP erfolgreich ${newValue ? 'aktiviert' : 'deaktiviert'}.`);
  }, [schoolId]);

  // ---------------------------------------------------------------------------
  // Data Fetching: Active Sessions, Help Requests & Tickets
  // ---------------------------------------------------------------------------
  const fetchLiveStatusData = useCallback(async () => {
    if (!schoolId) return;
    try {
      // Fetch active sessions for Live Lab
      const { data: sessData, error: sessErr } = await supabase
        .from('sessions')
        .select('id, user_id, station_id, check_in_time, check_out_time, users!inner(id, first_name, last_name, instrument, avatar_url, photo_url, school_id), stations(id, name, school_id)')
        .is('check_out_time', null)
        .eq('users.school_id', schoolId);

      if (!sessErr && sessData) {
        const schoolSess = sessData
          .filter((s: any) => {
            const u = Array.isArray(s.users) ? s.users[0] : s.users;
            return u?.school_id === schoolId;
          })
          .map((s: any) => ({
            ...s,
            users: Array.isArray(s.users) ? s.users[0] : s.users,
            stations: Array.isArray(s.stations) ? s.stations[0] : s.stations
          }));
        setActiveSessions(schoolSess);
      }

      // Fetch help requests
      const { data: helpData } = await supabase
        .from('help_requests')
        .select('id, user_id, station_id, message, status, created_at, school_id, users(id, first_name, last_name, instrument)')
        .eq('school_id', schoolId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      setHelpRequests(helpData || []);

      // Fetch groovelab tickets
      const { data: ticketsData } = await supabase
        .from('groovelab_tickets')
        .select('id, school_id, title, status, priority, created_at')
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false });
      if (ticketsData) setTickets(ticketsData);

    } catch (err) {
      console.error('[useSecretaryLiveLab] Error fetching live status data:', err);
    }
  }, [schoolId, supabase]);

  const handleLogoutStudent = useCallback(async (sessionId: string) => {
    if (!window.confirm('Ausloggen?')) return;
    await supabase.from('sessions').update({ check_out_time: new Date().toISOString() }).eq('id', sessionId);
    fetchLiveStatusData();
  }, [supabase, fetchLiveStatusData]);

  const showRealtimeNotification = useCallback((message: string) => {
    setRealtimeToast({ message, visible: true });

    setTimeout(() => {
      setRealtimeToast(prev => ({ ...prev, visible: false }));
    }, 5000);

    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification('Campus-Groovelab', {
          body: message,
          icon: '/favicon.ico'
        });
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            new Notification('Campus-Groovelab', {
              body: message,
              icon: '/favicon.ico'
            });
          }
        });
      }
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Heartbeat & Visibility Lifecycle
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!schoolId) return;
    fetchLiveStatusData();

    // Visibility-aware heartbeat: real-time websockets handle instant events, heartbeat provides 60s backup
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchLiveStatusData();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchLiveStatusData();
      }
    }, 60000);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [schoolId, fetchLiveStatusData]);

  return {
    activeSessions,
    setActiveSessions,
    helpRequests,
    setHelpRequests,
    tickets,
    setTickets,
    liveSearchQuery,
    setLiveSearchQuery,
    realtimeToast,
    setRealtimeToast,
    holidayXpActive,
    setHolidayXpActive,
    selectedRoomId,
    setSelectedRoomId,
    zoomFactor,
    setZoomFactor,
    handleZoomChange,
    handleToggleHolidayXp,
    fetchLiveStatusData,
    handleLogoutStudent,
    showRealtimeNotification
  };
}
