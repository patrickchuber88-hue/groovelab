import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('../apps/groovelab/.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3ODA0MTc4MTUsImV4cCI6NDkzNDAxNzgxNX0.XZd32Y-4LqKhZjiz1l-Ap6TsUk07_SEUA1QN2ot-qys';

const supabase = createClient(url, serviceKey);

async function run() {
  const { data: schedules, error } = await supabase
    .from('schedules')
    .select('*, teacher:teacher_id(*), student:student_id(*)')
    .eq('day_of_week', 5);
  if (error) console.error(error);
  else console.log("Schedules on Friday:", schedules.length, schedules.map(s => ({
    id: s.id,
    teacher: `${s.teacher?.first_name} ${s.teacher?.last_name}`,
    student: `${s.student?.first_name} ${s.student?.last_name}`,
    time: s.time_slot
  })));
}

run();
