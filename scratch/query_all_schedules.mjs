import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('../apps/groovelab/.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(url, serviceKey);

async function run() {
  const teacherId = '03564b1c-e2bb-4ccb-be95-b9fd1ef34829';
  const { data: schedules, error } = await supabase
    .from('schedules')
    .select('*, student:student_id(*)')
    .eq('teacher_id', teacherId);
  if (error) console.error(error);
  else console.log("Schedules found:", schedules.length, schedules.map(s => ({ id: s.id, day: s.day_of_week, time: s.time_slot, student: s.student ? `${s.student.first_name} ${s.student.last_name}` : null })));
}

run();
