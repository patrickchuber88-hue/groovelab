import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/apps/groovelab/.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key, {
  global: { headers: { 'x-user-id': '03564b1c-e2bb-4ccb-be95-b9fd1ef34829' } }
});

function parseLocalDate(dateStr) {
  if (!dateStr) return new Date();
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return new Date(Date.UTC(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])));
  }
  return new Date(dateStr);
}

function getWeekdayIndex(dateStr) {
  const dateObj = parseLocalDate(dateStr);
  const day = dateObj.getUTCDay();
  return day === 0 ? 6 : day - 1;
}

function toBerlinYYYYMMDD(dateObj) {
  const y = dateObj.getUTCFullYear();
  const m = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

async function test() {
  const selectedRoomId = 'bf7d1660-fb03-48a7-a51e-9a6e6a1c48c9'; // Room 4
  const bookingDate = '2026-06-11'; // Thursday of the week
  const dayIdx = 4; // Friday
  const hourStr = '16:00';

  // 1. Fetch from Supabase
  const startDateStr = '2026-06-08';
  const endDateStr = '2026-06-14';
  
  const { data: dbBookingsData } = await supabase
    .from('room_bookings')
    .select('*, room:rooms(name)')
    .eq('school_id', '74713df2-6176-4a41-a8cd-9fbebe34e9b8')
    .gte('date', startDateStr)
    .lte('date', endDateStr);

  const { data: occursData } = await supabase
    .from('schedule_occurrences')
    .select('*, student:users!schedule_occurrences_student_id_fkey(*), teacher:users!schedule_occurrences_teacher_id_fkey(*), schedules!schedule_occurrences_schedule_id_fkey(*)')
    .eq('date', '2026-06-12');

  const { data: schedulesData } = await supabase
    .from('schedules')
    .select('*')
    .eq('room_id', selectedRoomId);

  // 2. Map data
  const dbRoomBookings = (dbBookingsData || []).map((db) => {
    const startTimeStr = db.start_time ? db.start_time.substring(0, 5) : '00:00';
    const endTimeStr = db.end_time ? db.end_time.substring(0, 5) : '00:00';
    return {
      id: db.id,
      roomId: db.room_id,
      date: db.date,
      startTime: startTimeStr,
      endTime: endTimeStr,
      purpose: db.title || 'Unterricht',
      teacherId: db.booked_by,
      isDbBooking: true
    };
  });

  let scheduleOccurrences = occursData || [];
  if (dbBookingsData && occursData) {
    scheduleOccurrences = occursData.map((occ) => {
      const booking = dbBookingsData.find(b => 
        b.date === occ.date && 
        b.start_time.substring(0, 5) === occ.start_time.substring(0, 5) &&
        b.booked_by === occ.teacher_id
      );
      if (booking) {
        return {
          ...occ,
          schedules: occ.schedules ? { ...occ.schedules, room_id: booking.room_id } : { room_id: booking.room_id }
        };
      }
      return occ;
    });
  }

  console.log("Mapped scheduleOccurrences count:", scheduleOccurrences.length);
  console.log("Mapped scheduleOccurrences schedules room_id:", scheduleOccurrences.map(o => o.schedules?.room_id));
  console.log("Selected Room ID:", selectedRoomId);

  // Now run getBookingsForSlot logic
  const mondayOfSelectedWeek = parseLocalDate(bookingDate);
  const dayOfWeek = mondayOfSelectedWeek.getUTCDay();
  const diffToMon = mondayOfSelectedWeek.getUTCDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1);
  mondayOfSelectedWeek.setUTCDate(diffToMon);

  const targetDate = new Date(mondayOfSelectedWeek);
  targetDate.setUTCDate(mondayOfSelectedWeek.getUTCDate() + dayIdx);
  const targetDateStr = toBerlinYYYYMMDD(targetDate);
  console.log("Target Date String:", targetDateStr);

  const targetReschedDate = new Date(mondayOfSelectedWeek);
  targetReschedDate.setDate(mondayOfSelectedWeek.getDate() + dayIdx);
  const targetReschedDateStr = `${targetReschedDate.getFullYear()}-${String(targetReschedDate.getMonth() + 1).padStart(2, '0')}-${String(targetReschedDate.getDate()).padStart(2, '0')}`;
  console.log("Target Resched Date String:", targetReschedDateStr);

  // Filter dynamicForSlot
  const dynamicForSlot = scheduleOccurrences.filter((occ) => {
    const roomId = occ.schedules?.room_id || null;
    console.log("Occ debug info:", {
      id: occ.id,
      roomId,
      occDate: occ.date,
      status: occ.status
    });
    if (roomId !== selectedRoomId) return false;
    if (occ.date !== targetReschedDateStr) return false;

    if (occ.status === 'cancelled' || occ.status === 'teacher_sick' || occ.status === 'canceled_by_teacher_sick') {
      return false;
    }

    const hasDbBooking = dbRoomBookings.some((b) => 
      b.date === occ.date && 
      b.startTime.substring(0, 5) === occ.start_time.substring(0, 5) &&
      b.teacherId === occ.teacher_id
    );
    console.log("hasDbBooking for occ:", hasDbBooking);
    if (hasDbBooking && !(occ.status === 'pending_reschedule' || occ.status === 'rescheduled_confirmed')) return false;

    const templateTime = occ.schedules?.time_slot || '';
    const templateDay = occ.schedules?.day_of_week || 0;

    const occDate = new Date(occ.date);
    const rawDay = occDate.getDay();
    const actualDayOfWeek = rawDay === 0 ? 7 : rawDay;

    const hasTimeMoved = templateTime && occ.start_time.substring(0, 5) !== templateTime.substring(0, 5);
    const hasDayMoved = templateDay && actualDayOfWeek !== templateDay;
    
    const hasFallbackDateMoved = occ.original_date && occ.date !== occ.original_date;
    const hasFallbackTimeMoved = occ.original_start_time && occ.start_time.substring(0, 5) !== occ.original_start_time.substring(0, 5);

    const hasMoved = occ.schedules 
      ? (hasTimeMoved || hasDayMoved)
      : (hasFallbackDateMoved || hasFallbackTimeMoved);

    console.log("hasMoved for occ:", {
      hasTimeMoved,
      hasDayMoved,
      hasFallbackDateMoved,
      hasFallbackTimeMoved,
      hasMoved
    });

    if (!hasMoved) return false;

    const durationMin = occ.duration || 45;
    const slotHour = parseInt(hourStr.split(':')[0]);
    const slotStartMin = slotHour * 60;
    const slotEndMin = (slotHour + 1) * 60;

    const [shStr, smStr] = occ.start_time.split(':');
    const sh = parseInt(shStr) || 0;
    const sm = parseInt(smStr) || 0;
    const occStartMin = sh * 60 + sm;
    const occEndMin = occStartMin + durationMin;

    console.log("Overlap checks:", {
      occStartMin,
      occEndMin,
      slotStartMin,
      slotEndMin,
      overlaps: occStartMin < slotEndMin && occEndMin > slotStartMin
    });

    return occStartMin < slotEndMin && occEndMin > slotStartMin;
  });

  console.log("Final dynamicForSlot:", dynamicForSlot);
}

test();
