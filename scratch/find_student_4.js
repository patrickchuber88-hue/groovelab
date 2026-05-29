import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('apps/groovelab/.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function run() {
  const { data: users, error } = await supabase
    .from('users')
    .select('id, first_name, last_name, role')
    .eq('role', 'student');
  console.log("Students:", users);
  
  const { data: schedules, error: err2 } = await supabase
    .from('schedules')
    .select('*, student:users!schedules_student_id_fkey(*)');
  console.log("Schedules with students:", schedules.map(s => ({
    id: s.id,
    student_name: s.student ? `${s.student.first_name} ${s.student.last_name}` : 'null',
    day_of_week: s.day_of_week,
    time_slot: s.time_slot
  })));
}

run();
