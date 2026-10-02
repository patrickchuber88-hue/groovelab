/**
 * Room Booking Regular Window Helper (CAM-59 / CAM-27)
 * 
 * Determines whether a given booking or lesson slot falls completely inside
 * the teacher's regular recurring schedule window in that specific room.
 * 
 * Business Rule:
 * If a lesson takes place during regular teaching hours in the teacher's regular room,
 * NO automatic room booking is triggered or displayed under "Meine Buchungen",
 * because the regular schedule block already reserves the room.
 */

export const isInsideRegularWindow = (
  teacherId: string,
  roomId: string,
  dateStr: string,
  startTimeStr: string,
  endTimeStr: string,
  schedules: any[]
): boolean => {
  if (!schedules || schedules.length === 0 || !dateStr || !startTimeStr || !endTimeStr || !teacherId || !roomId) {
    return false;
  }

  // Parse YYYY-MM-DD (handle potential ISO strings)
  const cleanDate = dateStr.split('T')[0];
  const parts = cleanDate.split('-');
  if (parts.length !== 3) return false;
  const d = new Date(Date.UTC(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10)));
  const dow = d.getUTCDay() === 0 ? 7 : d.getUTCDay(); // 1 = Monday, ..., 7 = Sunday

  const [bsh, bsm] = startTimeStr.substring(0, 5).split(':').map((v) => parseInt(v, 10) || 0);
  const [beh, bem] = endTimeStr.substring(0, 5).split(':').map((v) => parseInt(v, 10) || 0);
  const bStartMin = bsh * 60 + bsm;
  const bEndMin = beh * 60 + bem;

  // Filter regular schedule slots for this teacher in this room on this weekday
  const matchingSchedules = schedules.filter((s: any) => {
    if (s.teacher_id !== teacherId && s.teacherId !== teacherId) return false;
    const sRoomId = s.room_id || s.roomId;
    if (String(sRoomId) !== String(roomId)) return false;

    const rawDow = s.day_of_week ?? s.dayOfWeek;
    const sDow = typeof rawDow === 'number'
      ? rawDow
      : (rawDow === 'Monday' || rawDow === 'Montag' ? 1 :
         rawDow === 'Tuesday' || rawDow === 'Dienstag' ? 2 :
         rawDow === 'Wednesday' || rawDow === 'Mittwoch' ? 3 :
         rawDow === 'Thursday' || rawDow === 'Donnerstag' ? 4 :
         rawDow === 'Friday' || rawDow === 'Freitag' ? 5 :
         rawDow === 'Saturday' || rawDow === 'Samstag' ? 6 :
         rawDow === 'Sunday' || rawDow === 'Sonntag' ? 7 : (parseInt(rawDow, 10) || 0));
    return sDow === dow;
  });

  if (matchingSchedules.length === 0) return false;

  let regMin = Infinity;
  let regMax = -Infinity;

  matchingSchedules.forEach((s: any) => {
    const tStr = s.time_slot || s.start_time || s.startTime || '00:00';
    const [sh, sm] = tStr.substring(0, 5).split(':').map((v: string) => parseInt(v, 10) || 0);
    const startMin = sh * 60 + sm;
    const duration = s.duration || s.duration_minutes || s.durationMinutes || 45;
    const endMin = startMin + duration;
    if (startMin < regMin) regMin = startMin;
    if (endMin > regMax) regMax = endMin;
  });

  return regMin !== Infinity && bStartMin >= regMin && bEndMin <= regMax;
};

export const isLessonBooking = (b: any): boolean => {
  if (!b) return false;
  if (b.isSchedule) return true;
  const title = (b.title || b.purpose || '').trim();
  return title.startsWith('Unterricht') || title.startsWith('Unterricht:');
};

export const purgeSpuriousLessonBookings = async (
  supabase: any,
  teacherId: string,
  bookings: any[],
  schedules: any[]
): Promise<string[]> => {
  if (!supabase || !teacherId || !bookings || bookings.length === 0 || !schedules || schedules.length === 0) {
    return [];
  }

  try {
    const spurious = bookings.filter((b: any) => {
      const bTeacherId = b.teacherId || b.booked_by;
      if (bTeacherId !== teacherId) return false;
      if (!isLessonBooking(b)) return false;

      const roomId = b.roomId || b.room_id;
      const startTime = (b.startTime || b.start_time || '').substring(0, 5);
      const endTime = (b.endTime || b.end_time || '').substring(0, 5);
      return isInsideRegularWindow(teacherId, roomId, b.date, startTime, endTime, schedules);
    });

    if (spurious.length === 0) return [];

    const spuriousIds = Array.from(new Set(spurious.map((b: any) => b.id).filter(Boolean)));
    if (spuriousIds.length > 0) {
      const { error } = await supabase.from('room_bookings').delete().in('id', spuriousIds);
      if (!error && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('refresh-bookings'));
      }
      return spuriousIds;
    }
  } catch (err) {
    console.warn('[roomBookingHelpers] Error in purgeSpuriousLessonBookings:', err);
  }

  return [];
};
