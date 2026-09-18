import { useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';

export interface UseAdminCampusRoomsParams {
  admin: any;
  rooms: any[];
  setRooms: React.Dispatch<React.SetStateAction<any[]>>;
  stations: any[];
  setStations: React.Dispatch<React.SetStateAction<any[]>>;
  fetchData: (force?: boolean) => void;
}

export function useAdminCampusRooms({
  admin,
  rooms,
  setRooms,
  stations,
  setStations,
  fetchData
}: UseAdminCampusRoomsParams) {
  const [campusBookings, setCampusBookings] = useState<any[]>([]);
  const [dbRoomBookings, setDbRoomBookings] = useState<any[]>([]);
  const [scheduleOccurrences, setScheduleOccurrences] = useState<any[]>([]);
  const [holidays, setHolidays] = useState<any[]>([]);
  const [roomSearchQuery, setRoomSearchQuery] = useState('');
  const [selectedCampusRoomId, setSelectedCampusRoomId] = useState<string>('');
  const [selectedFloor, setSelectedFloor] = useState<string>('all');
  const [selectedEquipmentFilter, setSelectedEquipmentFilter] = useState('ALL');
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
    executeBatchAddStations
  };
}
