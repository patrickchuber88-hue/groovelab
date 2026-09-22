import { useState, useRef, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';

export interface UseTeacherLiveLabProps {
  userId: string;
  teacher: any;
  selectedRoomId: string | null;
  stations: any[];
  setCoaches: React.Dispatch<React.SetStateAction<any[]>>;
  setActiveSessions: React.Dispatch<React.SetStateAction<any[]>>;
  session?: any;
  activeSessions?: any[];
  onSessionChange?: (sess: any) => void;
  onLocationModeChange?: (mode: 'lab' | 'home') => void;
  fetchData: () => Promise<void>;
  unreadShouts?: any[];
  setUnreadShouts?: React.Dispatch<React.SetStateAction<any[]>>;
  setHelpRequests?: React.Dispatch<React.SetStateAction<any[]>>;
}

export function useTeacherLiveLab({
  userId,
  teacher,
  selectedRoomId,
  stations,
  setCoaches,
  setActiveSessions,
  session,
  activeSessions = [],
  onSessionChange,
  onLocationModeChange,
  fetchData,
  unreadShouts = [],
  setUnreadShouts,
  setHelpRequests
}: UseTeacherLiveLabProps) {
  const [showKioskView, setShowKioskView] = useState(false);
  const [showKioskPinSetup, setShowKioskPinSetup] = useState(false);
  const [kioskPinInput, setKioskPinInput] = useState('');
  const [targetKioskStation, setTargetKioskStation] = useState<any | null>(null);

  const [checkingInStatus, setCheckingInStatus] = useState<'idle' | 'locating' | 'verifying' | 'success' | 'error'>('idle');
  const [checkInErrorMsg, setCheckInErrorMsg] = useState('');
  const [shakeLock, setShakeLock] = useState(false);

  const localCheckedInRef = useRef(false);
  const [localCheckedIn, setLocalCheckedIn] = useState(false);

  const isTeacher = teacher?.role?.toLowerCase() === 'teacher' || teacher?.role?.toLowerCase() === 'admin';
  const isUserCheckedIn = localCheckedIn || 
    (!!session && !session.check_out_time && (session.user_id === userId || !!session.station_id)) || 
    (activeSessions && activeSessions.some((s: any) => s && s.user_id === userId && !s.check_out_time));

  const performDirectTeacherCheckin = useCallback(async () => {
    setCheckInErrorMsg('');
    setCheckingInStatus('verifying');
    const now = new Date().toISOString();
    try {
      await supabase.from('sessions').update({ check_out_time: now }).eq('user_id', userId).is('check_out_time', null);
      
      const lehrerStation = (stations || []).find(s => 
        s.room_id === selectedRoomId && 
        ((s.name || '').toLowerCase().includes('lehrer') || (s.name || '').toLowerCase().includes('teacher'))
      );
      let targetStationId = lehrerStation ? lehrerStation.id : null;

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
        console.error('[Teacher Check-in] Error:', sessErr);
        if (sessErr.message?.includes('DATABASE_CIRCUIT_OPEN') || sessErr.message?.includes('Failed to fetch') || sessErr.message?.includes('NetworkError')) {
          setCheckingInStatus('success');
          sessionStorage.setItem('groovelab_location_mode', 'lab');
          localCheckedInRef.current = true;
          setLocalCheckedIn(true);
          if (onLocationModeChange) onLocationModeChange('lab');
        } else {
          setCheckInErrorMsg(sessErr.message || 'Fehler beim Anmelden am Live Lab');
          setCheckingInStatus('error');
        }
      } else {
        setCheckingInStatus('success');
        sessionStorage.setItem('groovelab_location_mode', 'lab');
        localCheckedInRef.current = true;
        setLocalCheckedIn(true);
        setCoaches(prev => {
          if (!teacher) return prev;
          const alreadyIn = prev.some(c => c && c.id === userId);
          if (alreadyIn) return prev;
          return [{ id: userId, users: teacher, session: sessData }, ...prev];
        });
        if (onSessionChange) onSessionChange(sessData);
        if (onLocationModeChange) onLocationModeChange('lab');
        await fetchData();
        if (localCheckedInRef.current && teacher) {
          setCoaches(prev => {
            const alreadyIn = prev.some(c => c && c.id === userId);
            if (alreadyIn) return prev;
            return [{ id: userId, users: teacher, session: sessData }, ...prev];
          });
        }
      }
    } catch (err: any) {
      console.error('[Teacher Check-in] Catch error:', err);
      setCheckInErrorMsg(err?.message || 'Fehler beim Anmelden');
      setCheckingInStatus('error');
    }
  }, [userId, stations, selectedRoomId, teacher, setCoaches, onSessionChange, onLocationModeChange, fetchData]);

  const handleLiveLabCheckIn = useCallback(() => {
    setCheckInErrorMsg('');
    if (isTeacher) {
      performDirectTeacherCheckin();
    } else {
      setCheckingInStatus('success');
      setShowKioskView(true);
    }
  }, [isTeacher, performDirectTeacherCheckin]);

  const handleKioskStationSelect = useCallback(async (station: any) => {
    if (!userId) return;
    setCheckingInStatus('verifying');
    const now = new Date().toISOString();

    try {
      await Promise.all([
        supabase.from('sessions').update({ 
          check_out_time: now,
          metadata: { is_switching_station: true }
        }).eq('user_id', userId).is('check_out_time', null),
        (!isTeacher)
          ? supabase.from('sessions').update({ check_out_time: now }).eq('station_id', station.id).is('check_out_time', null)
          : Promise.resolve()
      ]);

      const { data: sessData, error: sessErr } = await supabase
        .from('sessions')
        .insert({
          user_id: userId,
          station_id: station.id,
          gps_verified: true,
          check_in_time: now
        })
        .select('*, stations(name)')
        .single();

      if (sessErr) {
        if (sessErr.message?.includes('DATABASE_CIRCUIT_OPEN') || sessErr.message?.includes('Failed to fetch') || sessErr.message?.includes('NetworkError')) {
          if (onLocationModeChange) onLocationModeChange('lab');
          localCheckedInRef.current = true;
          setLocalCheckedIn(true);
          setShowKioskView(false);
          setCheckingInStatus('idle');
        } else {
          alert('Fehler beim Einchecken: ' + sessErr.message);
          setCheckingInStatus('error');
        }
        return;
      }

      localCheckedInRef.current = true;
      setLocalCheckedIn(true);
      if (onSessionChange) onSessionChange(sessData);
      if (onLocationModeChange) onLocationModeChange('lab');

      await fetchData();
      setShowKioskView(false);
      setCheckingInStatus('idle');
    } catch (err: any) {
      console.error('[Kiosk Check-in] Catch error:', err);
      alert('Fehler beim Einchecken: ' + (err?.message || String(err)));
      setCheckingInStatus('error');
    }
  }, [userId, isTeacher, onSessionChange, onLocationModeChange, fetchData]);

  const handleTeacherSelfCheckout = useCallback(async () => {
    if (!window.confirm('Vom Lehrer iPad abmelden?')) return;
    try {
      const now = new Date().toISOString();
      await supabase.from('sessions').update({ check_out_time: now }).eq('user_id', userId).is('check_out_time', null);
      localCheckedInRef.current = false;
      setLocalCheckedIn(false);
      setActiveSessions(prev => prev.filter(s => s && s.user_id !== userId));
      setCoaches(prev => prev.filter(c => c && c.id !== userId));
      setCheckingInStatus('idle');
      if (onSessionChange) onSessionChange(null);
      if (onLocationModeChange) onLocationModeChange('home');
      sessionStorage.setItem('groovelab_location_mode', 'home');
      await fetchData();
    } catch (err) {
      console.error('Failed to self checkout:', err);
      alert('Fehler beim Abmelden.');
    }
  }, [userId, onSessionChange, onLocationModeChange, setActiveSessions, setCoaches, fetchData]);

  const handleTeacherCheckout = useCallback(async (coach: any) => {
    if (!coach) return;
    const coachName = `${coach.users?.first_name || ''} ${coach.users?.last_name || ''}`.trim();
    if (!window.confirm(`Möchtest du Coach ${coachName} wirklich abmelden?`)) return;
    try {
      const now = new Date().toISOString();
      await supabase.from('sessions').update({ check_out_time: now }).eq('user_id', coach.id).is('check_out_time', null);
      await fetchData();
    } catch (err) {
      console.error('Failed to checkout coach:', err);
      alert('Fehler beim Abmelden des Coaches.');
    }
  }, [fetchData]);

  const handleLogoutStudent = useCallback(async (sessionId: string) => {
    if (!window.confirm('Ausloggen?')) return;
    try {
      const { error } = await supabase.from('sessions').update({ check_out_time: new Date().toISOString() }).eq('id', sessionId);
      if (error) {
        alert('Fehler beim Ausloggen: ' + error.message);
        return;
      }
      await fetchData();
    } catch (err: any) {
      console.error('Failed to logout student:', err);
      alert('Fehler beim Ausloggen: ' + (err?.message || 'Unbekannter Fehler'));
    }
  }, [fetchData]);

  const handleResolveHelp = useCallback(async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('help_requests')
        .update({ status: 'resolved' })
        .eq('id', requestId);
      
      if (!error && setHelpRequests) {
        setHelpRequests(prev => prev.filter(r => r.id !== requestId));
      }
    } catch (err) {
      console.error('Failed to resolve help request:', err);
    }
  }, [setHelpRequests]);

  const handleMarkAsRead = useCallback(async (shoutId: string) => {
    if (!userId) return;
    try {
      const shout = (unreadShouts || []).find(s => s.id === shoutId);
      if (!shout) return;
      
      const newReadBy = [...(shout.read_by || []), userId];
      const { error } = await supabase.from('band_shoutbox').update({ read_by: newReadBy }).eq('id', shoutId);
      if (!error && setUnreadShouts) {
        setUnreadShouts(prev => prev.filter(s => s.id !== shoutId));
      }
    } catch (err) {
      console.error('Failed to mark shout as read:', err);
    }
  }, [userId, unreadShouts, setUnreadShouts]);

  const handleMarkAllAsRead = useCallback(async () => {
    if (!userId || !unreadShouts || unreadShouts.length === 0) return;
    try {
      const updates = unreadShouts.map(shout => ({
        id: shout.id,
        read_by: [...(shout.read_by || []), userId]
      }));

      for (const update of updates) {
        await supabase.from('band_shoutbox').update({ read_by: update.read_by }).eq('id', update.id);
      }
      if (setUnreadShouts) {
        setUnreadShouts([]);
      }
    } catch (err) {
      console.error('Failed to mark all shouts as read:', err);
    }
  }, [userId, unreadShouts, setUnreadShouts]);

  const [wallSongs, setWallSongs] = useState<any[]>([]);
  const [rehearsalSuggestions, setRehearsalSuggestions] = useState<any[]>([]);

  return {
    showKioskView,
    setShowKioskView,
    showKioskPinSetup,
    setShowKioskPinSetup,
    kioskPinInput,
    setKioskPinInput,
    targetKioskStation,
    setTargetKioskStation,
    checkingInStatus,
    setCheckingInStatus,
    checkInErrorMsg,
    setCheckInErrorMsg,
    shakeLock,
    setShakeLock,
    isUserCheckedIn,
    handleLiveLabCheckIn,
    handleKioskStationSelect,
    handleTeacherSelfCheckout,
    handleTeacherCheckout,
    handleLogoutStudent,
    handleResolveHelp,
    handleMarkAsRead,
    handleMarkAllAsRead,
    wallSongs,
    setWallSongs,
    rehearsalSuggestions,
    setRehearsalSuggestions
  };
}
