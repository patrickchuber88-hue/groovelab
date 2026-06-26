import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('../apps/groovelab/.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3ODA0MTc4MTUsImV4cCI6NDkzNDAxNzgxNX0.XZd32Y-4LqKhZjiz1l-Ap6TsUk07_SEUA1QN2ot-qys';

const supabase = createClient(url, serviceKey);

async function run() {
  const teacherId = '03564b1c-e2bb-4ccb-be95-b9fd1ef34829';
  const targetDate = '2026-06-26';
  
  console.log(`=== Querying schedules (recurring) for Friday (day_of_week = 5) ===`);
  const { data: schedules, error: schErr } = await supabase
    .from('schedules')
    .select('*, student:student_id(*)')
    .eq('teacher_id', teacherId)
    .eq('day_of_week', 5);
    
  if (schErr) console.error(schErr);
  else console.log(schedules.map(s => ({
    id: s.id,
    time_slot: s.time_slot,
    student_name: `${s.student?.first_name} ${s.student?.last_name}`,
    status: s.status
  })));

  console.log(`=== Querying schedule_occurrences for ${targetDate} ===`);
  const { data: occurrences, error: occErr } = await supabase
    .from('schedule_occurrences')
    .select('*, student:student_id(*)')
    .eq('teacher_id', teacherId)
    .eq('date', targetDate);
    
  if (occErr) console.error(occErr);
  else console.log(occurrences.map(o => ({
    id: o.id,
    schedule_id: o.schedule_id,
    start_time: o.start_time,
    student_name: `${o.student?.first_name} ${o.student?.last_name}`,
    status: o.status,
    student_acknowledged: o.student_acknowledged,
    original_date: o.original_date
  })));
}

run();
