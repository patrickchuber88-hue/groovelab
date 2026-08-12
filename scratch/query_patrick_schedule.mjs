import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('../apps/groovelab/.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

// Use service key if we want to bypass RLS, or anon key with headers
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(url, serviceKey);

async function run() {
  // Find Patrick Huber
  const { data: users, error: userErr } = await supabase
    .from('users')
    .select('*')
    .eq('first_name', 'Patrick')
    .eq('last_name', 'Huber');
    
  if (userErr) {
    console.error("User error:", userErr);
    return;
  }
  
  console.log("Found users:", users);
  
  if (users.length === 0) return;
  const patrick = users[0];
  
  // Find occurrences for Patrick Huber between 2026-06-22 and 2026-07-05
  const { data: occs, error: occErr } = await supabase
    .from('schedule_occurrences')
    .select('*, student:student_id(*), schedules(*)')
    .eq('teacher_id', patrick.id)
    .gte('date', '2026-06-22')
    .lte('date', '2026-07-05')
    .order('date', { ascending: true })
    .order('start_time', { ascending: true });
    
  if (occErr) {
    console.error("Occurrences error:", occErr);
    return;
  }
  
  console.log("Found occurrences:", occs.map(o => ({
    id: o.id,
    student_id: o.student_id,
    student_name: `${o.student?.first_name} ${o.student?.last_name}`,
    date: o.date,
    start_time: o.start_time,
    duration: o.duration,
    status: o.status,
    original_date: o.original_date,
    room_id: o.schedules?.room_id,
    room_name: o.schedules?.room_name
  })));
}

run();
