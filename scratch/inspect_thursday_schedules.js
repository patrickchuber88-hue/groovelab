import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('apps/groovelab/.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function check() {
  // 1. Get all rooms
  const { data: rooms } = await supabase.from('rooms').select('id, name');
  console.log("=== ROOMS ===");
  console.log(rooms);

  const raum1 = rooms.find(r => r.name === 'Raum 1');
  const raum1Id = raum1 ? raum1.id : null;
  console.log("Raum 1 ID:", raum1Id);

  // 2. Fetch schedules for Thursday (day 4)
  const { data: schedules } = await supabase
    .from('schedules')
    .select('id, room_id, day_of_week, time_slot, duration, purpose')
    .eq('day_of_week', 4);
  
  console.log("\n=== SCHEDULES FOR THURSDAY (day_of_week = 4) ===");
  console.log(schedules);

  // 3. Fetch schedule_occurrences for 2026-06-11
  const { data: occurrences } = await supabase
    .from('schedule_occurrences')
    .select('id, schedule_id, date, start_time, duration, status')
    .eq('date', '2026-06-11');
  
  console.log("\n=== OCCURRENCES FOR 2026-06-11 ===");
  console.log(occurrences);

  // 4. Fetch room_bookings for 2026-06-11
  const { data: roomBookings } = await supabase
    .from('room_bookings')
    .select('*')
    .eq('date', '2026-06-11');

  console.log("\n=== ROOM BOOKINGS FOR 2026-06-11 ===");
  console.log(roomBookings);

  // 5. Fetch campus_events for 2026-06-11
  const { data: campusEvents } = await supabase
    .from('campus_events')
    .select('*')
    .eq('event_date', '2026-06-11');

  console.log("\n=== CAMPUS EVENTS FOR 2026-06-11 ===");
  console.log(campusEvents);
}

check();
