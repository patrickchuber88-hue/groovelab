import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('apps/groovelab/.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function run() {
  console.log("--- querying room_bookings for 2026-06-11 ---");
  const { data: rb, error: rbe } = await supabase
    .from('room_bookings')
    .select('*, profiles:users!booked_by(*)')
    .eq('date', '2026-06-11');
  console.log("room_bookings error:", rbe);
  console.log("room_bookings:", JSON.stringify(rb, null, 2));

  console.log("\n--- querying schedule_occurrences for 2026-06-11 ---");
  const { data: so, error: soe } = await supabase
    .from('schedule_occurrences')
    .select('*, schedules(*), student:users!schedule_occurrences_student_id_fkey(*)')
    .eq('date', '2026-06-11');
  console.log("schedule_occurrences error:", soe);
  console.log("schedule_occurrences:", JSON.stringify(so, null, 2));
}

run();
