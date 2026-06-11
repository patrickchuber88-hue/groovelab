import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('apps/groovelab/.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function check() {
  console.log("--- Querying room_bookings for 2026-06-12 ---");
  const { data: rb, error: rbe } = await supabase
    .from('room_bookings')
    .select('*, profiles:users!booked_by(*)')
    .eq('date', '2026-06-12');
  console.log("room_bookings:", JSON.stringify(rb, null, 2));
  console.log("room_bookings error:", rbe);

  console.log("--- Querying schedule_occurrences for 2026-06-12 ---");
  const { data: occ, error: occe } = await supabase
    .from('schedule_occurrences')
    .select('*, student:users!schedule_occurrences_student_id_fkey(*), teacher:users!schedule_occurrences_teacher_id_fkey(*), schedules!schedule_occurrences_schedule_id_fkey(*)')
    .eq('date', '2026-06-12');
  console.log("schedule_occurrences:", JSON.stringify(occ, null, 2));
  console.log("schedule_occurrences error:", occe);
}

check();
