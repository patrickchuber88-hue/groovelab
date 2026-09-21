import { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';

export interface UseAdminCampusRoomsParams {
  admin: any;
  rooms: any[];
  setRooms: React.Dispatch<React.SetStateAction<any[]>>;
  stations: any[];
  setStations: React.Dispatch<React.SetStateAction<any[]>>;
  fetchData: (force?: boolean) => void;
  teachers?: any[];
}

export function useAdminCampusRooms({
  admin,
  rooms,
  setRooms,
  stations,
  setStations,
  fetchData,
  teachers = []
}: UseAdminCampusRoomsParams) {
  const [campusBookings, setCampusBookings] = useState<any[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const sId = admin?.school_id;
      const key = sId ? `groovelab_campus_bookings_${sId}` : 'groovelab_campus_bookings';
      const stored = localStorage.getItem(key) || localStorage.getItem('groovelab_campus_bookings');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [dbRoomBookings, setDbRoomBookings] = useState<any[]>([]);
  const [scheduleOccurrences, setScheduleOccurrences] = useState<any[]>([]);
  const [holidays, setHolidays] = useState<any[]>([]);

  const fetchDbRoomBookings = useCallback(async () => {
    const schoolId = admin?.school_id || (rooms.length > 0 ? rooms[0].school_id : null);
    if (!schoolId) return;

    try {
      const { data, error } = await supabase
        .from('room_bookings')
        .select(`
          id,
          school_id,
          room_id,
          booked_by,
          date,
          start_time,
          end_time,
          title,
          status,
          rooms (
            id,
            name
          )
        `)
        .eq('school_id', schoolId);

      if (error) throw error;

      const mapped = (data || []).map((row: any) => {
        const startTime = row.start_time ? row.start_time.substring(0, 5) : '00:00';
        const endTime = row.end_time ? row.end_time.substring(0, 5) : '00:00';
        const purpose = row.title || 'Raumbuchung';
        const teacher = (teachers || []).find((t: any) => t.id === row.booked_by) || (admin && admin.id === row.booked_by ? admin : null);
        const teacherName = teacher ? `${teacher.first_name || ''} ${teacher.last_name || ''}`.trim() : 'Lehrer';

        return {
          id: row.id,
          roomId: row.room_id,
          roomName: row.rooms?.name || 'Raum',
          date: row.date,
          startTime,
          endTime,
          purpose,
          title: purpose,
          teacherId: row.booked_by,
          teacherName: teacherName || 'Lehrer',
          status: row.status || 'approved',
          isApproved: row.status === 'approved',
          isSchedule: false
        };
      });

      setDbRoomBookings(mapped);
    } catch (err) {
      console.error('[useAdminCampusRooms] Error fetching dbRoomBookings:', err);
    }
  }, [admin, rooms, teachers]);

  const fetchScheduleOccurrences = useCallback(async () => {
    const schoolId = admin?.school_id || (rooms.length > 0 ? rooms[0].school_id : null);
    if (!schoolId) return;

    try {
      const { data, error } = await supabase
        .from('schedule_occurrences')
        .select(`
          id,
          student_id,
          teacher_id,
          date,
          start_time,
          duration,
          status,
          notes,
          schedule_id
        `)
        .eq('school_id', schoolId);

      if (error) throw error;
      setScheduleOccurrences(data || []);
    } catch (err) {
      console.error('[useAdminCampusRooms] Error fetching scheduleOccurrences:', err);
    }
  }, [admin?.school_id, rooms]);

  const reloadCampusBookingsFromStorage = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      const sId = admin?.school_id || (rooms.length > 0 ? rooms[0].school_id : null);
      const stored = (sId ? localStorage.getItem(`groovelab_campus_bookings_${sId}`) : null) || localStorage.getItem('groovelab_campus_bookings');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setCampusBookings(parsed);
        }
      }
    } catch (e) {
      console.error('[useAdminCampusRooms] Error parsing stored campus bookings:', e);
    }
  }, [admin?.school_id, rooms]);

  useEffect(() => {
    fetchDbRoomBookings();
    fetchScheduleOccurrences();
    reloadCampusBookingsFromStorage();

    const handleRefresh = () => {
      fetchDbRoomBookings();
      fetchScheduleOccurrences();
      reloadCampusBookingsFromStorage();
    };

    window.addEventListener('refresh-bookings', handleRefresh);

    const schoolId = admin?.school_id || (rooms.length > 0 ? rooms[0].school_id : null);
    let channel: any = null;
    if (schoolId) {
      channel = supabase
        .channel(`room_bookings_campus_rooms_${schoolId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'room_bookings', filter: `school_id=eq.${schoolId}` },
          () => {
            fetchDbRoomBookings();
          }
        )
        .subscribe();
    }

    return () => {
      window.removeEventListener('refresh-bookings', handleRefresh);
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [fetchDbRoomBookings, fetchScheduleOccurrences, reloadCampusBookingsFromStorage, admin?.school_id, rooms]);
  const [roomSearchQuery, setRoomSearchQuery] = useState('');
  const [selectedCampusRoomId, setSelectedCampusRoomId] = useState<string>('');
  const [selectedFloor, setSelectedFloor] = useState<string>('Alle');
  const [selectedEquipmentFilter, setSelectedEquipmentFilter] = useState('Alle');
  const [showOnlyFreeNow, setShowOnlyFreeNow] = useState(false);
  const [showMyBookingsOnly, setShowMyBookingsOnly] = useState(false);
  const [isDateFilterActive, setIsDateFilterActive] = useState(false);
  const [bookingDate, setBookingDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [bookingStartTime, setBookingStartTime] = useState('14:00');
  const [bookingEndTime, setBookingEndTime] = useState('15:00');
  const [bookingPurpose, setBookingPurpose] = useState('');
  const [bookingType, setBookingType] = useState('lesson');
  const [bookingStudentId, setBookingStudentId] = useState<string>('');
  const [bookingTargetType, setBookingTargetType] = useState<'student' | 'external'>('student');
  const [externalBookingPartnerName, setExternalBookingPartnerName] = useState('');
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringInterval, setRecurringInterval] = useState<number>(1);
  const [showPreviewField, setShowPreviewField] = useState(false);
  const [showMobileRoomSlider, setShowMobileRoomSlider] = useState(false);
  const [mobileSelectedDayIdx, setMobileSelectedDayIdx] = useState(0);
  const [favoriteRoomId, setFavoriteRoomId] = useState<string | null>(null);
  const [dragOverCell, setDragOverCell] = useState<{ roomId: string; time: string } | null>(null);
  const [showRoomFinderBar, setShowRoomFinderBar] = useState(false);
  const [finderStartTime, setFinderStartTime] = useState('14:00');
  const [finderEndTime, setFinderEndTime] = useState('15:00');
  const [roomBlockedSlots, setRoomBlockedSlots] = useState<any[]>([]);
  const calendarScrollRef = useRef<HTMLDivElement | null>(null);
  const [hoveredInstrumentIdx, setHoveredInstrumentIdx] = useState<number | null>(null);
  const [draftBooking, setDraftBooking] = useState<any | null>(null);
  const [finderResultCount, setFinderResultCount] = useState<number | null>(null);
  const [isRoomSearchDropdownOpen, setIsRoomSearchDropdownOpen] = useState(false);
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [successAnimationRoomId, setSuccessAnimationRoomId] = useState<string | null>(null);

  // Groovelab Rooms specific
  const [customizingRoom, setCustomizingRoom] = useState<any | null>(null);
  const [showBatchiPadModal, setShowBatchiPadModal] = useState<{ roomId: string } | null>(null);
  const [batchiPadCount, setBatchiPadCount] = useState('5');
  const [draggedRoomId, setDraggedRoomId] = useState<string | null>(null);
  const [dragOverRoomId, setDragOverRoomId] = useState<string | null>(null);
  const draggedRoomIdRef = useRef<string | null>(null);

  const handleRoomDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
    setDraggedRoomId(id);
    draggedRoomIdRef.current = id;
  };

  const handleRoomDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleRoomDragEnter = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (draggedRoomIdRef.current && draggedRoomIdRef.current !== id) {
      setDragOverRoomId(id);
    }
  };

  const handleRoomDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleRoomDrop = async (e: React.DragEvent, targetRoomId: string) => {
    e.preventDefault();
    const sourceId = draggedRoomIdRef.current || e.dataTransfer.getData('text/plain');
    if (!sourceId || sourceId === targetRoomId) {
      setDraggedRoomId(null);
      draggedRoomIdRef.current = null;
      setDragOverRoomId(null);
      return;
    }

    const sourceIndex = rooms.findIndex(r => r.id === sourceId);
    const targetIndex = rooms.findIndex(r => r.id === targetRoomId);
    if (sourceIndex === -1 || targetIndex === -1) {
      setDraggedRoomId(null);
      draggedRoomIdRef.current = null;
      setDragOverRoomId(null);
      return;
    }

    const reorderedRooms = [...rooms];
    const [movedRoom] = reorderedRooms.splice(sourceIndex, 1);
    reorderedRooms.splice(targetIndex, 0, movedRoom);

    const updatedRooms = reorderedRooms.map((room, idx) => ({
      ...room,
      sort_order: idx
    }));

    setRooms(updatedRooms);
    setDraggedRoomId(null);
    draggedRoomIdRef.current = null;
    setDragOverRoomId(null);

    try {
      const updatePromises = updatedRooms.map((room, idx) =>
        supabase
          .from('rooms')
          .update({ sort_order: idx })
          .eq('id', room.id)
      );
      await Promise.all(updatePromises);
    } catch (err) {
      console.error('Error persisting room order:', err);
      alert('Fehler beim Speichern der Raumreihenfolge.');
      if (admin?.school_id) {
        const { data: roomsData } = await supabase
          .from('rooms')
          .select('*')
          .eq('school_id', admin.school_id)
          .eq('is_groovelab_active', true)
          .order('sort_order', { ascending: true });
        if (roomsData) setRooms(roomsData);
      }
    }
  };

  const handleRoomDragEnd = () => {
    setDraggedRoomId(null);
    draggedRoomIdRef.current = null;
    setDragOverRoomId(null);
  };

  const handleDeleteRoom = async (roomId: string) => {
    if (!window.confirm('Diesen Raum und alle zugehörigen Stationen wirklich löschen?')) return;
    const { error } = await supabase.from('rooms').delete().eq('id', roomId);
    if (error) alert(error.message);
    else fetchData();
  };

  const handleDeleteStation = async (stationId: string) => {
    if (!window.confirm('Dieses iPad wirklich entfernen?')) return;
    const { error } = await supabase.from('stations').delete().eq('id', stationId);
    if (error) alert(error.message);
    else fetchData();
  };

  const triggerBatchAddStations = (roomId: string) => {
    setShowBatchiPadModal({ roomId });
    setBatchiPadCount('5');
  };

  const executeBatchAddStations = async (roomId: string, count: number) => {
    const roomStations = stations.filter(s => s.room_id === roomId && s.name.startsWith('iPad '));
    let nextNum = 1;
    roomStations.forEach(s => {
      const match = s.name.match(/^iPad\s+(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num >= nextNum) {
          nextNum = num + 1;
        }
      }
    });

    const stationsToInsert = [];
    for (let i = 0; i < count; i++) {
      const currentNum = nextNum + i;
      let color = '#64748b';
      if (currentNum === 1 || currentNum === 2) color = '#ef4444';
      else if (currentNum === 3 || currentNum === 4) color = '#a855f7';
      else if (currentNum === 5 || currentNum === 6) color = '#3b82f6';
      else if (currentNum === 7 || currentNum === 8) color = '#eab308';

      stationsToInsert.push({
        room_id: roomId,
        name: `iPad ${currentNum}`,
        color: color
      });
    }

    const { data, error } = await supabase.from('stations').insert(stationsToInsert).select();
    if (error) {
      alert('Fehler beim Anlegen der iPads: ' + error.message);
    } else if (data) {
      setStations([...stations, ...data]);
      setShowBatchiPadModal(null);
    }
  };

  return {
    campusBookings,
    setCampusBookings,
    dbRoomBookings,
    setDbRoomBookings,
    scheduleOccurrences,
    setScheduleOccurrences,
    holidays,
    setHolidays,
    roomSearchQuery,
    setRoomSearchQuery,
    selectedCampusRoomId,
    setSelectedCampusRoomId,
    selectedFloor,
    setSelectedFloor,
    selectedEquipmentFilter,
    setSelectedEquipmentFilter,
    showOnlyFreeNow,
    setShowOnlyFreeNow,
    showMyBookingsOnly,
    setShowMyBookingsOnly,
    isDateFilterActive,
    setIsDateFilterActive,
    bookingDate,
    setBookingDate,
    bookingStartTime,
    setBookingStartTime,
    bookingEndTime,
    setBookingEndTime,
    bookingPurpose,
    setBookingPurpose,
    bookingType,
    setBookingType,
    bookingStudentId,
    setBookingStudentId,
    bookingTargetType,
    setBookingTargetType,
    externalBookingPartnerName,
    setExternalBookingPartnerName,
    selectedBooking,
    setSelectedBooking,
    isRecurring,
    setIsRecurring,
    recurringInterval,
    setRecurringInterval,
    showPreviewField,
    setShowPreviewField,
    showMobileRoomSlider,
    setShowMobileRoomSlider,
    mobileSelectedDayIdx,
    setMobileSelectedDayIdx,
    favoriteRoomId,
    setFavoriteRoomId,
    dragOverCell,
    setDragOverCell,
    showRoomFinderBar,
    setShowRoomFinderBar,
    finderStartTime,
    setFinderStartTime,
    finderEndTime,
    setFinderEndTime,
    roomBlockedSlots,
    setRoomBlockedSlots,
    calendarScrollRef,
    hoveredInstrumentIdx,
    setHoveredInstrumentIdx,
    draftBooking,
    setDraftBooking,
    finderResultCount,
    setFinderResultCount,
    isRoomSearchDropdownOpen,
    setIsRoomSearchDropdownOpen,
    studentSearchTerm,
    setStudentSearchTerm,
    successAnimationRoomId,
    setSuccessAnimationRoomId,
    customizingRoom,
    setCustomizingRoom,
    showBatchiPadModal,
    setShowBatchiPadModal,
    batchiPadCount,
    setBatchiPadCount,
    draggedRoomId,
    dragOverRoomId,
    handleRoomDragStart,
    handleRoomDragOver,
    handleRoomDragEnter,
    handleRoomDragLeave,
    handleRoomDrop,
    handleRoomDragEnd,
    handleDeleteRoom,
    handleDeleteStation,
    triggerBatchAddStations,
    executeBatchAddStations,
    fetchDbRoomBookings,
    fetchScheduleOccurrences
  };
}
