import { useState, useEffect, useCallback } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';
import { notesService, UserNote } from '../../../services/notesService';

export interface UseSecretaryBookingsProps {
  schoolId: string;
  supabase: SupabaseClient<any, 'public', any>;
}

export function useSecretaryBookings({
  schoolId,
  supabase
}: UseSecretaryBookingsProps) {
  // Pending room booking requests
  const [pendingBookings, setPendingBookings] = useState<any[]>([]);

  // Logbook room booking history & editing states
  const [logbookBookings, setLogbookBookings] = useState<any[]>([]);
  const [editingLogbookBookingId, setEditingLogbookBookingId] = useState<string | null>(null);
  const [editBookingDate, setEditBookingDate] = useState<string>('');
  const [editBookingStartTime, setEditBookingStartTime] = useState<string>('');
  const [editBookingEndTime, setEditBookingEndTime] = useState<string>('');
  const [editBookingTitle, setEditBookingTitle] = useState<string>('');
  const [editBookingRoomId, setEditBookingRoomId] = useState<string>('');

  // Facility defect notes & modal visibility states
  const [roomIssues, setRoomIssues] = useState<UserNote[]>([]);
  const [showLogbookModal, setShowLogbookModal] = useState<boolean>(false);
  const [showFacilityLogModal, setShowFacilityLogModal] = useState<boolean>(false);

  // ---------------------------------------------------------------------------
  // Room Issues (Facility Defects) Fetch & Handlers
  // ---------------------------------------------------------------------------
  const fetchRoomIssues = useCallback(async () => {
    if (!schoolId) return;
    try {
      const fetchedIssues = await notesService.fetchSchoolRoomIssues(schoolId);
      setRoomIssues(fetchedIssues);
    } catch (err) {
      console.warn('[useSecretaryBookings] Real-time room issues sync notice:', err);
    }
  }, [schoolId]);

  const handleResolveRoomIssue = useCallback(async (issueId: string) => {
    await notesService.resolveRoomIssue(issueId, 'secretary', schoolId);
    setRoomIssues(prev => prev.map(n => n.id === issueId ? {
      ...n,
      is_completed: true,
      is_acknowledged: true,
      acknowledged_at: new Date().toISOString(),
      resolved_by: 'secretary'
    } : n));
  }, [schoolId]);

  const handleReopenRoomIssue = useCallback(async (issueId: string) => {
    await notesService.reopenRoomIssue(issueId, schoolId);
    setRoomIssues(prev => prev.map(n => n.id === issueId ? {
      ...n,
      is_completed: false,
      is_acknowledged: false,
      acknowledged_at: null,
      resolved_by: null
    } : n));
  }, [schoolId]);

  // ---------------------------------------------------------------------------
  // Pending Room Bookings Fetch & Handlers
  // ---------------------------------------------------------------------------
  const fetchPendingBookings = useCallback(async () => {
    if (!schoolId) return;
    try {
      const { data, error } = await supabase
        .from('room_bookings')
        .select(`
          id,
          room_id,
          date,
          start_time,
          end_time,
          title,
          booked_by,
          rooms:room_id (
            name
          ),
          profiles:users!booked_by (
            first_name,
            last_name
          )
        `)
        .eq('school_id', schoolId)
        .eq('status', 'pending')
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) throw error;
      setPendingBookings(data || []);
    } catch (err) {
      console.error('[useSecretaryBookings] Error fetching pending room bookings:', err);
    }
  }, [schoolId, supabase]);

  const handleConfirmBooking = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('room_bookings')
        .update({ status: 'approved' })
        .eq('id', id);

      if (error) throw error;

      setPendingBookings(prev => prev.filter(b => b.id !== id));
      window.dispatchEvent(new CustomEvent('refresh-bookings'));
      alert('Raumbuchung erfolgreich bestätigt.');
    } catch (err: any) {
      alert('Fehler beim Bestätigen: ' + err.message);
    }
  }, [supabase]);

  const handleRejectBooking = useCallback(async (id: string) => {
    if (!window.confirm('Möchtest du diese vorläufige Raumbuchung wirklich ablehnen und löschen?')) return;
    try {
      const { error } = await supabase
        .from('room_bookings')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setPendingBookings(prev => prev.filter(b => b.id !== id));
      window.dispatchEvent(new CustomEvent('refresh-bookings'));
      alert('Raumbuchung abgelehnt und gelöscht.');
    } catch (err: any) {
      alert('Fehler beim Ablehnen: ' + err.message);
    }
  }, [supabase]);

  // ---------------------------------------------------------------------------
  // Logbook Room Bookings Fetch & Handlers
  // ---------------------------------------------------------------------------
  const fetchLogbookBookings = useCallback(async () => {
    if (!schoolId) return;
    try {
      const { data, error } = await supabase
        .from('room_bookings')
        .select(`
          id,
          room_id,
          date,
          start_time,
          end_time,
          title,
          booked_by,
          status,
          rooms:room_id (
            id,
            name
          ),
          profiles:booked_by (
            first_name,
            last_name,
            role
          )
        `)
        .eq('school_id', schoolId)
        .order('date', { ascending: false })
        .order('start_time', { ascending: false });

      if (error) throw error;
      setLogbookBookings(data || []);
    } catch (err) {
      console.error('[useSecretaryBookings] Error fetching logbook bookings:', err);
    }
  }, [schoolId, supabase]);

  const handleUpdateLogbookBooking = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('room_bookings')
        .update({
          date: editBookingDate,
          start_time: editBookingStartTime.length === 5 ? `${editBookingStartTime}:00` : editBookingStartTime,
          end_time: editBookingEndTime.length === 5 ? `${editBookingEndTime}:00` : editBookingEndTime,
          title: editBookingTitle,
          room_id: editBookingRoomId
        })
        .eq('id', id);

      if (error) throw error;

      alert('Raumbuchung erfolgreich aktualisiert.');
      setEditingLogbookBookingId(null);
      fetchLogbookBookings();
      fetchPendingBookings();
      window.dispatchEvent(new CustomEvent('refresh-bookings'));
    } catch (err: any) {
      alert('Fehler beim Aktualisieren: ' + err.message);
    }
  }, [editBookingDate, editBookingStartTime, editBookingEndTime, editBookingTitle, editBookingRoomId, supabase, fetchLogbookBookings, fetchPendingBookings]);

  const handleDeleteLogbookBooking = useCallback(async (id: string) => {
    if (!window.confirm('Möchtest du diese Raumbuchung wirklich löschen?')) return;
    try {
      const { error } = await supabase
        .from('room_bookings')
        .delete()
        .eq('id', id);

      if (error) throw error;

      alert('Raumbuchung erfolgreich gelöscht.');
      fetchLogbookBookings();
      fetchPendingBookings();
      window.dispatchEvent(new CustomEvent('refresh-bookings'));
    } catch (err: any) {
      alert('Fehler beim Löschen: ' + err.message);
    }
  }, [supabase, fetchLogbookBookings, fetchPendingBookings]);

  const handleConfirmLogbookBooking = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('room_bookings')
        .update({ status: 'approved' })
        .eq('id', id);

      if (error) throw error;

      alert('Raumbuchung erfolgreich bestätigt.');
      fetchLogbookBookings();
      fetchPendingBookings();
      window.dispatchEvent(new CustomEvent('refresh-bookings'));
    } catch (err: any) {
      alert('Fehler beim Bestätigen: ' + err.message);
    }
  }, [supabase, fetchLogbookBookings, fetchPendingBookings]);

  // ---------------------------------------------------------------------------
  // Real-time Subscriptions & Cross-Tab Event Listeners
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!schoolId) return;
    fetchRoomIssues();

    const unsubscribe = notesService.onSync(fetchRoomIssues);
    const unsubscribeRealtime = notesService.subscribeSchoolRealtime(schoolId, fetchRoomIssues);

    return () => {
      unsubscribe();
      unsubscribeRealtime();
    };
  }, [schoolId, fetchRoomIssues]);

  useEffect(() => {
    const handleRefresh = () => {
      fetchPendingBookings();
      fetchLogbookBookings();
    };
    window.addEventListener('refresh-bookings', handleRefresh);
    return () => {
      window.removeEventListener('refresh-bookings', handleRefresh);
    };
  }, [fetchPendingBookings, fetchLogbookBookings]);

  return {
    // Pending bookings
    pendingBookings,
    setPendingBookings,
    fetchPendingBookings,
    handleConfirmBooking,
    handleRejectBooking,

    // Logbook bookings
    logbookBookings,
    setLogbookBookings,
    editingLogbookBookingId,
    setEditingLogbookBookingId,
    editBookingDate,
    setEditBookingDate,
    editBookingStartTime,
    setEditBookingStartTime,
    editBookingEndTime,
    setEditBookingEndTime,
    editBookingTitle,
    setEditBookingTitle,
    editBookingRoomId,
    setEditBookingRoomId,
    fetchLogbookBookings,
    handleUpdateLogbookBooking,
    handleDeleteLogbookBooking,
    handleConfirmLogbookBooking,

    // Facility issues
    roomIssues,
    setRoomIssues,
    fetchRoomIssues,
    handleResolveRoomIssue,
    handleReopenRoomIssue,

    // Modals
    showLogbookModal,
    setShowLogbookModal,
    showFacilityLogModal,
    setShowFacilityLogModal
  };
}
